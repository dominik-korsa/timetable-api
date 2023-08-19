import {Axios} from 'axios';
import {TimetableList} from "@wulkanowy/timetable-parser";
import {AxiosCacheInstance} from "axios-cache-interceptor";
import {TimetableTimeSlot, TimetableVersionData} from '@timetable-api/common';
import {JSDOM} from 'jsdom';

interface ListResponse {
    classIds: string[];
    teacherIds: string[];
    roomIds: string[];
}

export class OptivumParser {
    private readonly baseUrl: string;
    private readonly axios: Axios | AxiosCacheInstance;

    private async getDocument(path: string): Promise<string> {
        const response = await this.axios.get(new URL(path, this.baseUrl).toString(), {
            responseType: 'document',
            headers: {
                "User-Agent": 'Timetable-Api'
            },
            cache: false
        });
        return response.data as string;
    }

    constructor(baseUrl: string, axios: Axios | AxiosCacheInstance) {
        this.baseUrl = baseUrl;
        this.axios = axios;
    }

    private async parseList(path: string): Promise<ListResponse | null> {
        try {
            const response = await this.getDocument(path);
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

    private async parseTable(id: string): Promise<{
        timeSlots: TimetableTimeSlot[],
    }> {
        const response = await this.getDocument(`plany/${id}.html`);
        // const table = new Table(response);
        // table.getDays();
        // table.getTitle();
        // table.getDays();
        // table.getHours();
        const document = new JSDOM(response).window.document;
        const mainTable = document.querySelector('table.tabela > tbody');
        if (!mainTable) throw new Error(`Element table.tabela not found in plany/${id}.html`)
        const rows = mainTable.querySelectorAll('tr:not(:first-of-type)');
        return {
            timeSlots: [...rows].map((row, index) => {
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
        }
    }

    async parse(): Promise<TimetableVersionData> {
        const start = Date.now();
        const items = await this.parseList('lista.html');
        if (!items) throw new Error('Failed to load lista.html');

        let timeSlotsLongest: TimetableTimeSlot[] = [];

        await Promise.all([
            ...items.classIds.map(async (item) => {
                const parsed = await this.parseTable(`o${item}`)
                if (parsed.timeSlots.length > timeSlotsLongest.length) timeSlotsLongest = parsed.timeSlots;
            }),
            ...items.teacherIds.map(async (item) => {
                const parsed = await this.parseTable(`n${item}`);
                if (parsed.timeSlots.length > timeSlotsLongest.length) timeSlotsLongest = parsed.timeSlots;
            }),
            ...items.roomIds.map(async (item) => {
                const parsed = await this.parseTable(`s${item}`);
                if (parsed.timeSlots.length > timeSlotsLongest.length) timeSlotsLongest = parsed.timeSlots;
            }),
        ]);

        try {
            return {
                common: {
                    classes: [],
                    rooms: [],
                    teachers: [],
                    timeSlots: timeSlotsLongest,
                    weekdays: [],
                }
            }
        } finally {
            console.log(`Done in ${Date.now() - start}ms`);
        }
    }
}
