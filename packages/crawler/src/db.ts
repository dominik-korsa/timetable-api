import {
    EdupageInstancesTable,
    EdupageTimetableVersionsTable,
    OptivumTimetableVersionsTable,
    SchoolsTable,
    TimetableUrlsTable,
    TimetableVersionData,
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

export async function getSchoolsWithWebiste() {
    return dbClient<SchoolsTable & { website_url: string }>('schools').whereNotNull('website_url');
}

export async function pushOptivumTimetableVersion(
    parsedTimetableData: TimetableVersionData,
    generationDate: string,
    schoolRspoId: number,
    hash: string,
) {
    return (
        await dbClient<OptivumTimetableVersionsTable, { unqiue_id: number }>('optivum_timetable_versions')
            .returning('unique_id')
            .insert({
                school_rspo_id: schoolRspoId,
                generated_on: generationDate,
                timetable_data: JSON.stringify(parsedTimetableData),
                discriminant: dbClient.raw(
                    `(SELECT coalesce(max(discriminant), -1) + 1 FROM optivum_timetable_versions WHERE school_rspo_id = ${schoolRspoId} AND generated_on = '${generationDate}')`,
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
    await dbClient<EdupageInstancesTable>('edupage_instances')
        .insert(instances.map((instanceName) => ({ school_rspo_id: rspoId, instance_name: instanceName })))
        .onConflict()
        .ignore();
}

export async function getEdupageInstanceNames() {
    return await dbClient<EdupageInstancesTable>('edupage_instances').distinct().pluck('instance_name');
}

export async function pushEdupageTimetableVersions(
    instanceName: string,
    versions: {
        number: string;
        year: number;
        name: string;
        dateFrom: string;
        hidden: boolean;
        data: unknown;
    }[],
) {
    await dbClient<EdupageTimetableVersionsTable>('edupage_timetable_versions')
        .insert(
            versions.map((version) => ({
                edupage_instance_name: instanceName,
                number: version.number,
                date_from: version.dateFrom,
                data: JSON.stringify(version.data),
            })),
        )
        .onConflict()
        .ignore();
}
