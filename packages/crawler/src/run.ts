import crawlWebsite from './crawler.js';
import { getSchoolWebsites } from './db.js';
import { asyncForEachWithLimit, ParalelLimit } from '@timetable-api/common';
import log from './log.js';

const PARALEL_WEBSITE_LIMIT = 750;

async function main() {
    console.log('Downloading school websites list from database...');
    const websites = await getSchoolWebsites();
    const websitesCount = websites.length;

    console.log('Crawling websites...');
    let counter = 0;
    await asyncForEachWithLimit(
        websites,
        async ({ rspo_id, website_url }) =>
            crawlWebsite(rspo_id, website_url)
                .then(({ checked }) => {
                    counter++;
                    log.crawledWebsite(rspo_id, checked, counter, websitesCount);
                })
                .catch((error: unknown) => {
                    log.crawlingError(rspo_id, error instanceof Error ? error.message : null);
                }),
        new ParalelLimit(PARALEL_WEBSITE_LIMIT),
    );
}

main()
    .then(() => {
        process.exit();
    })
    .catch((error: unknown) => {
        console.error(error);
    });
