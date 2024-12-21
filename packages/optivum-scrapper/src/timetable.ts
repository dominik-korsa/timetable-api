/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Axios } from 'axios';
import { ClientLesson, CommonGroup, Day, LessonTimeSlot, TimeSlot, Unit, UnitList, UnitType } from './types.js';
import { DefaultsMap, getDocument, parseUnitLink } from './utils.js';
import { isDefined } from '@timetable-api/common';
import { Table } from './table.js';
import { createHash } from 'crypto';
import { formatResult } from './format.js';

export class Timetable {
    private baseUrl: string;
    private readonly axios: Axios;
    private unitListPromise: Promise<UnitList> | null;
    private unitHTMLsPromise: Promise<(Unit & { html: string })[]> | null;

    constructor(baseUrl: string, axios: Axios, unitList?: UnitList, unitHTMLs?: (Unit & { html: string })[]) {
        this.baseUrl = baseUrl;
        this.axios = axios;
        this.unitListPromise = unitList ? Promise.resolve(unitList) : null;
        this.unitHTMLsPromise = unitHTMLs ? Promise.resolve(unitHTMLs) : null;
    }

    private async fetchDocument(path: string) {
        const url = new URL(path, this.baseUrl).toString();
        const response = await this.axios.get<string>(url);
        return {
            response: response.data,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            responseUrl: (response.request.res.responseUrl as string | null) ?? url,
        };
    }

    getUnitList() {
        if (!this.unitListPromise) this.unitListPromise = this.fetchAndParseUnitList();
        return this.unitListPromise;
    }

    private async fetchAndParseUnitList() {
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

    static readonly indexPageAnchorRegex = /<a href="(.*?)">Plan lekcji<\/a>/;
    private async getIndexPageFromScript() {
        const { response: scriptResponse } = await this.fetchDocument('../scripts/powrot.js');
        return await this.fetchDocument(Timetable.indexPageAnchorRegex.exec(scriptResponse)?.[1] ?? '../index.html');
    }

    private async getListPageFromFrame(frame: HTMLFrameElement) {
        return await this.fetchDocument(frame.src);
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

    private async getUnitHTMLs() {
        if (!this.unitHTMLsPromise) this.unitHTMLsPromise = this.fetchUnitHTMLs();
        return this.unitHTMLsPromise;
    }

    private async fetchUnitHTMLs() {
        const unitList = await this.getUnitList();
        return await Promise.all(
            unitList.units.map(async ({ type, id }) =>
                this.fetchUnitHTML(type, id).then((html) => ({ type, id, html })),
            ),
        );
    }

    private async fetchUnitHTML(type: UnitType, id: string) {
        const { response } = await this.fetchDocument(`plany/${type}${id}.html`);
        return response;
    }

    async getHash() {
        const unitHTMLs = await this.getUnitHTMLs();
        return createHash('sha512')
            .update(JSON.stringify([...unitHTMLs.values()].sort()))
            .digest('hex');
    }

    async parse() {
        const unitHTMLs = await this.getUnitHTMLs();
        let generatedDate: string | null = null;
        let validFrom: string | null = null;
        const unitFullNames = new Map<string, string>();
        let classShorts = new Map<string, string>();
        let teacherShorts = new Map<string, string>();
        let roomShorts = new Map<string, string>();
        let days: Day[] = [];
        let timeSlots: TimeSlot[] = [];
        let subjects = new Set<string>();
        const interclassGroups = new Map<string, string[]>();
        let commonGroups = new Map<string, CommonGroup>();
        const lessons = new DefaultsMap<string, ClientLesson[]>(() => []);

        unitHTMLs.forEach((unit) => {
            const table = new Table(unit.html, unit.id, unit.type);

            unitFullNames.set(unit.type + unit.id, table.getTitle());

            if (generatedDate === null) {
                generatedDate = table.getGeneratedDate();
                validFrom = table.getValidationDate();
                days = table.getDays();
            }
            if (table.getRowsLength() > timeSlots.length) timeSlots = table.getTimeSlots();

            const parsedTable = table.parseMainTable();

            parsedTable.subjects.forEach((subjectId) => subjects.add(subjectId));
            parsedTable.classShorts.forEach((short, id) => classShorts.set(id, short));
            parsedTable.teacherShorts.forEach((short, id) => teacherShorts.set(id, short));
            parsedTable.roomShorts.forEach((short, id) => roomShorts.set(id, short));
            parsedTable.groups.forEach((value, id) => commonGroups.set(id, value));
            
            parsedTable.interclassGroupIds.forEach((id) => {
                const existingInterclassGroup = interclassGroups.get(id);
                if (existingInterclassGroup) existingInterclassGroup.push(unit.id);
                else interclassGroups.set(id, [unit.id]);
            });

            parsedTable.lessons.forEach((lesson) => Timetable.handleLesson(unit, lesson, lessons));
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (generatedDate === null) throw new Error('Missing generated date');

        return formatResult(
            days,
            timeSlots,
            classShorts,
            teacherShorts,
            roomShorts,
            unitFullNames,
            interclassGroups,
            subjects,
            commonGroups,
            lessons,
            generatedDate,
            validFrom,
        );
    }

    private static handleLesson(unit: Unit, lesson: LessonTimeSlot, lessons: DefaultsMap<string, ClientLesson[]>) {
        const timeSlotLessons = lessons.get(`${lesson.dayIndex.toString()}|${lesson.timeSlotIndex.toString()}`);

        if (lesson.type === 'comment') return timeSlotLessons.push({ type: 'comment', comment: lesson.comment });

        const isMatchingLesson = (existingLesson: ClientLesson): boolean => {
            // Comment
            if (existingLesson.type === 'comment') return false;

            // Lessons without interclass groups (by teacher)
            if (lesson.teacherId !== null && existingLesson.teacherId !== null)
                return lesson.teacherId === existingLesson.teacherId;

            // Interclass groups
            if (lesson.subjectId !== existingLesson.subjectId) return false;
            // Interclass groups: class tables
            if (lesson.interclassGroupId !== null && existingLesson.interclassGroupId !== null)
                return lesson.interclassGroupId === existingLesson.interclassGroupId;
            // Interclass groups: teacher tables
            if (unit.type !== UnitType.CLASS)
                return [...existingLesson.classIds.values()].find((classId) => lesson.classIds.has(classId));
            
            return false;
        };
        const existingLesson = timeSlotLessons.find(isMatchingLesson);

        if (!existingLesson)
            return timeSlotLessons.push({
                type: 'default',
                classIds: lesson.classIds,
                teacherId: lesson.teacherId,
                roomId: lesson.roomId,
                subjectId: lesson.subjectId,
                interclassGroupId: lesson.interclassGroupId,
                groupIds: lesson.groupIds,
            });
        if (existingLesson.type === 'comment') return;

        if (
            existingLesson.interclassGroupId !== null &&
            unit.type === UnitType.TEACHER &&
            existingLesson.teacherId === null
        )
            existingLesson.teacherId = unit.id;
        else if (lesson.interclassGroupId !== null && existingLesson.interclassGroupId === null)
            existingLesson.interclassGroupId = lesson.interclassGroupId;
        lesson.classIds.forEach((classId) => existingLesson.classIds.add(classId));
        lesson.groupIds.forEach((groupId) => existingLesson.groupIds.add(groupId));
    }
}
