export * from './client.js';

import { run } from './client.js';

run()
    .then(() => { process.exit(); })
    .catch(console.error);
