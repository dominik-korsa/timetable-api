import { CheerioAPI } from 'cheerio';
import { Timetable } from '@timetable-api/optivum-scrapper';
import { pushOptivumCandidate } from './db.js';
import log from './log.js';
import { axiosInstance } from './axios.js';

export function isOptivumCandidate($: CheerioAPI) {
    const hasVulcanLink =
        $('a[href="http://www.vulcan.edu.pl/dla_szkol/optivum/plan_lekcji/Strony/wstep.aspx"]').length > 0;
    const description = $('meta[name="description"]').attr('content') ?? '';
    const hasMatchingDescription =
        description.includes('programu Plan lekcji Optivum firmy VULCAN') ||
        description.includes('Plan lekcji w szkole');
    return hasVulcanLink || hasMatchingDescription;
}

export async function handleOptivumCandidate(url: string, rspoId: number) {
    const timetable = new Timetable(url, axiosInstance);
    try {
        const { sources, units } = await timetable.getUnitList();
        if (!units.length) {
            log.optivumEmptyList(rspoId, url);
            return;
        }
        const listJSON = JSON.stringify(units);
        return await pushOptivumCandidate(rspoId, sources, listJSON);
    } catch (error) {
        log.optivumGettingListFailed(rspoId, url, error instanceof Error ? error.message : null);
    }
}
