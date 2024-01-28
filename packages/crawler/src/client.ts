import axios, { Axios } from 'axios';
import { JSDOM } from 'jsdom';
import { findLinksByKeywords, pageIsOptivum } from './utils.js';
import { parse } from '@timetable-api/optivum-scrapper';
import { createHash } from 'crypto';
import { SchoolsTable } from '@timetable-api/common';
import { getSchoolsWithWebiste, pushOptivumTimetableVersion, pushOptivumTimetableVersionUrl } from './db.js';
import { SingleBar } from 'cli-progress';

export async function run() {
    const axiosInstance = axios.create();
    const schools = await getSchoolsWithWebiste();
    schools.map((school) => checkSchool(school, axiosInstance));
}

async function checkSchool(school: SchoolsTable & { website_url: string }, axiosInstance: Axios) {
    const line = new SingleBar({ format: '[RSPO_ID: {rspo_id}] {status}', noTTYOutput: true });
    line.start(1, 0, { status: 'Getting timetables...', rspo_id: school.rspo_id });
    let optivumTimetables: string[];
    try {
        optivumTimetables = (await findTimetables(school.website_url, axiosInstance)).optivumTimetables;
    } catch {
        return;
    }
    if (optivumTimetables.length !== 0) {
        line.update(0, { status: 'Parsing timetables and pushing data to database...' });
    }
    await Promise.allSettled(
        optivumTimetables.map(async (timetableUrl) => {
            const parsedTimetable = await parse(timetableUrl, axiosInstance);
            const hash = createHash('sha512').update(JSON.stringify(parsedTimetable.htmls.sort())).digest('hex');
            const timetableVersion = await pushOptivumTimetableVersion(parsedTimetable, school.rspo_id, hash);
            await pushOptivumTimetableVersionUrl(timetableUrl, timetableVersion.unique_id, school.rspo_id);
        }),
    );
    line.update(0, { status: 'Done!' });
}

async function findTimetables(
    url: string,
    axiosInstance: Axios,
    depthLimit = 3,
    checkedLinks = new Set<string>(),
) {
    const optivumTimetables = new Set<string>();
    let response;
    url = url.replace('://www.', '://');
    try {
        response = await axiosInstance.get<string>(url);
    } catch {
        return {url, optivumTimetables: []};
    }
    checkedLinks.add(url);
    const document = new JSDOM(response.data.replace(/<style(\s|>).*?<\/style>/gi, '')).window.document;
    const links = [
        ...new Set(findLinksByKeywords(document).map((link) => new URL(link, url).toString())),
    ];
    if (depthLimit > 0) {
        await Promise.all(
            links.map(async (link) => {
                if (checkedLinks.has(link)) return;
                checkedLinks.add(link);
                const result = await findTimetables(link, axiosInstance, depthLimit - 1, checkedLinks);
                result.optivumTimetables.map(ttUrl => optivumTimetables.add(ttUrl));
            }),
        );
    }
    if (pageIsOptivum(document)) optivumTimetables.add(url);
    return { url, optivumTimetables: [...optivumTimetables] };
}
