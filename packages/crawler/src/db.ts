import {
    EdupageInstancesTable,
    OptivumTimetableVersionsTable,
    SchoolsTable,
    TimetableUrlsTable,
    TimetableVersion,
} from '@timetable-api/common';
import dotenv from 'dotenv';
import knex from 'knex';

dotenv.config();

const dbClient = knex({
    client: 'pg',
    version: '7.2',
    connection: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
    },
    useNullAsDefault: true,
});

export const getSchoolsWithWebiste = async () =>
    await dbClient<SchoolsTable & { website_url: string }>('schools').whereNotNull('website_url');

export async function pushOptivumTimetableVersion(
    parsedTimetable: TimetableVersion,
    schoolRspoId: number,
    hash: string,
) {
    return (
        await dbClient<OptivumTimetableVersionsTable, { unqiue_id: number }>('optivum_timetable_versions')
            .returning('unique_id')
            .insert({
                school_rspo_id: schoolRspoId,
                generated_on: parsedTimetable.data.generationDate,
                timetable_data: JSON.stringify(parsedTimetable.data),
                discriminant: dbClient.raw(
                    `(SELECT coalesce(max(discriminant), -1) + 1 FROM optivum_timetable_versions WHERE school_rspo_id = ${schoolRspoId} AND generated_on = '${parsedTimetable.data.generationDate}')`,
                ),
                hash,
            })
            .onConflict(['school_rspo_id', 'hash'])
            .merge(['school_rspo_id'])
            .returning('*')
    )[0];
}

export async function pushOptivumTimetableVersionUrl(url: string, timetableVersionId: number, schoolRspoId: number) {
    await dbClient<TimetableUrlsTable>('timetable_urls')
        .insert({
            timetable_version_id: timetableVersionId,
            school_rspo_id: schoolRspoId,
            url,
        })
        .onConflict(['school_rspo_id', 'url', 'timetable_version_id'])
        .merge(['last_check_at']);
}

export async function pushEdupageInstances(rspoId: number, instances: string[]) {
    await dbClient<EdupageInstancesTable>('edupage_instances').insert(
        instances.map((instanceName) => ({ school_rspo_id: rspoId, instance_name: instanceName })),
    );
}
