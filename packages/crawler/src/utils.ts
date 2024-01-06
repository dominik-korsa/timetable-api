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
    'timetable',
    'lekcj',
    'schedule'
];

export function findLinksByKeywords(document: Document): string[] {
    const links = new Set<string>();
    Array.from(document.querySelectorAll('a[href]')).forEach(link => {
        if (
            keywords.find(
                (keyword) =>
                    link.textContent?.toLowerCase()?.includes(keyword) === true ||
                    link.querySelector('img')?.getAttribute('src')?.toLowerCase()?.includes(keyword) === true ||
                    link.querySelector('img')?.getAttribute('alt')?.toLowerCase()?.includes(keyword) === true ||
                    link.getAttribute('href')?.toLowerCase()?.includes(keyword),
            ) !== undefined
        )
            links.add(link.getAttribute('href')?.replace('www.', '') ?? '');
        }
    );
    Array.from(document.querySelectorAll('iframe[src]')).forEach((link) => {
        links.add(link.getAttribute('src')?.replace('www.', '') ?? '');
    });
    Array.from(document.querySelectorAll('script')).forEach((element) => {
        element.innerHTML
            .replace(/\\(.)/gm, '$1')
            .match(/(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/gm)
            ?.forEach((link) => {
                if (keywords.find((keyword) => link.toLowerCase().includes(keyword)) !== undefined) {
                    links.add(link.replace('www.', ''));
                }
            });
    });
    return [...links];
}

export function checkTimetablePage(page: Document): 'optivum' | 'asctimetables' | undefined {
    if (
        page.querySelector(
            'a[style="color:inherit"][target="_blank"][href="http://www.asctimetables.com/timetables_pl.html"]',
        )?.textContent === 'aSc Plan Lekcji - program do tworzenia planu lekcji'
    ) { return 'asctimetables'; }
    if (
        page.querySelector('meta[name="description"]')?.getAttribute('content') != null &&
        (page
            .querySelector('meta[name="description"]')
            ?.getAttribute('content')
            ?.includes('programu Plan lekcji Optivum firmy VULCAN') === true ||
            page
                .querySelector('meta[name="description"]')
                ?.getAttribute('content')
                ?.includes('Plan lekcji w szkole') === true)
    ) { return 'optivum'; }
}

export const fixUrl = (url: string) => (!url.includes('://')) ? 'http://' + url.replace('www.', '') : url.replace('www.', '');
