import knex from 'knex';
import dotenv from 'dotenv';
import { EdupageInstancesTable } from '@timetable-api/common';

dotenv.config();

if (process.env.DATABASE_URL === undefined) throw Error('Missing required environment variable: DATABASE_URL');

const client = knex({
    client: 'pg',
    version: '7.2',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
    acquireConnectionTimeout: 1000000,
});

export function getEdupageInstances() {
    return client<EdupageInstancesTable>('edupage_instances').select(['id', 'instance_name', 'school_rspo_id']);
}
