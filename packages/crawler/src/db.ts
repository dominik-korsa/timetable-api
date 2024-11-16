import knex from 'knex';
import { config } from 'dotenv';

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
