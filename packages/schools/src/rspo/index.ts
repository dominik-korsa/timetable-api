import {setupCache} from "axios-cache-interceptor";
import Axios from "axios";
import {RspoSchoolResponse} from "./types.js";

export class RspoClient {
    // TODO: Use redis
    private readonly axios = setupCache(Axios);

    async getSchoolInfo(rspoId: number) {
        const response = await this.axios.get<RspoSchoolResponse>(`https://api-rspo.mein.gov.pl/api/placowki/${rspoId}`);
        return response.data;
    }
}
