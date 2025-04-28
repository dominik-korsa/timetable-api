import knex from 'knex';
import dotenv from 'dotenv';
import { EdupageInstancesTable, EdupageTimetableVersionsTable, TimetableVersionData } from '@timetable-api/common';

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

export function pushEdupageTimetableVersions(
    instanceName: string,
    versions: {
        number: string;
        year: number;
        name: string;
        dateFrom: string;
        hidden: boolean;
        data: TimetableVersionData;
    }[],
) {
    return client<EdupageTimetableVersionsTable>('edupage_timetable_versions').insert(
        versions.map((version) => ({
            edupage_instance_name: instanceName,
            number: version.number,
            date_from: version.dateFrom,
            data: JSON.stringify(version.data),
        })),
    ).onConflict().ignore();
}
