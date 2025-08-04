import { axiosInstance } from './axios.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { handleOptivumCandidate, isOptivumCandidate } from './optivum.js';
import { getEdupageInstance } from './edupage.js';
import { areUrlsEqualIgnoringQuery } from './utils.js';
import { pushEdupageInstances } from './db.js';
import { ClientRequest } from 'node:http';
import log from './log.js';
import PQueue from 'p-queue';

type PageAnalysisResult =
    | {
          responseUrl: string;
          isOptivum: true;
      }
    | {
          responseUrl: string;
          isOptivum: false;
          edupageInstance: string | null;
          links: Set<string> | null;
      };

const PAGE_COUNT_LIMIT = 30;

export default async function crawlWebsite(rspoId: number, startUrl: string) {
    const queue = new PQueue();
    const allURLs = new Set<string>();
    const edupageInstances = new Set<string>();

    const enqueueUrl = async (url: string, remainingDepth: number) => {
        if (allURLs.has(url) || allURLs.size >= PAGE_COUNT_LIMIT) return;
        allURLs.add(url);
        await queue.add(() => processPage(url, remainingDepth));
    };

    const processPage = async (url: string, remainingDepth: number) => {
        const result = await azalyzePage(rspoId, url, remainingDepth >= 2);
        if (!result) return;

        if (result.isOptivum) {
            log.foundOptivumCandidate(rspoId, url);
            await handleOptivumCandidate(url, rspoId);
            return;
        }

        if (result.edupageInstance !== null) edupageInstances.add(result.edupageInstance);

        if (result.links !== null) {
            for (const link of result.links) {
                const absoluteUrl = new URL(link, url).toString();
                if (!areUrlsEqualIgnoringQuery(absoluteUrl, url)) await enqueueUrl(absoluteUrl, remainingDepth - 1);
            }
        }
    };

    await enqueueUrl(startUrl, 3);
    await queue.onEmpty();
    if (edupageInstances.size) await pushEdupageInstances(rspoId, [...edupageInstances]);

    return { checked: allURLs.size };
}

async function azalyzePage(rspoId: number, url: string, checkForPages: boolean): Promise<PageAnalysisResult | null> {
    try {
        const response = await axiosInstance.get<string>(url);
        const html = response.data;
        // https://axios-http.com/docs/res_schema
        const request = response.request as ClientRequest | XMLHttpRequest;
        const responseUrl = 'req' in request && request.req.url !== undefined ? request.req.url : url;

        const document = cheerio.load(html);

        if (isOptivumCandidate(document))
            return {
                responseUrl,
                isOptivum: true,
            };

        return {
            responseUrl,
            isOptivum: false,
            edupageInstance: getEdupageInstance(html),
            links: checkForPages ? findLinks(document) : null,
        };
    } catch (error) {
        let message: string;
        if (axios.isAxiosError(error) && error.response !== undefined) {
            message = `HTTP ${error.response.status.toString()}`;
        } else if (error instanceof Error) {
            message = error.message;
        } else {
            message = 'unknown error';
        }
        log.analyzingPageError(rspoId, url, message);
        return null;
    }
}

const KEYWORDS = ['plan', 'harmonogram', 'podzial', 'podział', 'rozkład', 'rozklad', 'timetable', 'lekcj', 'schedule'];
const DISALLOWED_EXTENSIONS = ['.doc', '.docx', '.jpg', '.png', '.pdf', '.mp4', '.mp3'];

function findLinks($: cheerio.CheerioAPI) {
    const links = new Set<string>();
    $('a[href]').each((_, link) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const href = $(link).attr('href')!;
        if (
            href.toLowerCase().startsWith('javascript:') ||
            href.toLowerCase().startsWith('mailto:') ||
            DISALLOWED_EXTENSIONS.some((ext) => href.toLowerCase().endsWith(ext))) return;
        const textLower = $(link).text().toLowerCase();
        const imgSrcLower = $(link).find('img').attr('src')?.toLowerCase();
        const imsAltLower = $(link).find('img').attr('alt')?.toLowerCase();
        if (
            KEYWORDS.some(
                (keyword) =>
                    textLower.includes(keyword) ||
                    href.toLowerCase().includes(keyword) ||
                    imgSrcLower?.includes(keyword) === true ||
                    imsAltLower?.includes(keyword) === true,
            )
        )
            links.add(href);
    });

    $('iframe[src]').each((_, iframe) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const src = $(iframe).attr('src')!.replace('://www.', '://');
        if (
            KEYWORDS.some((keyword) => src.toLowerCase().includes(keyword)) &&
            !DISALLOWED_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext))
        )
            links.add(src);
    });

    return links;
}
