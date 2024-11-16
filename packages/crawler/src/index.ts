import { getSchoolWebsites } from './db.js';

async function main() {
    console.log('Downloading school websites list from database...');
    const websites = await getSchoolWebsites();
}

main()
    .then(() => {
        process.exit();
    })
    .catch((error: unknown) => {
        console.error(error);
    });
