import { asyncForEachWithLimit, ParalelLimit } from '@timetable-api/common';
import { getOptivumCandidates } from './db.js';

export * from './client.js';

const PARALEL_CANDIDATE_LIMIT = 30; // TODO: Set optimal value

async function main() {
    console.log('Downloading optivum candidates list...');
    const candidates = await getOptivumCandidates();

    console.log('Handling candidates...');
    await asyncForEachWithLimit(
        candidates,
        // eslint-disable-next-line @typescript-eslint/require-await
        async (candidate) => {
            console.log(candidate.id);
        },
        new ParalelLimit(PARALEL_CANDIDATE_LIMIT),
    );
}

main()
    .then(() => {
        process.exit();
    })
    .catch((err: unknown) => {
        console.error(err);
    });
