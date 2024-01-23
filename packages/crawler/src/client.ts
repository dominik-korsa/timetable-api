import axios, { Axios } from 'axios';
import knex from 'knex';
import { JSDOM } from 'jsdom';
import { findLinksByKeywords, pageIsOptivum } from './utils.js';
import { parse } from '@timetable-api/optivum-scrapper';
import { createHash } from 'crypto';
import { SchoolsTable, OptivumTimetableVersionsTable, TimetableUrlsTable } from '@timetable-api/common';
import dotenv from 'dotenv';

dotenv.config();

const dbClient = knex({
    client: 'pg',
    version: '7.2',
    connection: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
    },
    useNullAsDefault: true,
});

export async function run() {
    const axiosInstance = axios.create();
    const schools = await dbClient<SchoolsTable & { website_url: string }>('schools').whereNotNull('website_url');
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
        const timetableVersion = await dbClient<OptivumTimetableVersionsTable, { unqiue_id: number }>(
            'optivum_timetable_versions',
        )
            .returning('unique_id')
            .insert({
                school_rspo_id: school.rspo_id,
                generated_on: parsedTimetable.data.generationDate,
                timetable_data: JSON.stringify(parsedTimetable.data),
                discriminant: dbClient.raw(
                    `(SELECT coalesce(max(discriminant), -1) + 1 FROM optivum_timetable_versions WHERE school_rspo_id = ${school.rspo_id} AND generated_on = '${timetable.data.data.generationDate}')`,
                ),
                hash,
            })
            .onConflict(['school_rspo_id', 'hash'])
            .merge(['school_rspo_id'])
            .returning('*')
            .first();
        await dbClient<TimetableUrlsTable, { id: number }[]>('timetable_urls')
            .returning('id')
            .insert({
                timetable_version_id: timetableVersion.unique_id,
                school_rspo_id: school.rspo_id,
                url: timetable.url,
            })
            .onConflict(['school_rspo_id', 'url', 'timetable_id'])
            .merge(['last_check_at']);
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
