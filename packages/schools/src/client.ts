import { RspoApiClient } from './rspo/client.js';
import { Institution } from './rspo/types.js';
import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.DATABASE_URL === undefined) throw Error('Missing required environment variable: DATABASE_URL');

const dbClient = knex({
    client: 'pg',
    version: '7.2',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
});

export async function run(institutionTypeIds: number[]): Promise<void> {
    const rspoClient = new RspoApiClient();
    await Promise.all(
        institutionTypeIds.map(async (institutionTypeId: number) => {
            let page = 1;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
            while (true) {
                console.log(`[Institution type: ${institutionTypeId}, page: ${page}] Fetching data from Rspo API...`);
                let data: Institution[] | undefined;
                let nextPageAvalible: boolean | undefined;
                try {
                    ({ data, nextPageAvalible } = await rspoClient.getInstitutions({
                        institutionTypeId,
                        includeLiquidated: false,
                        page,
                    }));
                } catch {
                    console.log('Error');
                    continue;
                }
                if (data.length === 0) break;
                console.log(
                    `[Institution type: ${institutionTypeId}, page: ${page}] Parsing and pushing data to database...`,
                );
                await dbClient('schools')
                    .insert(
                        data.map((school) => ({
                            rspo_id: school.numerRspo,
                            name: school.nazwa,
                            generated_on: dbClient.fn.now(),
                            voivodeship_teryt: school.wojewodztwoKodTERYT,
                            commune_teryt: school.gminaKodTERYT,
                            county_teryt: school.powiatKodTERYT,
                            geo_lat: school.geolokalizacja.latitude,
                            geo_long: school.geolokalizacja.longitude,
                            corresp_addr_town: school.adresDoKorespondecjiMiejscowosc,
                            corresp_addr_street: school.adresDoKorespondecjiUlica,
                            corresp_addr_building_nr: school.adresDoKorespondecjiNumerBudynku,
                            corresp_addr_apartament_nr: school.adresDoKorespondecjiNumerLokalu,
                            corresp_addr_zip_code: school.adresDoKorespondecjiKodPocztowy,
                            website_url: checkUrl(school.stronaInternetowa),
                            institution_type: school.typ.id,
                            parent_rspo_id: extractInstitutionId(school.podmiotNadrzedny),
                        })),
                    )
                    .onConflict('rspo_id')
                    .merge();
                if (!nextPageAvalible) {
                    break;
                }
                page++;
            }
        }),
    );
    console.log('Done!');
}

function extractInstitutionId(url: string | null): string | null {
    if (url === null) return null;
    const prefix = '/api/placowki/';
    if (!url.startsWith(prefix)) throw new Error(`Institution URL does not start with '${prefix}'`);
    return url.substring(prefix.length);
}

function checkUrl(url: string) {
    if (url === '' || !/(^https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*)(:\d{1,5})?(\/.*)?$/m.test(url)) {
        return null;
    }
    return url.includes('://') ? url.replace('://www.', '://') : 'http://' + url.replace('://www.', '://');
}

run([
    93, 94, 97, 45, 96, 4, 89, 34, 65, 14, 17, 15, 27, 54, 75, 83, 64, 29, 21, 24, 26, 47, 74, 46, 91, 92, 51, 50, 85, 86, 3, 19, 20, 16, 100
])
    .then(() => { process.exit(); })
    .catch(console.error);
