import { asyncForEachWithLimit, ParalelLimit } from '@timetable-api/common';
import {
    deleteOptivumCandidateById,
    getOptivumCandidates,
    getOptivumVersionByHash,
    pushOptivumVersion,
    pushOptivumVersionSchools,
    pushOptivumVersionSources,
} from './db.js';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Unit } from './types.js';
import { Timetable } from './timetable.js';

const PARALEL_CANDIDATE_LIMIT = 30;

const axiosInstance = axios.create();
axiosRetry(axiosInstance);

async function main() {
    console.log('Downloading optivum candidates list...');
    const candidates = await getOptivumCandidates();

    console.log('Handling candidates...');
    await asyncForEachWithLimit(
        candidates,
        async (candidate) => {
            const startTime = Date.now();
            try {
                await handleOptivumCandidate(candidate);
                console.log(
                    `[ID: ${candidate.id.toString()}] Done! It took ${(Date.now() - startTime).toString(10)}ms.`,
                );
            } catch (err: unknown) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                console.warn(`[ID: ${candidate.id.toString()}, sources: ${candidate.sources}] Failed to handle candidate, error: ${err}`);
            } finally {
                await deleteOptivumCandidateById(candidate.id);
            }
        },
        new ParalelLimit(PARALEL_CANDIDATE_LIMIT),
    );
}

async function handleOptivumCandidate({
    school_rspo_ids: rspoIds,
    sources,
    unit_list: unitListJSON,
}: {
    school_rspo_ids: number[];
    sources: string[];
    unit_list: string;
    id: number;
}) {
    const parsedUnitsList = JSON.parse(unitListJSON) as Unit[];
    const timetable = new Timetable(sources[0], axiosInstance, { sources, units: parsedUnitsList });

    const hash = await timetable.getHash();
    let version = await getOptivumVersionByHash(hash);

    if (!version) {
        const parsed = await timetable.parse();
        version = (await pushOptivumVersion(hash, parsed.data, parsed.generatedDate))[0];
    }

    await pushOptivumVersionSources(version.id, sources);
    await pushOptivumVersionSchools(version.id, rspoIds);
}

main()
    .then(() => {
        process.exit();
    })
    .catch((err: unknown) => {
        console.error(err);
    });
