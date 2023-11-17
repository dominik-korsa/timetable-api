import { RspoApiClient } from './rspo/client.js';
import { School } from './types.js';
import { Institution as RspoApiInstitution } from './rspo/types.js';
import fs from 'fs';

export async function getSchools(institutionTypeIds: number[]): Promise<School[]> {
    const rspoClient = new RspoApiClient();
    let data: RspoApiInstitution[] = [];
    console.log('Fetching data...');
    await Promise.all(
        institutionTypeIds.map(async (institutionTypeId: number) => {
            let page = 1;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
            while (true) {
                const response = await rspoClient.getInstitutions({
                    institutionTypeId,
                    includeLiquidated: false,
                    page,
                });
                data = data.concat(response);
                console.log(`${page} page has been successfully fetched`);
                if (response.length === 100) {
                    page++;
                } else {
                    break;
                }
            }
        }),
    );
    console.log('Parsing data...');
    const schools = data.map((school) => ({
        rspoId: school.numerRspo,
        name: school.nazwa,
        schoolTypeId: school.typ.id,
        voivodeshipTERYT: school.wojewodztwoKodTERYT,
        communeTERYT: school.gminaKodTERYT,
        countyTERYT: school.powiatKodTERYT,
        townTERYT: school.miejscowoscKodTERYT,
        geolocation: {
            latitude: school.geolokalizacja.latitude,
            longitude: school.geolokalizacja.longitude,
        },
        correspondenceAddress: {
            town: school.adresDoKorespondecjiMiejscowosc,
            street: school.adresDoKorespondecjiUlica,
            buildingNumber: school.adresDoKorespondecjiNumerBudynku,
            apartamentNumber: school.adresDoKorespondecjiNumerLokalu,
            zipCode: school.adresDoKorespondecjiKodPocztowy,
        },
        website: school.stronaInternetowa,
    }));
    await fs.promises.writeFile('data.json', JSON.stringify(schools), 'utf8');
    console.log('The data has been saved as data.json');
    return schools;
}
