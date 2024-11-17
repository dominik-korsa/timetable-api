import knex from 'knex';
import { config } from 'dotenv';
import { EdupageInstancesTable } from '@timetable-api/common';

config();

if (process.env.DATABASE_URL === undefined) throw Error('Missing required environment variable: DATABASE_URL');

const client = knex({
    client: 'pg',
    version: '7.2',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
});

export function getSchoolWebsites() {
    return client<{ rspo_id: number; website_url: string }>('schools')
        .select('rspo_id')
        .select('website_url')
        .whereNotNull('website_url');
}

export function pushEdupageInstances(rspoId: number, instances: string[]) {
    return client<EdupageInstancesTable>('edupage_instances')
        .insert(instances.map((instanceName) => ({ school_rspo_id: rspoId, instance_name: instanceName })))
        .onConflict()
        .ignore();
}
