import {startServer} from "./api/index.js";
import {SchoolManager} from "./school-manager/index.js";

async function main() {
    const schoolManager = new SchoolManager();
    await schoolManager.load();
    await startServer({
        schoolManager,
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
