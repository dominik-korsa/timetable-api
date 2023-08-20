import {Axios} from 'axios';
import {TimetableList} from "@wulkanowy/timetable-parser";
import {AxiosCacheInstance} from "axios-cache-interceptor";
import {slugify, TimetableTimeSlot, TimetableVersionData, TimetableWeekday} from '@timetable-api/common';
import {JSDOM} from 'jsdom';
import { createHash } from 'node:crypto';

function calculateHash(document: string): string {
    const hash = createHash('sha256');
    hash.update(document);
    return hash.digest('base64');
}

interface ListResponse {
    classIds: string[];
    teacherIds: string[];
    roomIds: string[];
}

interface ParsedTable {
    timeSlotCount: number,
    getTimeSlots: () => TimetableTimeSlot[],
    getWeekdays: () => TimetableWeekday[],
}

export class OptivumParser {
    private readonly baseUrl: string;
    private readonly axios: Axios | AxiosCacheInstance;

    private async getDocument(path: string): Promise<{
        response: string,
        url: string,
    }> {
        const url = new URL(path, this.baseUrl).toString();
        const response = await this.axios.get(url, {
            responseType: 'document',
            headers: {
                "User-Agent": 'Timetable-Api'
            },
            cache: false
        });
        return {
            response: response.data as string,
            url,
        };
    }

    constructor(baseUrl: string, axios: Axios | AxiosCacheInstance) {
        this.baseUrl = baseUrl;
        this.axios = axios;
    }

    private async parseList(path: string): Promise<ListResponse | null> {
        try {
            const { response } = await this.getDocument(path);
            const list = new TimetableList(response).getList();
            return {
                classIds: list.classes.map((item) => item.value),
                roomIds: list.rooms?.map((item) => item.value) ?? [],
                teacherIds: list.teachers?.map((item) => item.value) ?? [],
            }
        } catch (error) {
            console.warn(error);
            return null;
        }
    }

    private static parseTime(value: string): number {
        const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
        return hours * 60 + minutes;
    }

    static readonly weekdayNames: Record<string, TimetableWeekday> = {
        poniedzialek: {name: 'poniedziałek', isoNumber: 1},
        wtorek: {name: 'wtorek', isoNumber: 2},
        sroda: {name: 'środa', isoNumber: 3},
        czwartek: {name: 'czwartek', isoNumber: 4},
        piatek: {name: 'piątek', isoNumber: 5},
        sobota: {name: 'sobota', isoNumber: 6},
        niedziela: {name: 'niedziela', isoNumber: 7},
    };

    private async parseTable(id: string): Promise<ParsedTable> {
        const { response } = await this.getDocument(`plany/${id}.html`);
        const document = new JSDOM(response).window.document;
        const mainTable = document.querySelector('table.tabela > tbody');
        if (!mainTable) throw new Error(`Element table.tabela not found in plany/${id}.html`)
        const rows = mainTable.querySelectorAll('tr:not(:first-of-type)');
        return {
            timeSlotCount: rows.length,
            getTimeSlots: () => [...rows].map((row, index) => {
                const timeSpan = row.querySelector('td.g')?.textContent;
                if (!timeSpan) throw new Error(`Cannot find time range for lesson in plany/${id}.html`);
                const [beginMinute, endMinute] = timeSpan.split('-')
                    .map((part) => OptivumParser.parseTime(part.trim()))
                return ({
                    name: row.querySelector('td.nr')?.textContent ?? `#${index.toString(10)}`,
                    beginMinute,
                    endMinute,
                });
            }),
            getWeekdays: () => {
                const headers = [...mainTable.querySelectorAll('tr:first-of-type > th:nth-child(n+3)')];
                return headers.map((item) => {
                    const weekdayName = item.textContent?.trim() ?? '-';
                    return OptivumParser.weekdayNames[slugify(weekdayName)] ?? {
                        name: weekdayName,
                        isoNumber: null,
                    };
                });
            }
        }
    }

    async parse(): Promise<{
        data: TimetableVersionData,
    }> {
        const start = Date.now();
        const items = await this.parseList('lista.html');
        if (!items) throw new Error('Failed to load lista.html');

        const [
            classTables,
            teacherTables,
            roomTables
        ] = await Promise.all([
            Promise.all(items.classIds.map((item) => this.parseTable(`o${item}`))),
            Promise.all(items.teacherIds.map((item) => this.parseTable(`n${item}`))),
            Promise.all(items.roomIds.map((item) => this.parseTable(`s${item}`))),
        ]);
        const tables = [...classTables, ...teacherTables, ...roomTables];

        let timeSlotsLongest: TimetableTimeSlot[] = [];
        tables.forEach((table) => {
           if (table.timeSlotCount > timeSlotsLongest.length) timeSlotsLongest = table.getTimeSlots();
        });

        try {
            return {
                data: {
                    common: {
                        classes: [],
                        rooms: [],
                        teachers: [],
                        timeSlots: timeSlotsLongest,
                        weekdays: tables[0].getWeekdays(),
                    }
                },
            }
        } finally {
            console.log(`Done in ${Date.now() - start}ms`);
        }
    }
}
