import { RspoApiClient } from './rspo/client.js';
import { mapSchool } from './utils.js';
import { pushSchools } from './db.js';

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
            const schools = data.map((school) => mapSchool(school));
            await pushSchools(schools);
        } catch (error: unknown) {
            console.warn(error);
            break;
        }
    } while (page <= lastPage);
}
