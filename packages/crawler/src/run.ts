import crawlWebsite from './crawler.js';
import { getSchoolWebsites } from './db.js';
import { asyncForEachWithLimit, ParalelLimit } from '@timetable-api/common';

const PARALEL_WEBSITE_LIMIT = 30;

async function main() {
    console.log('Downloading school websites list from database...');
    const websites = await getSchoolWebsites();

    console.log('Crawling websites...');
    await asyncForEachWithLimit(
        websites,
        async ({ rspo_id, website_url }) =>
            crawlWebsite(rspo_id, website_url)
                .then(({ checked }) => {
                    console.log(`[RSPO: ${rspo_id.toString()}] Done! Checked ${checked.toString()} pages.`); //TODO: Progress bar
                })
                // eslint-disable-next-line @typescript-eslint/use-unknown-in-catch-callback-variable
                .catch((error: Error) => {
                    console.warn(`\x1b[33m[RSPO: ${rspo_id.toString()}] Error message: ${error.message}\x1b[0m`);
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
