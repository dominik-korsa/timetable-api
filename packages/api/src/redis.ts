import { createClient } from 'redis';
import { School } from '@timetable-api/common';

export const redisClient = createClient();

redisClient.on('error', err => console.warn('Redis Client Error', err));

export async function getSchoolById(rspoId: string | number): Promise<School | undefined> {
    const response = await redisClient.hGet('schools', rspoId.toString());
    if (!response) return undefined;
    return JSON.parse(response) as School;
}

export async function getSchoolBySpecifier(specifier: string): Promise<School | undefined> {
    const rspoId = await redisClient.hGet('school-specifiers', specifier);
    if (!rspoId) return undefined;
    return getSchoolById(rspoId);
}
