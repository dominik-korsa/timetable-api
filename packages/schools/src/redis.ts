import { createClient } from 'redis';

export const redisClient = createClient();

redisClient.on('error', (err) => {
    console.warn('Redis Client Error', err);
});
