import axios, { Axios } from 'axios';
import knex from 'knex';
import { JSDOM } from 'jsdom';
import { getPageType, findLinksByKeywords, fixUrl } from './utils.js';
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
    schools.map(async (school) => {
        console.log(`[RSPO ID: ${school.rspo_id}] Getting timetables...`);
        const timetables = await getTimetables(axiosInstance, school.website_url);
        if (timetables.length !== 0) {
            console.log(`[RSPO ID: ${school.rspo_id}] Pushing data to database...`);
        }
        timetables.map(async (timetable) => {
            const hash = createHash('sha512').update(JSON.stringify(timetable.data.htmls)).digest('hex');
            const timetableVersion = await dbClient<OptivumTimetableVersionsTable, { unqiue_id: number }>(
                'optivum_timetable_versions',
            )
                .returning('unique_id')
                .insert({
                    school_rspo_id: school.rspo_id,
                    generated_on: timetable.data.data.generationDate,
                    timetable_data: JSON.stringify(timetable.data.data),
                    discriminant: dbClient.raw(
                        `(SELECT coalesce(max(discriminant), -1) + 1 FROM optivum_timetable_versions WHERE school_rspo_id = ${school.rspo_id} AND generated_on = '${timetable.data.data.generationDate}')`,
                    ),
                    hash,
                })
                .onConflict(['school_rspo_id', 'hash'])
                .merge(['school_rspo_id'])
                .returning('*')
                .first();
            if (timetableVersion === undefined) {
                return;
            }
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
    });
}

async function findTimetables(depthLimit: number, url: string, axiosInstance: Axios, checkedLinks: string[] = []) {
    const timetables: { url: string; type: 'optivum' | 'asctimetables' }[] = [];
    let response;
    try {
        response = await axiosInstance.get<string>(url.replace('www.', ''));
    } catch {
        return;
    }
    checkedLinks.push(url);
    const document = new JSDOM(response.data).window.document;
    const links = [
        ...new Set(findLinksByKeywords(document).map((link) => new URL(link, url.replace('www.', '')).toString())),
    ];
    if (depthLimit > 0) {
        await Promise.all(
            links.map(async (link) => {
                if (checkedLinks.includes(link)) return;
                checkedLinks.push(link);
                const result = await findTimetables(depthLimit - 1, link, axiosInstance, checkedLinks);
                if (result !== undefined) {
                    timetables.push(...result.timetables);
                }
            }),
        );
    }
    const timetableType = getPageType(document);
    if (timetableType !== null) timetables.push({ url, type: timetableType });
    return { url: url.replace('www.', ''), timetables: [...new Set(timetables)] };
}

async function getTimetables(axiosInstance: Axios, websiteUrl: string) {
    const timetablesInfo = await findTimetables(3, fixUrl(websiteUrl), axiosInstance);
    if (timetablesInfo === undefined) {
        return [];
    }
    try {
        const promises = timetablesInfo.timetables
            .filter((timetableInfo) => timetableInfo.type === 'optivum')
            .map(async (timetableInfo) => ({ data: await parse(timetableInfo.url), url: timetableInfo.url }));
        return await Promise.all(promises);
    } catch {
        return [];
    }
}
