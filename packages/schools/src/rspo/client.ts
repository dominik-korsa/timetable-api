import { setupCache } from 'axios-cache-interceptor';
import Axios from 'axios';
import { Institution } from './types.js';

export class RspoApiClient {
    private readonly axios = setupCache(Axios, {});
    private readonly rspoBaseUrl = 'https://api-rspo.mein.gov.pl/api';
    private readonly userAgent = 'Lekcje One API';

    async getInstitutions(params: {
        institutionTypeId: number | undefined;
        includeLiquidated: boolean | undefined;
        page: number | undefined;
    }): Promise<Institution[]> {
        const response = await this.axios.get<Institution[]>(`${this.rspoBaseUrl}/placowki`, {
            params: {
                typ_podmiotu_id: params.institutionTypeId,
                zlikwidowana: params.includeLiquidated,
                page: params.page,
            },
            headers: {
                'User-Agent': this.userAgent,
                Accept: 'application/json',
            },
        });
        return response.data;
    }

    async getSchoolInfo(rspoId: number): Promise<Institution> {
        const response = await this.axios.get<Institution>(`https://api-rspo.mein.gov.pl/api/placowki/${rspoId}`, {
            headers: {
                'User-Agent': this.userAgent,
                Accept: 'application/json',
            },
        });
        return response.data;
    }
}
