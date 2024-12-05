import { Institution } from "./rspo/types"

export const mapSchool = (school: Institution) => ({
    rspo_id: school.numerRspo,
    name: school.nazwa,
    commune_teryt: school.gminaKodTERYT,
    geo_lat: school.geolokalizacja.latitude.toString(),
    geo_long: school.geolokalizacja.longitude.toString(),
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
})

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
