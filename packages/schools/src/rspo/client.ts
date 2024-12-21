import axios from 'axios';
import { Institution } from './types.js';

export class RspoApiClient {
    private readonly axios = axios.create({ baseURL: 'https://api-rspo.men.gov.pl/api' });
    private readonly userAgent = 'Lekcje One API';

    async getInstitutions(params: {
        institutionTypeId?: number;
        includeLiquidated?: boolean;
        page?: number;
    }): Promise<{ data: Institution[]; lastPage: number }> {
        const response = await this.axios.get<{
            'hydra:member': Institution[];
            'hydra:view': { 'hydra:last': string };
        }>(`/placowki`, {
            params: {
                page: params.page,
                typ_podmiotu_id: params.institutionTypeId,
                zlikwidowana: params.includeLiquidated ?? false,
            },
            headers: {
                'User-Agent': this.userAgent,
                Accept: 'application/ld+json',
            },
        });
        return {
            data: response.data['hydra:member'],
            lastPage: Number(/\/api\/placowki\/\?(.*)page=(\d+)/.exec(response.data['hydra:view']['hydra:last'])?.[2] ?? 1),
        };
    }
}
