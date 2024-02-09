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

export function findLinksByKeywords(document: Document): string[] {
    const links = new Set<string>();
    Array.from(document.querySelectorAll('a[href]')).forEach((link) => {
        if (
            keywords.some(
                (keyword) =>
                    link.textContent?.toLowerCase()?.includes(keyword) === true ||
                    link.querySelector('img')?.getAttribute('src')?.toLowerCase()?.includes(keyword) === true ||
                    link.querySelector('img')?.getAttribute('alt')?.toLowerCase()?.includes(keyword) === true ||
                    link.getAttribute('href')!.toLowerCase().includes(keyword),
            )
        )
            links.add(link.getAttribute('href')!);
    });
    Array.from(document.querySelectorAll('iframe[src]')).forEach((link) => {
        links.add(link.getAttribute('src')!);
    });
    Array.from(document.querySelectorAll('script')).forEach((element) => {
        element.innerHTML
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

export function pageIsOptivum(page: Document) {
    const content = page.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    if (content === null) return false;
    return content.includes('programu Plan lekcji Optivum firmy VULCAN') || content.includes('Plan lekcji w szkole');
}

export function getEdupageInstanceName(page: Document): string | undefined {
    return /ASC.req_props={"edupage":"(.*?)"/.exec(page.head.innerHTML)?.[1];
}
