import { setupCache } from 'axios-cache-interceptor';
import axios from 'axios';
import { Institution } from './types.js';

export class RspoApiClient {
    private readonly axios = setupCache(axios.create({ baseURL: 'https://api-rspo.mein.gov.pl/api' }), { });
    private readonly userAgent = 'Lekcje One API';

    async getInstitutions(params: {
        institutionTypeId?: number;
        includeLiquidated?: boolean;
        page?: number;
    }): Promise<{ data: Institution[]; totalItems: number }> {
        const response = await this.axios.get<{
            'hydra:member': Institution[];
            'hydra:totalItems': number;
        }>(`/placowki`, {
            params: {
                typ_podmiotu_id: params.institutionTypeId,
                zlikwidowana: params.includeLiquidated ?? false,
                page: params.page,
            },
            headers: {
                'User-Agent': this.userAgent,
                Accept: 'application/ld+json',
            },
        });
        return {
            data: response.data['hydra:member'],
            totalItems: response.data['hydra:totalItems'],
        };
    }
}
