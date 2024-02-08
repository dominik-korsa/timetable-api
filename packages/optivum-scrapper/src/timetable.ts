import { Axios, AxiosResponse } from 'axios';
import { AxiosCacheInstance } from 'axios-cache-interceptor';
import { JSDOM } from 'jsdom';
import { Table } from './table.js';
import { UnitList } from './types.js';
import { parseUnitLink, parseUnitUrl } from './utils.js';
import { isDefined } from '@timetable-api/common';

export class Timetable {
    private baseUrl: string;
    private readonly axios: Axios | AxiosCacheInstance;

    constructor(baseUrl: string, axios: Axios | AxiosCacheInstance) {
        this.baseUrl = baseUrl;
        this.axios = axios;
    }

    private async getDocument(path: string): Promise<{
        response: string;
        responseUrl: string;
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
            responseUrl: response.config.url ?? url,
        };
    }

    public async getTable(symbol: string, id: number): Promise<Table> {
        const { response } = await this.getDocument(`plany/${symbol}${id}.html`);
        return new Table(response);
    }

    public async getUnitIds(): Promise<UnitList> {
        const { response, responseUrl } = await this.getDocument(this.baseUrl);
        this.baseUrl = responseUrl;
        let document = new JSDOM(response).window.document;
        if (document.querySelector('script[src="../scripts/powrot.js"]') !== null) {
            const scriptResponse = (await this.getDocument('../scripts/powrot.js')).response;
            const { response, responseUrl } = await this.getDocument(
                /<a href="(.*?)">Plan lekcji<\/a>/.exec(scriptResponse)?.[0] ?? '../index.html',
            );
            this.baseUrl = responseUrl;
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
                    list.teacherIds.push(...unitList.teacherIds);
                    list.roomIds.push(...unitList.roomIds);
                }),
            );
            return list;
        }
        if (document.querySelector('frame[name="list"]')) {
            const { response } = await this.getDocument(
                document.querySelector('frame[name="list"]')?.getAttribute('src') ?? 'lista.html',
            );
            document = new JSDOM(response).window.document;
        }
        return this.parseUnitList(document.documentElement.innerHTML);
    }

    public parseUnitList(html: string): UnitList {
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
