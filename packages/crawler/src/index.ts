import crawlWebsite from './crawler.js';
import { getSchoolWebsites } from './db.js';
import { asyncForEachWithLimit, ParalelLimit } from './paralel-limit.js';

const PARALEL_WEBSITE_LIMIT = 30;

async function main() {
    console.log('Downloading school websites list from database...');
    const websites = await getSchoolWebsites();

    console.log('Crawling websites...');
    await asyncForEachWithLimit(
        websites,
        async ({ rspo_id, website_url }) =>
            crawlWebsite(rspo_id, website_url)
                .then(() => {
                    console.log('done!'); //TODO: Progress bar
                })
                .catch((error: unknown) => {
                    console.warn(`Error, school id: ${rspo_id.toString()}`, error);
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
