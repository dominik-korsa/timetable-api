/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Axios, AxiosResponse } from 'axios';
import { AxiosCacheInstance } from 'axios-cache-interceptor';
import { JSDOM } from 'jsdom';
import { Table } from './table.js';
import { Unit, UnitType } from './types.js';
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

    public async getTable(symbol: string, id: string): Promise<Table> {
        const { response } = await this.getDocument(`plany/${symbol}${id}.html`);
        return new Table(response);
    }

    private async getIndexPageFromScript() {
        const scriptResponse = (await this.getDocument('../scripts/powrot.js')).response;
        const { response, responseUrl } = await this.getDocument(
            /<a href="(.*?)">Plan lekcji<\/a>/.exec(scriptResponse)?.[1] ?? '../index.html',
        );
        return [response, responseUrl];
    }

    private async getListPageFromFrame(frame: Element) {
        const listPath = frame.getAttribute('src')!;
        const { response, responseUrl } = await this.getDocument(listPath);
        return [response, responseUrl];
    }

    public async getUnitList(): Promise<{ units: Unit[]; sources: string[] }> {
        const { response } = await this.getDocument(this.baseUrl);
        let document = new JSDOM(response).window.document;
        if (document.querySelector('script[src="../scripts/powrot.js"]') !== null) {
            const [response, responseUrl] = await this.getIndexPageFromScript();
            this.baseUrl = responseUrl;
            document = new JSDOM(response).window.document;
        }
        if (document.querySelector('.menu') !== null) {
            const list: { units: Unit[]; sources: string[] } = { units: [], sources: [] };
            await Promise.all(
                [...document.querySelectorAll('a[hidefocus="true"][href]')].map(async (listLink) => {
                    const href = listLink.getAttribute('href')!;
                    const { response, responseUrl } = await this.getDocument(href);
                    const unitList = this.parseUnitList(response);
                    list.units.push(...unitList);
                    list.sources.push(responseUrl);
                }),
            );
            list.sources.sort();
            return list;
        }
        const frame = document.querySelector('frame[name="list"][src]');
        if (frame) {
            const [response, responseUrl] = await this.getListPageFromFrame(frame);
            this.baseUrl = responseUrl;
            document = new JSDOM(response).window.document;
        }
        return { units: this.parseUnitList(document.documentElement.innerHTML), sources: [this.baseUrl] };
    }

    public parseUnitList(html: string): Unit[] {
        const document: Document = new JSDOM(html).window.document;
        let units: { type: UnitType; id: string; fullName: string }[];
        if (document.querySelector('select')) {
            units = [...document.querySelectorAll('select')].flatMap((select) => {
                const type = select.querySelector('option:first-child')?.textContent?.[0];
                if (type !== 'o' && type !== 'n' && type !== 's') throw new Error('Unknown type');
                return [...select.querySelectorAll('option:not(:first-child)')].map((option) => {
                    const id = option.getAttribute('value');
                    if (id === null) throw new Error('Missing option value');
                    return {
                        id,
                        type,
                        fullName: option.textContent ?? '',
                    };
                });
            });
        } else {
            const links = document.querySelectorAll('a');
            units = [...links]
                .map((link) => {
                    const parsedLink = parseUnitLink(link);
                    return parsedLink
                        ? { id: parsedLink.id, type: parsedLink.type, fullName: link.textContent! }
                        : null;
                })
                .filter(isDefined);
        }
        return units;
    }
}
