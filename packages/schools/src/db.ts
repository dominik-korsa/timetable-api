import dotenv from 'dotenv';
import knex from 'knex';
import { SchoolsTable } from '@timetable-api/common';

dotenv.config();

if (process.env.DATABASE_URL === undefined) throw Error('Missing required environment variable: DATABASE_URL');

const dbClient = knex({
    client: 'pg',
    version: '7.2',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
});

export function pushSchools(schools: Partial<SchoolsTable>[]) {
    return dbClient<SchoolsTable>('schools').insert(schools).onConflict('rspo_id').merge();
}
