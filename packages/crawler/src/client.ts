import axios, { Axios } from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from "cheerio";
import { findLinksByKeywords, getEdupageInstanceName, pageIsOptivum } from './utils.js';
import { OptivumScrapper, ParseResult } from '@timetable-api/optivum-scrapper';
import { Client as ASCScrapperClient } from '@timetable-api/asc-scrapper';
import { createHash } from 'crypto';
import {
    getEdupageInstanceNames,
    getSchoolWebsites,
    pushEdupageInstances,
    pushEdupageTimetableVersions,
    pushOptivumTimetableVersion,
    pushOptivumTimetableVersionUrl,
} from './db.js';
import { asyncForEachWithLimit, ParalelLimit } from './paralel-limit.js';
import { MultiBar } from 'cli-progress';

const PARALEL_SCHOOL_LIMIT = 20;
const PARALEL_EDUPAGE_LIMIT = 50;

export async function run() {
    const axiosInstance = axios.create();
    axiosRetry(axiosInstance, { retries: 3, retryDelay: (retryCount) => retryCount * 3000 });

    console.log('Downloading school list from database...');
    const schoolWebsites = await getSchoolWebsites();
    const multibar = new MultiBar({
        noTTYOutput: true,
        format: '[{bar}] {percentage}% | ETA: {eta_formatted} | {value}/{total}',
        etaBuffer: 50,
    });
    const schoolsBar = multibar.create(schoolWebsites.length, 0);
    await asyncForEachWithLimit(
        schoolWebsites,
        async (schoolWebsite) => {
            await checkSchoolWebsite(schoolWebsite, axiosInstance, (message: string) => { multibar.log(message) });
            schoolsBar.increment();
        },
        new ParalelLimit(PARALEL_SCHOOL_LIMIT),
    );
    schoolsBar.stop();

    const edupageInstanceNames = await getEdupageInstanceNames();
    await asyncForEachWithLimit(
        edupageInstanceNames,
        (instanceName) => checkEdupageInstance(instanceName, axiosInstance),
        new ParalelLimit(PARALEL_EDUPAGE_LIMIT),
    );
}

async function checkEdupageInstance(edupageInstanceName: string, axiosInstance: Axios) {
    const scrapperClient = new ASCScrapperClient(axiosInstance, edupageInstanceName);
    const versions = await scrapperClient.getAllVersions();
    if (versions.length !== 0) {
        await pushEdupageTimetableVersions(edupageInstanceName, versions);
    }
}

export async function checkUrl(rspo_id: number, url: string, log: (message: string) => void, axiosInstance: Axios) {
    let hash: string;
    let parsedTimetable: ParseResult;
    try {
        const startTime = Date.now();
        const scrapper = new OptivumScrapper(url, axiosInstance);
        parsedTimetable = await scrapper.parse();
        hash = createHash('sha512').update(JSON.stringify(parsedTimetable.htmls.sort())).digest('hex');
        log(`[RSPO ${rspo_id.toString(10)}] Parsing took ${(Date.now() - startTime).toString(10)}ms`);
    } catch {
        log(`[RSPO ${rspo_id.toString(10)}] Failed to parse timetable\n`);
        return;
    }
    try {
        const timetableVersion = await pushOptivumTimetableVersion(parsedTimetable.data, parsedTimetable.generationDate, rspo_id, hash);
        await pushOptivumTimetableVersionUrl(url, timetableVersion.unique_id, rspo_id);
    } catch {
        log(`[RSPO ${rspo_id.toString(10)}] Failed to push timetable version to database\n`);
    }
}


async function checkSchoolWebsite(
    school: { rspo_id: number; website_url: string },
    axiosInstance: Axios,
    log: (message: string) => void
) {
    let optivumTimetables: string[];
    let edupageInstances: string[];
    try {
        const result = await findTimetables(school.website_url, axiosInstance);
        optivumTimetables = result.optivumTimetables;
        edupageInstances = result.edupageInstances;
    } catch {
        log(`[RSPO ${school.rspo_id}] An error occurred while getting timetables\n`);
        return;
    }
    if (optivumTimetables.length !== 0) {
        log(`[RSPO ${school.rspo_id}] Found OPTIVUM timetables ${optivumTimetables.length}, parsing...\n`);
    }
    await Promise.all(
        optivumTimetables.map((url) => checkUrl(school.rspo_id, url, log, axiosInstance)),
    );
    if (edupageInstances.length !== 0) {
        log(`[RSPO ${school.rspo_id}] Found Edupage instances\n`);
        try {
            await pushEdupageInstances(school.rspo_id, edupageInstances);
        } catch {
            log(`[RSPO ${school.rspo_id}] Failed to push Edupage instances to database\n`);
            return;
        }
    }
}

async function findTimetables(
    url: string,
    axiosInstance: Axios,
    depthLimit = 3,
    checkedLinks = new Set<string>(),
): Promise<{ url: string; optivumTimetables: string[]; edupageInstances: string[] }> {
    const optivumTimetables = new Set<string>();
    const edupageInstances = new Set<string>();
    let response;
    url = url.replace('://www.', '://');
    try {
        response = await axiosInstance.get<string>(url);
    } catch {
        return { url, optivumTimetables: [], edupageInstances: [] };
    }
    checkedLinks.add(url);
    const $ = cheerio.load(response.data);
    const links = [...new Set(findLinksByKeywords($).map((link) => new URL(link, url).toString()))];
    if (depthLimit > 0) {
        await Promise.all(
            links.map(async (link) => {
                if (checkedLinks.has(link)) return;
                checkedLinks.add(link);
                const result = await findTimetables(link, axiosInstance, depthLimit - 1, checkedLinks);
                result.optivumTimetables.forEach((ttUrl) => optivumTimetables.add(ttUrl));
                result.edupageInstances.forEach((edupageInstance) => edupageInstances.add(edupageInstance));
            }),
        );
    }
    if (pageIsOptivum($)) optivumTimetables.add(url);
    const edupageInstanceName = getEdupageInstanceName($);
    if (edupageInstanceName !== undefined) edupageInstances.add(edupageInstanceName);
    return { url, optivumTimetables: [...optivumTimetables], edupageInstances: [...edupageInstances] };
}
