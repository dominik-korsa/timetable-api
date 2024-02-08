import axios, { Axios } from 'axios';
import axiosRetry from 'axios-retry';
import { JSDOM } from 'jsdom';
import { findLinksByKeywords, getEdupageInstanceName, pageIsOptivum } from './utils.js';
import { parse } from '@timetable-api/optivum-scrapper';
import { Client as ASCScrapperClient } from '@timetable-api/asc-scrapper';
import { createHash } from 'crypto';
import { SchoolsTable } from '@timetable-api/common';
import {
    getEdupageInstanceNames,
    getSchoolsWithWebiste,
    pushEdupageInstances,
    pushEdupageTimetableVersions,
    pushOptivumTimetableVersion,
    pushOptivumTimetableVersionUrl,
} from './db.js';
import { SingleBar } from 'cli-progress';

export async function run() {
    const axiosInstance = axios.create();
    axiosRetry(axiosInstance, { retries: 3, retryDelay: (retryCount) => retryCount * 3000 });
    const schools = await getSchoolsWithWebiste();
    await Promise.all(schools.map((school) => checkSchool(school, axiosInstance)));
    const edupageInstanceNames = await getEdupageInstanceNames();
    edupageInstanceNames.map((instanceName) => checkEdupageInstance(instanceName, axiosInstance));
}

async function checkEdupageInstance(edupageInstanceName: string, axiosInstance: Axios) {
    const scrapperClient = new ASCScrapperClient(axiosInstance, edupageInstanceName);
    const versions = await scrapperClient.getAllVersions();
    if (versions.length !== 0) {
        await pushEdupageTimetableVersions(edupageInstanceName, versions);
    }
}

async function checkSchool(school: SchoolsTable & { website_url: string }, axiosInstance: Axios) {
    const line = new SingleBar({ format: '[RSPO_ID: {rspo_id}] {status}', noTTYOutput: true });
    line.start(1, 0, { status: 'Getting timetables...', rspo_id: school.rspo_id });
    let optivumTimetables: string[];
    let edupageInstances: string[];
    try {
        const result = await findTimetables(school.website_url, axiosInstance);
        optivumTimetables = result.optivumTimetables;
        edupageInstances = result.edupageInstances;
    } catch {
        line.update(1, { status: 'An error occurred while getting timetables.' });
        return;
    }
    if (optivumTimetables.length !== 0) {
        line.update(0, { status: 'Parsing optivum timetables and pushing data to database...' });
    }
    await Promise.allSettled(
        optivumTimetables.map(async (timetableUrl) => {
            const parsedTimetable = await parse(timetableUrl, axiosInstance);
            const hash = createHash('sha512').update(JSON.stringify(parsedTimetable.htmls.sort())).digest('hex');
            const timetableVersion = await pushOptivumTimetableVersion(parsedTimetable, school.rspo_id, hash);
            await pushOptivumTimetableVersionUrl(timetableUrl, timetableVersion.unique_id, school.rspo_id);
        }),
    );
    if (edupageInstances.length !== 0) {
        line.update(0, { status: 'Pushing edupage instances to database...' });
        await pushEdupageInstances(school.rspo_id, edupageInstances);
    }
    line.update(0, { status: 'Done!' });
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
    const document = new JSDOM(response.data.replace(/<style(\s|>).*?<\/style>/gi, '')).window.document;
    const links = [...new Set(findLinksByKeywords(document).map((link) => new URL(link, url).toString()))];
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
    if (pageIsOptivum(document)) optivumTimetables.add(url);
    const edupageInstanceName = getEdupageInstanceName(document);
    if (edupageInstanceName !== undefined) edupageInstances.add(edupageInstanceName);
    return { url, optivumTimetables: [...optivumTimetables], edupageInstances: [...edupageInstances] };
}
