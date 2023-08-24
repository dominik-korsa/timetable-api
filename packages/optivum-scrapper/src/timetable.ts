import { Axios, AxiosResponse } from 'axios';
import { AxiosCacheInstance } from 'axios-cache-interceptor';
import { JSDOM } from 'jsdom';
import { extractUnitSymbolAndIdFromUrl } from './utils.js';
import { Table } from './table.js';
import { UnitList } from './types.js';

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
            url,
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
        if (document.querySelector('script[src="../scripts/powrot.js"]')) {
            url = this.baseUrl.split('/plany/')[0] + '/index.html';
            const { response } = await this.getDocument(url);
            document = new JSDOM(response).window.document;
        }
        if (document.querySelector('.menu')) {
            let list: UnitList = { classIds: [], teacherIds: [], roomIds: [] };
            Array.from(document.querySelectorAll('a[hidefocus="true"]')).forEach(async (listLink) => {
                const href = listLink.getAttribute('href');
                if (href) {
                    const { response } = await this.getDocument(listLink.getAttribute('href') ?? '');
                    list = { ...list, ...this.parseUnitList(response) };
                }
            });
            return list;
        }
        if (document.querySelector('frame')) {
            const { response } = await this.getDocument(url.replace('index.html', 'lista.html'));
            document = new JSDOM(response).window.document;
        }
        return this.parseUnitList(document.documentElement.innerHTML);
    }

    public parseUnitList(html: string) {
        const document: Document = new JSDOM(html).window.document;
        let units: { id: number; symbol: string }[];
        if (document.querySelector('select')) {
            const selectElements = document.querySelectorAll('select');
            units = Array.from(selectElements).map((selectElement) => {
                return {
                    id: Number(selectElement.value.match('(o|n|s)([0-9])')?.[2] ?? '0'),
                    symbol: selectElement.value.match('(o|n|s)([0-9])')?.[1] ?? '',
                };
            });
        } else {
            const links = document.querySelectorAll('a');
            units = Array.from(links).map((link) => {
                return {
                    id: Number(extractUnitSymbolAndIdFromUrl(link.href)?.[2] ?? '0'),
                    symbol: extractUnitSymbolAndIdFromUrl(link.href)?.[1] ?? '',
                };
            });
        }
        return {
            classIds: units.filter((unit) => unit.symbol === 'o').map((unit) => unit.id),
            teacherIds: units.filter((unit) => unit.symbol === 'n').map((unit) => unit.id),
            roomIds: units.filter((unit) => unit.symbol === 's').map((unit) => unit.id),
        };
    }
}
