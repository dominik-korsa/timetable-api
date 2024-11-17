export function areUrlsEqualIgnoringQuery(url1: string, url2: string) {
    const parsedUrl1 = new URL(url1);
    const parsedUrl2 = new URL(url2);

    return (
        parsedUrl1.host === parsedUrl2.host &&
        parsedUrl1.pathname.replace(/^.+\.\/$/gm, '') === parsedUrl2.pathname.replace(/^.+\.\/$/gm, '')
    );
}
