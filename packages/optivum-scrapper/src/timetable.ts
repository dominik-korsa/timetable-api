import { Axios, AxiosResponse } from 'axios';
import { AxiosCacheInstance } from 'axios-cache-interceptor';
import { JSDOM } from 'jsdom';
import { Table } from './table.js';
import { UnitList } from './types.js';
import { parseUnitLink, parseUnitUrl } from './utils.js';
import { isDefined } from '@timetable-api/common';

export class Timetable {
    private readonly baseUrl: string;
    private readonly axios: Axios | AxiosCacheInstance;

    constructor(baseUrl: string, axios: Axios | AxiosCacheInstance) {
        this.baseUrl = baseUrl;
        this.axios = axios;
    }

    private async getDocument(path: string): Promise<{
        response: string;
        url: string;
    }> {
        const url = new URL(path, this.baseUrl).toString();
        const response: AxiosResponse = await this.axios.get(url, {
            headers: {
                'User-Agent': 'Timetable-Api',
            },
            cache: false,
        });
        return {
            response: response.data as string,
            // TODO: Return final redirect URL
            url: response.request,
        };
    }

    public async getTable(symbol: string, id: number) {
        const { response } = await this.getDocument(`/plany/${symbol}${id}.html`);
        return new Table(response);
    }

    public async getUnitIds(): Promise<UnitList> {
        const { response } = await this.getDocument(this.baseUrl);
        let document = new JSDOM(response).window.document;
        let url = this.baseUrl;
        if (document.querySelector('script[src="../scripts/powrot.js"]') !== null) {
            url = this.baseUrl.split('/plany/')[0] + '/index.html';
            const { response } = await this.getDocument(url);
            document = new JSDOM(response).window.document;
        }
        if (document.querySelector('.menu') !== null) {
            const list: UnitList = { classIds: [], teacherIds: [], roomIds: [] };
            await Promise.all(
                [...document.querySelectorAll('a[hidefocus="true"]')].map(async (listLink) => {
                    const href = listLink.getAttribute('href');
                    if (href == null) return;
                    const { response } = await this.getDocument(href);
                    const unitList = this.parseUnitList(response);
                    list.classIds.push(...unitList.classIds);
                    list.classIds.push(...unitList.teacherIds);
                    list.classIds.push(...unitList.roomIds);
                }),
            );
            return list;
        }
        if (document.querySelector('frame')) {
            // TODO: Handle cases, where the base URL does not end with index.html
            const { response } = await this.getDocument(url.replace('index.html', 'lista.html'));
            document = new JSDOM(response).window.document;
        }
        return this.parseUnitList(document.documentElement.innerHTML);
    }

    public parseUnitList(html: string) {
        const document: Document = new JSDOM(html).window.document;
        let units: { id: number; type: string }[];
        if (document.querySelector('select')) {
            const selectElements = document.querySelectorAll('select');
            units = [...selectElements].map((selectElement) => parseUnitUrl(selectElement.value)).filter(isDefined);
        } else {
            const links = document.querySelectorAll('a');
            units = [...links].map((link) => parseUnitLink(link)).filter(isDefined);
        }
        return {
            classIds: units.filter((unit) => unit.type === 'o').map((unit) => unit.id),
            teacherIds: units.filter((unit) => unit.type === 'n').map((unit) => unit.id),
            roomIds: units.filter((unit) => unit.type === 's').map((unit) => unit.id),
        };
    }
}
