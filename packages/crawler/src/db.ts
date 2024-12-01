import knex from 'knex';
import { config } from 'dotenv';
import { EdupageInstancesTable, OptivumCandidatesTable } from '@timetable-api/common';

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

export function pushOptivumCandidate(rspoId: number, sources: string[], unitListJSON: string) {
    return client<OptivumCandidatesTable>('optivum_candidates')
        .insert({
            school_rspo_ids: [rspoId],
            sources,
            unit_list: unitListJSON,
        })
        .onConflict('sources')
        .merge({
            school_rspo_ids: client.raw(
                // It adds rspoId to school_rspo_ids, deletes dublications
                `(
                    SELECT array_agg(DISTINCT elem)
                    FROM unnest(array_cat(optivum_candidates.school_rspo_ids, ?)) AS elem
                )`,
                [[rspoId]],
            ),
        });
}
