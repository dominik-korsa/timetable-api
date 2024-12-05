import knex from 'knex';
import dotenv from 'dotenv';
import {
    OptivumCandidatesTable,
    OptivumTimetableVersionSchoolsTable,
    OptivumTimetableVersionSourcesTable,
    OptivumTimetableVersionsTable,
    TimetableVersionData,
} from '@timetable-api/common';

dotenv.config();

if (process.env.DATABASE_URL === undefined) throw Error('Missing required environment variable: DATABASE_URL');

const client = knex({
    client: 'pg',
    version: '7.2',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
    acquireConnectionTimeout: 1000000,
});

export function getOptivumCandidates() {
    return client<OptivumCandidatesTable>('optivum_candidates').select([
        'id',
        'school_rspo_ids',
        'sources',
        'unit_list',
    ]);
}

export function deleteOptivumCandidateById(id: number) {
    return client<OptivumCandidatesTable>('optivum_candidates').where('id', '=', id).del();
}

export function getOptivumVersionByHash(hash: string) {
    return client<OptivumTimetableVersionsTable>('optivum_timetable_versions').where('hash', '=', hash).first(['id']);
}

export function pushOptivumVersion(hash: string, data: TimetableVersionData, generatedOn: string) {
    return client<OptivumTimetableVersionsTable>('optivum_timetable_versions')
        .insert({
            hash,
            generated_on: generatedOn,
            data: JSON.stringify(data),
        })
        .onConflict('hash')
        .ignore()
        .returning(['id']);
}

export function pushOptivumVersionSchools(optivumVersionId: number, rspoIds: number[]) {
    return client<OptivumTimetableVersionSchoolsTable>('optivum_timetable_version_schools')
        .insert(
            rspoIds.map((rspoId) => ({
                optivum_timetable_version_id: optivumVersionId,
                school_rspo_id: rspoId,
            })),
        )
        .onConflict()
        .ignore();
}

export function pushOptivumVersionSources(optivumVersionId: number, sources: string[]) {
    return client<OptivumTimetableVersionSourcesTable>('optivum_timetable_version_sources')
        .insert({ optivum_timetable_version_id: optivumVersionId, sources })
        .onConflict(['optivum_timetable_version_id', 'sources'])
        .merge(['last_checked_at']);
}
