import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from "cheerio";

const axiosInstance = axios.create();
axiosRetry(axiosInstance, { retries: 3, retryDelay: (retryCount) => retryCount * 3000 });

export default async function crawlWebsite(rspoId: number, url: string) {
    const checked = new Set<string>();
    /* toCheck = [page url, deepth limit][] */
    const toCheck: [string, number][] = [[url, 3]];
    do {
        const [pageUrl, deepthLimit] = toCheck[0];
        toCheck.splice(0, 1);
        if (checked.has(pageUrl)) return;
        const result = await checkPage(pageUrl, deepthLimit > 1);
        if (result === undefined) return;
    } while (toCheck.length > 0)
}

function checkPage(url: string, checkForPages: boolean) {
    return axiosInstance
        .get<string>(url)
        .then(({ data: html, config: { url: responseUrl } }) => {
            const document = cheerio.load(html);
            return { responseUrl };
        })
        .catch((error: unknown) => {
            console.warn(error);
            return;
        });
}
