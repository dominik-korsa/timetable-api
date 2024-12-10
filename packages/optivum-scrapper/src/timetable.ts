/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Axios } from 'axios';
import { Unit, UnitType } from './types.js';
import { getDocument, parseUnitLink } from './utils.js';
import { isDefined } from '@timetable-api/common';

export class Timetable {
    private baseUrl: string;
    private readonly axios: Axios;

    constructor(baseUrl: string, axios: Axios) {
        this.baseUrl = baseUrl;
        this.axios = axios;
    }

    async fetchDocument(path: string) {
        const url = new URL(path, this.baseUrl).toString();
        const response = await this.axios.get<string>(url);
        return {
            response: response.data,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            responseUrl: (response.request.res.responseUrl as string | null) ?? url,
        };
    }

    async getUnitHTML(type: UnitType, id: string) {
        const { response } = await this.fetchDocument(`plany/${type}${id}.html`);
        return response;
    }

    static readonly indexPageAnchorRegex = /<a href="(.*?)">Plan lekcji<\/a>/;
    private async getIndexPageFromScript() {
        const { response: scriptResponse } = await this.fetchDocument('../scripts/powrot.js');
        return await this.fetchDocument(Timetable.indexPageAnchorRegex.exec(scriptResponse)?.[1] ?? '../index.html');
    }

    private async getListPageFromFrame(frame: HTMLFrameElement) {
        return await this.fetchDocument(frame.src);
    }

    async getUnitList() {
        const { response, responseUrl } = await this.fetchDocument(this.baseUrl);
        this.baseUrl = responseUrl;
        let document = getDocument(response);

        if (document.querySelector('script[src="../scripts/powrot.js"]')) {
            const { response, responseUrl } = await this.getIndexPageFromScript();
            this.baseUrl = responseUrl;
            document = getDocument(response);
        }

        if (document.querySelector('.menu')) return await this.handleMulitpageUnitList(document);

        const frame = document.querySelector<HTMLFrameElement>('frame[name="list"][src]');
        if (frame) {
            const { response, responseUrl } = await this.getListPageFromFrame(frame);
            this.baseUrl = responseUrl;
            document = getDocument(response);
        }

        return { units: Timetable.parseUnitList(document), sources: [this.baseUrl] };
    }

    private async handleMulitpageUnitList(document: Document) {
        const units: Unit[] = [];
        const sources: string[] = [];
        await Promise.all(
            [...document.querySelectorAll<HTMLAnchorElement>('.menu a[href]')].map(async (listLink) => {
                const { response, responseUrl } = await this.fetchDocument(listLink.href);
                const listDocument = getDocument(response);
                units.push(...Timetable.parseUnitList(listDocument));
                sources.push(responseUrl);
            }),
        );
        sources.sort();
        return { units, sources };
    }

    private static readonly parseUnitList = (document: Document) =>
        document.querySelector('select') ? Timetable.parseSelectList(document) : Timetable.parseNormalList(document);

    private static readonly parseSelectList = (document: Document) =>
        [...document.querySelectorAll<HTMLSelectElement>('select[name]')].flatMap((selectEl) => {
            const type = selectEl.name[0];
            if (!['o', 'n', 's'].includes(type)) throw new Error('Unknown type');
            return [...selectEl.querySelectorAll<HTMLOptionElement>('option[value]')].map((optionEl) => ({
                id: optionEl.value,
                type: type as UnitType,
            }));
        });

    private static readonly parseNormalList = (document: Document) =>
        [...document.querySelectorAll('a[href]')].map(parseUnitLink).filter(isDefined);
}
