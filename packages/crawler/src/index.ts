export * from './client.js';

import { runOnFile } from './client.js';

// run()
    // .then(() => { process.exit(); })
    // .catch(console.error);

runOnFile("/tmp/crawler-timetables.txt");
