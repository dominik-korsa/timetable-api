import { getEdupageInstances } from "./db.js";

async function main() {
    console.log('Downloading edupage instances...');
    const instances = await getEdupageInstances();
}

main()
    .then(() => {
        process.exit();
    })
    .catch((err: unknown) => {
        console.error(err);
    });

