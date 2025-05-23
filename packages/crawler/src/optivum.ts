import { CheerioAPI } from 'cheerio';
import { Timetable } from '@timetable-api/optivum-scrapper';
import axios from 'axios';
import { pushOptivumCandidate } from './db.js';
import https from 'https';

export function isOptivumCandidate($: CheerioAPI) {
    const description = $('meta[name="description"]').attr('content');
    return (
        description?.includes('programu Plan lekcji Optivum firmy VULCAN') === true ||
        description?.includes('Plan lekcji w szkole') === true ||
        $('a[href="http://www.vulcan.edu.pl/dla_szkol/optivum/plan_lekcji/Strony/wstep.aspx"]').length !== 0
    );
}

export function checkOptivumCandidate(url: string, rspoId: number) {
    const timetable = new Timetable(
        url,
        axios.create({
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        }),
    );
    return timetable.getUnitList().then(async ({ sources, units }) => {
        if (!units.length) {
            console.warn(`\x1b[103m[RSPO: ${rspoId.toString()}] Empty optivum cantidate list, url: ${url}\x1b[0m`)
            return;
        }
        const listJSON = JSON.stringify(units);
        return await pushOptivumCandidate(rspoId, sources, listJSON);
    })
    // eslint-disable-next-line @typescript-eslint/use-unknown-in-catch-callback-variable
    .catch((err: Error) => { console.warn(`\x1b[33m[RSPO: ${rspoId.toString()}] Error during getting unit list message: ${err.message} url: ${url}\x1b[0m`) });
}
