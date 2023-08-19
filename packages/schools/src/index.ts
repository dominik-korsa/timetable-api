import {updateSchoolCache} from "./school-manager.js";
import {redisClient} from "./redis.js";

async function main() {
    await redisClient.connect();
    await updateSchoolCache();
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
