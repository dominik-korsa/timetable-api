import {SchoolManager} from "./school-manager/index.js";

async function main() {
    const schoolManager = new SchoolManager();
    await schoolManager.load();
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
