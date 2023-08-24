import { setupCache } from 'axios-cache-interceptor';
import Axios from 'axios';
import { RspoSchoolResponse } from './types.js';
import { redisClient } from '../redis.js';
import { buildRedisStorage } from '@timetable-api/common';

export class RspoClient {
    private readonly axios = setupCache(Axios, {
        storage: buildRedisStorage(redisClient),
    });

    async getSchoolInfo(rspoId: number) {
        const response = await this.axios.get<RspoSchoolResponse>(
            `https://api-rspo.mein.gov.pl/api/placowki/${rspoId}`,
        );
        return response.data;
    }
}
