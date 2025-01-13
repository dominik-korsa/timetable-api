import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { checkOptivumCandidate, isOptivumCandidate } from './optivum.js';
import { getEdupageInstance } from './edupage.js';
import { areUrlsEqualIgnoringQuery } from './utils.js';
import { pushEdupageInstances } from './db.js';
import { ClientRequest } from 'node:http';

const axiosInstance = axios.create();
axiosRetry(axiosInstance, { retries: 3, retryDelay: (retryCount) => retryCount * 3000 });

interface QueueItem {
    pageUrl: string;
    remainingDepth: number;
}

type CheckPageResult = {
    responseUrl: string;
    isOptivum: true,
} | {
    responseUrl: string;
    isOptivum: false,
    edupageInstance: string | null;
    links: string[];
};

const PAGE_COUNT_LIMIT = 30;

export default async function crawlWebsite(rspoId: number, startUrl: string) {
    const checked = new Set<string>();
    const checkQueue: QueueItem[] = [{ pageUrl: startUrl, remainingDepth: 3 }];
    const edupage = new Set<string>();
    while (checkQueue.length > 0) {
        if (checked.size >= PAGE_COUNT_LIMIT) {
            console.warn(`\x1b[33m[RSPO: ${rspoId.toString()}] Reached checked page limit (${PAGE_COUNT_LIMIT.toString()}).\x1b[0m`);
            break;
        }

        // Queue is not empty - checked in while condition
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { pageUrl, remainingDepth } = checkQueue.shift()!;

        if (checked.has(pageUrl)) continue;

        const result = await checkPage(pageUrl, remainingDepth > 1);
        checked.add(pageUrl);
        if (result === null) continue;
        if (pageUrl !== result.responseUrl) checked.add(result.responseUrl);

        if (result.isOptivum) {
            console.log(`\x1b[42m[RSPO: ${rspoId.toString()}] Found an optivum candidate at ${pageUrl}\x1b[0m`);
            await checkOptivumCandidate(pageUrl, rspoId)
            continue;
        }
        if (result.edupageInstance !== null) edupage.add(result.edupageInstance);

        result.links.forEach((link) => {
            const newUrl = new URL(link, pageUrl);
            if (areUrlsEqualIgnoringQuery(newUrl.toString(), pageUrl)) return;
            checkQueue.push({
                pageUrl: newUrl.toString(),
                remainingDepth: remainingDepth - 1,
            });
        });
    }
    for (const instance of edupage.values()) {
        console.log(`\x1b[44m[RSPO: ${rspoId.toString()}] Found an edupage instance (${instance})\x1b[0m`);
    }
    if (edupage.size) await pushEdupageInstances(rspoId, [...edupage]);
    return { checked: checked.size };
}

async function checkPage(url: string, checkForPages: boolean): Promise<CheckPageResult | null> {
    try {
        const response = await axiosInstance.get<string>(url);
        const html = response.data;
        // https://axios-http.com/docs/res_schema
        const request = response.request as (ClientRequest | XMLHttpRequest);
        let responseUrl = url;
        if ('req' in request && request.req.url !== undefined) responseUrl = request.req.url;

        const document = cheerio.load(html);

        if (isOptivumCandidate(document)) return {
            responseUrl,
            isOptivum: true,
        };

        const edupageInstance = getEdupageInstance(html);
        return {
            responseUrl,
            isOptivum: false,
            edupageInstance,
            links: checkForPages ? findLinks(document) : []
        };
    } catch (err) {
        let errorMessage: string;
        if (axios.isAxiosError(err) && err.response !== undefined) errorMessage = err.response.status.toString();
        else if (err instanceof Error) errorMessage = err.message;
        else errorMessage = 'undefined';
        console.warn(`\x1b[33mError ${errorMessage} at ${url}\x1b[0m`);
        return null;
    }
}

const KEYWORDS = ['plan', 'harmonogram', 'podzial', 'podział', 'rozkład', 'rozklad', 'timetable', 'lekcj', 'schedule'];
const DISALLOWED_EXTENSIONS = ['.doc', '.docx', '.jpg', '.png', '.pdf', '.mp4', '.mp3'];

function findLinks($: cheerio.CheerioAPI) {
    const links = new Set<string>();
    $('a[href]')
        .toArray()
        .forEach((link) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const href = $(link).attr('href')!;
            if (href.toLowerCase().startsWith('javascript:') || href.toLowerCase().startsWith('mailto:')) return;
            if (
                KEYWORDS.some(
                    (keyword) =>
                        $(link).text().toLowerCase().includes(keyword) ||
                        href.toLowerCase().includes(keyword) ||
                        $(link).find('img').attr('src')?.toLowerCase().includes(keyword) === true ||
                        $(link).find('img').attr('alt')?.toLowerCase().includes(keyword) === true,
                )
            )
                links.add(href);
        });

    $('iframe[src]')
        .toArray()
        .forEach((iframe) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const src = $(iframe).attr('src')!.replace('://www.', '://');
            if (KEYWORDS.some((keyword) => src.toLowerCase().includes(keyword))) links.add(src);
        });

    /*$('script')
        .toArray()
        .forEach((script) => {
            $(script)
                .text()
                .replace(/\\(.)/gm, '$1')
                .match(/(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/gm)
                ?.forEach((link) => {
                    if (KEYWORDS.some((keyword) => link.toLowerCase().includes(keyword))) links.add(link)
                });
        });*/ // TODO: Think about it

    return [...links].filter((link) => {
        const linkLower = link.toLowerCase();
        return !DISALLOWED_EXTENSIONS.some((ext) => linkLower.endsWith(ext));
    });
}
