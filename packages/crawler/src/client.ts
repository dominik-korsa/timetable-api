import axios, { Axios } from 'axios';
import { JSDOM } from 'jsdom';
import { findLinksByKeywords, pageIsOptivum } from './utils.js';
import { parse } from '@timetable-api/optivum-scrapper';
import { createHash } from 'crypto';
import { SchoolsTable } from '@timetable-api/common';
import { getSchoolsWithWebiste, pushOptivumTimetableVersion, pushOptivumTimetableVersionUrl } from './db.js';

export async function run() {
    const axiosInstance = axios.create();
    const schools = await getSchoolsWithWebiste();
    schools.map(async (school) => checkSchool(school, axiosInstance));
}

async function checkSchool(school: SchoolsTable & {website_url: string}, axiosInstance: Axios) {
    console.log(`[RSPO ID: ${school.rspo_id}] Getting timetables...`);
    const { optivumTimetables } = await findTimetables(school.website_url, axiosInstance);
    if (optivumTimetables.length !== 0) {
        console.log(`[RSPO ID: ${school.rspo_id}] Pushing data to database...`);
    }
    optivumTimetables.map(async (timetableUrl) => {
        const parsedTimetable = await parse(timetableUrl, axiosInstance)
        const hash = createHash('sha512').update(JSON.stringify(parsedTimetable.htmls)).digest('hex');
        const timetableVersion = await pushOptivumTimetableVersion(parsedTimetable, school.rspo_id, hash);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await pushOptivumTimetableVersionUrl(timetableUrl, timetableVersion!.unique_id, school.rspo_id)
    });
    console.log(`[RSPO ID: ${school.rspo_id}] Done!`);
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
    const document = new JSDOM(response.data).window.document;
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
