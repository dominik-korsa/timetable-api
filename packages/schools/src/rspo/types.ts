/**
 * Schema for RSPO API response for endpoint
 * https://api-rspo.mein.gov.pl/api/placowki/
 */
export interface Institution {
    numerRspo: number;
    nazwa: string;
    typ: {
        id: number;
    };
    gminaKodTERYT: string;
    geolokalizacja: { latitude: number; longitude: number };
    stronaInternetowa: string;
    adresDoKorespondecjiMiejscowosc: string;
    adresDoKorespondecjiUlica: string;
    adresDoKorespondecjiNumerBudynku: string;
    adresDoKorespondecjiNumerLokalu: string;
    adresDoKorespondecjiKodPocztowy: string;
    /**
     * In the form "/api/placowki/20539"
     */
    podmiotNadrzedny: null | string;
}
