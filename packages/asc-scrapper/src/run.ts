import axios from 'axios';
import { getEdupageInstances, pushEdupageTimetableVersions } from './db.js';
import axiosRetry from 'axios-retry';
import { asyncForEachWithLimit, ParalelLimit } from '@timetable-api/common';
import { Client } from './client.js';

const PARALEL_INSTANCE_LIMIT = 30;

const axiosInstance = axios.create();
axiosRetry(axiosInstance);

async function main() {
    console.log('Downloading edupage instances...');
    const instances = await getEdupageInstances();

    console.log('Searching for timetable versions in edupage API...');
    await asyncForEachWithLimit(
        instances,
        async (instance) => {
            const startTime = Date.now();
            const scrapper = new Client(axios, instance.instance_name);
            try {
                const versions = await scrapper.getAllVersions();
                if (versions.length) await pushEdupageTimetableVersions(instance.instance_name, versions);
                console.log(
                    `[name: ${instance.instance_name}] Done! It took ${(Date.now() - startTime).toString(10)}ms.`,
                );
            } catch (err: unknown) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                console.warn(`[name: ${instance.instance_name}] Failed to handle instance, error: ${err}`);
            }
        },
        new ParalelLimit(PARALEL_INSTANCE_LIMIT),
    );
}

main()
    .then(() => {
        process.exit();
    })
    .catch((err: unknown) => {
        console.error(err);
    });
