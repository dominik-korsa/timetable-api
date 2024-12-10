/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { isDefined, parseTime, slugify } from '@timetable-api/common';
import { getDocument, parseUnitLink, splitByBr } from './utils.js';
import { CommonGroup, Day, LessonTimeSlot, ParsedMainTable, TimeSlot, UnitType } from './types.js';

//TODO: Think about groupShort (from subject)

export class Table {
    private readonly document;
    private readonly mainTable;
    private readonly rows;
    private readonly id;
    private readonly type;

    constructor(html: string, id: string, type: UnitType) {
        this.document = getDocument(html);
        const mainTable = this.document.querySelector('table.tabela');
        if (!mainTable) {
            throw new Error(`Element table.tabela not found ${html}`);
        }
        this.mainTable = mainTable;
        this.rows = [...mainTable.querySelectorAll('tr:not(:first-of-type)')];
        this.id = id;
        this.type = type;
    }

    getTitle() {
        const title = this.document.querySelector('span.tytulnapis')?.textContent;
        if (title === undefined || title === null)
            throw new Error('Element span.tytulnapis not found or element does not have content');
        return title;
    }

    static readonly generatedDateTdRegex = /<td align="right">\nwygenerowano(.+?)<br>\nza pomocą programu/;

    getGeneratedDate() {
        const generatedDate = Table.generatedDateTdRegex.exec(this.document.body.innerHTML)?.[1]?.trim();
        if (generatedDate === undefined) throw new Error('Generated date not found');
        return generatedDate;
    }

    static readonly validationDateTdRegex = /<td align="left">\nObowiązuje od: (.+?)\n<\/td>/;

    getValidationDate() {
        return Table.validationDateTdRegex.exec(this.document.body.innerHTML)?.[1]?.trim() ?? null;
    }

    getRowsLength() {
        return this.rows.length;
    }

    static readonly weekdayIsoNumber: Partial<Record<string, number>> = {
        poniedzialek: 1,
        wtorek: 2,
        sroda: 3,
        czwartek: 4,
        piatek: 5,
        sobota: 6,
        niedziela: 7,
    };

    getDays(): Day[] {
        return [...this.mainTable.querySelectorAll('tr:first-of-type > th:nth-child(n+3):not(:empty)')].map((day) => {
            const dayName = day.textContent!.trim();
            return {
                name: dayName,
                isoNumber: Table.weekdayIsoNumber[slugify(dayName)] ?? null,
            };
        });
    }

    getTimeSlots(): TimeSlot[] {
        return this.rows.map((row) => {
            const name = row.querySelector('td.nr')?.textContent?.trim();
            const timeSpan = row.querySelector('td.g')?.textContent?.trim();
            if (name === undefined || timeSpan === undefined) {
                throw new Error('Missing time slot name or time span');
            }
            const [beginMinute, endMinute] = timeSpan.split('-').map((time) => parseTime(time));
            return {
                name,
                beginMinute,
                endMinute,
            };
        });
    }

