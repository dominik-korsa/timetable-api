import { RspoApiClient } from './rspo/client.js';
import { checkUrl, mapSchool } from './utils.js';
import { pushSchools } from './db.js';
import { Axios } from 'axios';
import https from 'https';

export async function handleInstitutionType(typeId: number) {
    const rspoClient = new RspoApiClient();
    let page = 1;
    let lastPage = 0;
    do {
        try {
            const { data, lastPage: lastPage_ } = await rspoClient.getInstitutions({ institutionTypeId: typeId, page });
            if (page === 1) lastPage = lastPage_;
            console.log(
                `${page === lastPage ? '\x1b[42m' : ''}[typeId: ${typeId.toString()}] Progress: page ${page.toString()}/${lastPage.toString()} (${((page / lastPage) * 100).toFixed(2)}%)${page === lastPage ? '\x1b[0m' : ''}`,
            );
            page++;
            if (!data.length) continue;
            const schools = await Promise.all(
                data.map(async (school) => {
                    const webiste = school.stronaInternetowa ? await checkWebsite(school.stronaInternetowa) : null;
                    return mapSchool(school, webiste);
                }),
            );
            await pushSchools(schools);
        } catch (error: unknown) {
            console.warn(error);
            break;
        }
    } while (page <= lastPage);
}

const axios = new Axios({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
});

async function checkWebsite(url: string) {
    const newUrl = checkUrl(url);
    if (newUrl === null) return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { request } = await axios.get(newUrl);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return (request.res.responseUrl as string | null) ?? null;
    } catch {
        return null;
    }
}
