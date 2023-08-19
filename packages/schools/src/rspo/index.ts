import {buildStorage, canStale, setupCache, StorageValue} from "axios-cache-interceptor";
import Axios from "axios";
import {RspoSchoolResponse} from "./types.js";
import {redisClient} from "../redis.js";
import {SetOptions} from "redis";

// https://axios-cache-interceptor.js.org/guide/storages
const redisStorage = buildStorage({
    async find(key) {
        const cached = await redisClient.get(`axios-cache:${key}`);
        if (cached === null) return undefined;
        return JSON.parse(cached) as StorageValue;
    },
    async set(key, value, req) {
        const options: SetOptions = {};
        if (value.state === 'loading') {
            options.PX = req?.cache && typeof req.cache.ttl === 'number' ? req.cache.ttl : 60000;
        } else if ((value.state === 'stale' && value.ttl) || (value.state === 'cached' && !canStale(value))) {
            options.PXAT = value.createdAt + value.ttl!;
        }
        await redisClient.set(`axios-cache:${key}`, JSON.stringify(value), options);
    },
    async remove(key) {
        await redisClient.del(`axios-cache-${key}`);
    }
});

export class RspoClient {
    private readonly axios = setupCache(Axios, {
        storage: redisStorage,
    });

    async getSchoolInfo(rspoId: number) {
        const response = await this.axios.get<RspoSchoolResponse>(`https://api-rspo.mein.gov.pl/api/placowki/${rspoId}`);
        return response.data;
    }
}
