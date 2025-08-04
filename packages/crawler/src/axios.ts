import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import http from 'http';

export const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
        maxSockets: 100,
    }),
    httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 100,
    }),
    maxContentLength: 2 * 1024 * 1024
});

axiosRetry(axiosInstance, { retries: 3, retryDelay: (retryCount) => retryCount * 3000, retryCondition: (error) => {
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
    const statusCode = error.response?.status;
    return statusCode === undefined || [429, 500, 502, 503, 504].includes(statusCode);
}});