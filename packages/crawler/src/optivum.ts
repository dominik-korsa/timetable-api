import { CheerioAPI } from 'cheerio';
import { OptivumScrapper } from '@timetable-api/optivum-scrapper';
import axios from 'axios';
import { pushOptivumCandidate } from './db.js';

export function isOptivumCandidate($: CheerioAPI) {
    const description = $('meta[name="description"]').attr('content');
    return (
        description?.includes('programu Plan lekcji Optivum firmy VULCAN') === true ||
        description?.includes('Plan lekcji w szkole') === true ||
        $('a[href="http://www.vulcan.edu.pl/dla_szkol/optivum/plan_lekcji/Strony/wstep.aspx"]').length !== 0
    );
}

export function checkOptivumCandidate(url: string, rspoId: number) {
    const scrapper = new OptivumScrapper(url, axios.create());
    return scrapper.getUnitList().then(async ({ sources, list }) => {
        if (!list.length) {
            console.warn(`Empty optivum cantidate list [${rspoId.toString()}, ${url}]`)
            return;
        }
        const listJSON = JSON.stringify(list);
        return await pushOptivumCandidate(rspoId, sources, listJSON);
    })
    .catch(() => { console.log(`Error during getting unit list [${rspoId.toString()}, ${url}]`) });
}
