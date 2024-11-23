export function getEdupageInstance(html: string) {
    return /ASC.req_props={"edupage":"(.*?)"/.exec(html)?.[1] ?? null;
}
