// https://axios-cache-interceptor.js.org/guide/storages
import { buildStorage, canStale, StorageValue } from 'axios-cache-interceptor';
import { RedisClientType, SetOptions } from 'redis';

interface GenericRedis {
    get: RedisClientType['get'];
    set: RedisClientType['set'];
    del: RedisClientType['del'];
}

export const buildRedisStorage = (redisClient: GenericRedis) =>
    buildStorage({
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
                options.PXAT = value.createdAt + (value.ttl ?? 0);
            }
            await redisClient.set(`axios-cache:${key}`, JSON.stringify(value), options);
        },
        async remove(key) {
            await redisClient.del(`axios-cache-${key}`);
        },
    });
