import knex from 'knex';
import dotenv from 'dotenv';
import { OptivumCandidateTable } from '@timetable-api/common';

dotenv.config();

if (process.env.DATABASE_URL === undefined) throw Error('Missing required environment variable: DATABASE_URL');

const client = knex({
    client: 'pg',
    version: '7.2',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
});

export function getOptivumCandidates() {
    return client<OptivumCandidateTable>('optivum_candidates').select(['id', 'school_rspo_ids', 'sources', 'unit_list'])
}
