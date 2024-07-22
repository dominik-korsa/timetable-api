import { RspoApiClient } from './rspo/client.js';
import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const dbClient = knex({
    client: 'pg',
    version: '7.2',
    connection: {
        connectionString: process.env.DATABASE_URL,
    },
    useNullAsDefault: true,
});

export async function run(institutionTypeIds: number[]): Promise<void> {
    const rspoClient = new RspoApiClient();
    await Promise.all(
        institutionTypeIds.map(async (institutionTypeId: number) => {
            let page = 1;
            let pageLength: number;
            do {
                console.log(`Type: ${institutionTypeId} | Page: ${page} `) // TODO: Progress bar
                try {
                    const { data } = await rspoClient.getInstitutions({ institutionTypeId, page });
                    pageLength = data.length;
                    if (!pageLength) break;
                    await dbClient('schools')
                        .insert(
                            data.map((school) => ({
                                rspo_id: school.numerRspo,
                                name: school.nazwa,
                                generated_on: dbClient.fn.now(),
                                commune_teryt: school.gminaKodTERYT,
                                geo_lat: school.geolokalizacja.latitude,
                                geo_long: school.geolokalizacja.longitude,
                                corresp_addr_town: school.adresDoKorespondecjiMiejscowosc,
                                corresp_addr_street: school.adresDoKorespondecjiUlica,
                                corresp_addr_building_nr: school.adresDoKorespondecjiNumerBudynku,
                                corresp_addr_apartament_nr: school.adresDoKorespondecjiNumerLokalu,
                                corresp_addr_zip_code: school.adresDoKorespondecjiKodPocztowy,
                                website_url: checkUrl(school.stronaInternetowa),
                                institution_type: school.typ.id,
                                parent_rspo_id:
                                    school.podmiotNadrzedny !== null
                                        ? extractInstitutionId(school.podmiotNadrzedny)
                                        : null,
                            })),
                        )
                        .onConflict('rspo_id')
                        .merge();
                } catch (error) {
                    console.warn(error);
                    break;
                }
                page++;
            } while (pageLength === 100);
        }),
    );
    console.log('Done!');
}

function extractInstitutionId(url: string): string {
    const prefix = '/api/placowki/';
    if (!url.startsWith(prefix)) throw new Error(`Institution URL does not start with '${prefix}'`);
    return url.substring(prefix.length);
}

const urlRegex = /(^https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*)(:\d{1,5})?(\/.*)?$/m;

function checkUrl(url: string): string | null {
    if (url === '' || !urlRegex.test(url)) return null;
    if (!url.includes('://')) url = 'http://' + url;
    url.replace('://www.', '://');
    return url;
}
