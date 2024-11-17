import { CheerioAPI } from 'cheerio';

export function isOptivumCandidate($: CheerioAPI) {
    const description = $('meta[name="description"]').attr('content');
    return (
        description?.includes('programu Plan lekcji Optivum firmy VULCAN') === true ||
        description?.includes('Plan lekcji w szkole') === true ||
        $('a[href="http://www.vulcan.edu.pl/dla_szkol/optivum/plan_lekcji/Strony/wstep.aspx"]').length !== 0
    );
}
