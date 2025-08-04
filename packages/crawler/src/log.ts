export default {
    foundEdupageInstance: (rspoId: number, instance: string) => {
        console.log(`\x1b[44m[RSPO: ${rspoId.toString().padStart(6)}] Found an edupage instance '${instance}'.\x1b[0m`);
    },
    reachedPageLimit: (rspoId: number, pageCountLimit: number) => {
        console.warn(
            `\x1b[33m[RSPO: ${rspoId.toString().padStart(6)}] Reached checked page limit (${pageCountLimit.toString()}).\x1b[0m`,
        );
    },
    foundOptivumCandidate: (rspoId: number, url: string) => {
        console.log(`\x1b[42m[RSPO: ${rspoId.toString().padStart(6)}] Found an optivum candidate at '${url}'.\x1b[0m`);
    },
    analyzingPageError: (rspoId: number, url: string, message: string) => {
        console.warn(
            `\x1b[33m[RSPO: ${rspoId.toString().padStart(6)}] An error has occurred during analyzing page '${url}'.\nMessage: '${message}'\x1b[0m`,
        );
    },
    optivumEmptyList: (rspoId: number, url: string) => {
        console.warn(`\x1b[103m[RSPO: ${rspoId.toString().padStart(6)}] Empty optivum cantidate list. url: '${url}'\x1b[0m`);
    },
    optivumGettingListFailed: (rspoId: number, url: string, message: string | null) => {
        console.warn(
            `\x1b[33m[RSPO: ${rspoId.toString().padStart(6)}] (OPTIVUM) An error has occurred during getting unit list at '${url}.'\n${message !== null ? `Message: '${message}'` : 'No message'}\x1b[0m)`,
        );
    },
    crawledWebsite: (rspoId: number, processedPagesCount: number, counter: number, total: number) => {
        console.log(`[RSPO: ${rspoId.toString().padStart(6)}] Done! Processed ${processedPagesCount.toString().padStart(2)} pages. ${counter.toString().padStart(5)}/${total.toString().padStart(5)} (${(counter / total * 100).toFixed(2).padStart(6)}%), ${(process.memoryUsage.rss() / 1000000).toFixed(0).padStart(8)} MB RAM`)
    },
    crawlingError: (rspoId: number, message: string | null) => {
        console.warn(`\x1b[33m[RSPO: ${rspoId.toString().padStart(6)}] An error has occurred during crawling website.\n${message !== null ? `Message: '${message}'` : 'No message'}\x1b[0m`);
    }
};
