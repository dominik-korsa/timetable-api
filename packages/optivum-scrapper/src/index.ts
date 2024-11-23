import { getOptivumCandidates } from './db.js';

export * from './client.js';

async function main() {
    console.log('Downloading optivum candidates list...')
    await getOptivumCandidates();
}

main()
    .then(() => {
        process.exit();
    })
    .catch((err: unknown) => {
        console.error(err);
    });
