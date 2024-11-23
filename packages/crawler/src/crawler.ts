import axios, { Axios, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { checkOptivumCandidate, isOptivumCandidate } from './optivum.js';
import { getEdupageInstance } from './edupage.js';
import { areUrlsEqualIgnoringQuery } from './utils.js';
import { pushEdupageInstances } from './db.js';

const axiosInstance = axios.create();
axiosRetry(axiosInstance, { retries: 3, retryDelay: (retryCount) => retryCount * 3000 });

export default async function crawlWebsite(rspoId: number, url: string) {
    const checked = new Set<string>();
    /* toCheck = [page url, depth limit][] */
    const toCheck: [string, number][] = [[url, 3]];
    const edupage = new Set<string>();
    do {
        if (checked.size >= 50) {
            console.warn(`\x1b[33m[RSPO: ${rspoId.toString()}] Something went wrong! Checked size is >= 60.\x1b[0m`);
            break;
        }
        const [pageUrl, depthLimit] = toCheck[0];
        toCheck.splice(0, 1);
        if (checked.has(pageUrl)) continue;

        const result = await checkPage(pageUrl, depthLimit > 1);
        checked.add(pageUrl);
        if (result === undefined) continue;
        if (pageUrl !== result.responseUrl) checked.add(result.responseUrl);

        if (result.optivum === true) {
            console.log(`\x1b[42m[RSPO: ${rspoId.toString()}] Found an optivum candidate at ${pageUrl}\x1b[0m`);
            await checkOptivumCandidate(pageUrl, rspoId)
            continue;
        }
        if (result.edupage !== undefined) edupage.add(result.edupage);

        result.links?.forEach((link) => {
            const newUrl = new URL(link, pageUrl);
            if (areUrlsEqualIgnoringQuery(newUrl.toString(), pageUrl)) return;
            toCheck.push([newUrl.toString(), depthLimit - 1]);
        });
    } while (toCheck.length > 0);
    [...edupage].forEach((e) => {
        console.log(`\x1b[44m[RSPO: ${rspoId.toString()}] Found an edupage instance (${e})\x1b[0m`);
    });
    if (edupage.size) await pushEdupageInstances(rspoId, [...edupage]);
    return { checked: checked.size };
}

function checkPage(url: string, checkForPages: boolean) {
    return axiosInstance
        .get<string>(url)
        .then(({ data: html, config: { url: responseUrl } }) => {
            const document = cheerio.load(html);
            if (isOptivumCandidate(document)) return { responseUrl: responseUrl ?? url, optivum: true };
            const edupage = getEdupageInstance(html);
            return { responseUrl: responseUrl ?? url, edupage, links: checkForPages ? findLinks(document) : [] };
        })
        // eslint-disable-next-line @typescript-eslint/use-unknown-in-catch-callback-variable
        .catch((err: Error | AxiosError) => {
            console.warn(`\x1b[33mError ${axios.isAxiosError(err) ? err.response?.status.toString() ?? 'undefined' : err.message} at ${url}\x1b[0m`);
            return;
        });
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
        return !DISALLOWED_EXTENSIONS.some((ext) => linkLower.endsWith(ext)) && !linkLower.startsWith('mailto:');
    });
}
