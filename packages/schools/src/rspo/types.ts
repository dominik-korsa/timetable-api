export interface RspoSchoolResponse {
    nazwa: string;
    wojewodztwo: string;
    wojewodztwoKodTERYT: string;
    powiat: string;
    powiatKodTERYT: string;
    gmina: string;
    gminaKodTERYT: string;
    gminaRodzaj: string;
    gminaRodzajKod: string;
    miejscowosc: string;
    miejscowoscKodTERYT: string;
    geolokalizacja: { latitude: string, longitude: string };
}