    parseMainTable(): ParsedMainTable {
        const lessons: LessonTimeSlot[] = [];
        const subjects = new Set<string>();
        const roomShorts = new Map<string, string>();
        const teacherShorts = new Map<string, string>();
        const classShorts = new Map<string, string>();
        const groups = new Map<string, CommonGroup>();
        const interclassGroupIds = new Set<string>();

        this.rows.forEach((row, timeSlotIndex) => {
            row.querySelectorAll('.l').forEach((lessonEl, dayIndex) => {
                lessons.push(
                    ...splitByBr(lessonEl)
                        .map((fragment) => {
                            const subjectElements = [...fragment.querySelectorAll<HTMLSpanElement>('.p')];

                            // Comment
                            if (!subjectElements.length) {
                                const comment = fragment.textContent?.trim();
                                if (comment !== undefined && comment !== '') return { type: 'comment', comment };
                                return;
                            }

                            // Common group short (only class timetables, lesson without interclass group) and subject id
                            let subjectId: string;
                            const groupIds = new Set<string>;
                            if (
                                this.type === UnitType.CLASS &&
                                subjectElements[0].textContent?.includes('-') === true
                            ) {
                                let groupShort: string;
                                [subjectId, groupShort] = subjectElements[0].textContent.split('-');
                                const groupId = `${this.id};${subjectId};${groupShort}`;
                                groups.set(groupId, { classId: this.id, subjectId, groupShort });
                                groupIds.add(groupId);
                            } else subjectId = subjectElements[0].textContent!;
                            subjects.add(subjectId);

                            // Interclass group id (only class timetables)
                            let interclassGroupId: string | null = null;
                            if (this.type === UnitType.CLASS && subjectElements.length === 2) {
                                interclassGroupId = subjectElements[1].textContent!;
                                interclassGroupIds.add(interclassGroupId);
                                // TODO: regex escaping, html
                                const groupShortMatch = new RegExp(`${subjectId}-(.*?) `).exec(fragment.textContent!);
                                const groupShort = groupShortMatch?.[1] ?? null;
                                if (groupShort !== null) {
                                    const groupId = `${this.id};${subjectId};${groupShort}`;
                                    groups.set(groupId, { classId: this.id, subjectId, groupShort });
                                    groupIds.add(groupId);
                                }
                            }

                            // Room
                            let roomId: string | null = null;
                            if (this.type !== UnitType.ROOM) {
                                const roomEl = fragment.querySelector('.s');
                                const roomShort = roomEl?.textContent ?? null;
                                if (roomEl && roomShort !== null && roomShort !== '@') {
                                    roomId = parseUnitLink(roomEl)?.id ?? `@${roomShort};`; //getUnitKey(parseUnitLink(roomEl)?.id ?? null, roomShort);
                                    roomShorts.set(roomId, roomShort);
                                }
                            } else roomId = this.id;

                            // Teacher
                            let teacherId: string | null = null;
                            if (this.type !== UnitType.TEACHER) {
                                const teacherEl = fragment.querySelector('.n');
                                if (teacherEl) {
                                    const teacherShort = teacherEl.textContent!;
                                    teacherId = parseUnitLink(teacherEl)?.id ?? `@${teacherShort}`; // getUnitKey(parseUnitLink(teacherEl)?.id ?? null, teacherShort);
                                    teacherShorts.set(teacherId, teacherShort);
                                }
                            } else teacherId = this.id;

                            // Classes and groups (only teacher and room timetables)
                            const classIds = new Set<string>;
                            if (this.type !== UnitType.CLASS) {
                                [...fragment.querySelectorAll('.o')].forEach((classEl) => {
                                    const classShort = classEl.textContent!;
                                    const classId = parseUnitLink(classEl)?.id ?? `@${classShort}`; //getUnitKey(parseUnitLink(classEl)?.id ?? null, classShort);
                                    classIds.add(classId);
                                    classShorts.set(classId, classShort);

                                    const groupShortMatch = new RegExp(`${classShort}-(.*?)[$|,]`).exec(
                                        fragment.textContent!,
                                    );
                                    const groupShort = groupShortMatch?.[1] ?? null;
                                    if (groupShort !== null) {
                                        const groupId = `${classId};${subjectId};${groupShort}`;
                                        groups.set(groupId, { classId, subjectId, groupShort });
                                        groupIds.add(groupId);
                                    }
                                });
                            } else classIds.add(this.id);

                            return { type: 'default', subjectId, roomId, teacherId, classIds, groupIds, interclassGroupId };
                        })
                        .filter(isDefined)
                        .map((lesson) => ({ timeSlotIndex, dayIndex, ...lesson }) as LessonTimeSlot),
                );
            });
        });
        return { lessons, subjects, roomShorts, teacherShorts, classShorts, groups, interclassGroupIds };
    }
}
