/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { CheerioAPI } from "cheerio";

const keywords = [
    'plan',
    'harmonogram',
    'tutaj',
    'kliknij',
    'naciśnij',
    'nacisnij',
    'podzial',
    'podział',
    'rozkład',
    'rozklad',
    'timetable',
    'lekcj',
    'schedule',
];

export function findLinksByKeywords($: CheerioAPI): string[] {
    const links = new Set<string>();
    $('a[href]').toArray().forEach((link) => {
        if ($(link).attr("href") === undefined) return;
        if (
            keywords.some(
                (keyword) =>
                    $(link).text().toLowerCase().includes(keyword) ||
                    $(link).find("img").attr("src")?.toLowerCase().includes(keyword) === true ||
                    $(link).find("img").attr('alt')?.toLowerCase().includes(keyword) === true ||
                    $(link).attr('href')!.toLowerCase().includes(keyword),
            )
        )
            links.add($(link).attr('href')!);
    });
    $('iframe[src]').toArray().forEach((link) => {
        links.add($(link).attr('src')!);
    });
    $('script').toArray().forEach((element) => {
        $(element).text()
            .replace(/\\(.)/gm, '$1')
            .match(/(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/gm)
            ?.forEach((link) => {
                if (keywords.find((keyword) => link.toLowerCase().includes(keyword)) !== undefined) {
                    links.add(link);
                }
            });
    });
    return [...links].map(link => link.replace('://www.', '://'));
}

export function pageIsOptivum($: CheerioAPI) {
    const metaDescription = $('meta[name="description"]');
    const content = metaDescription.attr('content') ?? null;
    if (content === null) return false;
    return content.includes('programu Plan lekcji Optivum firmy VULCAN') || content.includes('Plan lekcji w szkole');
}

export function getEdupageInstanceName($: CheerioAPI): string | undefined {
    return /ASC.req_props={"edupage":"(.*?)"/.exec($.html())?.[1];
}
