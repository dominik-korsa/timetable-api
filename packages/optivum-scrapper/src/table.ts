import { slugify } from '@timetable-api/common';
import { parseLesson, parseTime, splitByBr } from './utils.js';
import { JSDOM } from 'jsdom';
import { LessonTimeSlot, TableData, TimeSlot, Day } from './types.js';

export class Table {
    private readonly document;
    private readonly mainTable;
    private readonly rows;
    private readonly documentInnerHtml;

    constructor(html: string) {
        this.document = new JSDOM(html).window.document;
        const mainTable = this.document.querySelector('.tabela');
        if (!mainTable) {
            throw new Error(`Element table.tabela not found ${html}`);
        }
        this.mainTable = mainTable;
        this.rows = mainTable.querySelectorAll('tr:not(:first-of-type)');
        this.documentInnerHtml = this.document.documentElement.innerHTML.replace(' ', '');
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

    public getFullName = (): string => this.document.querySelector('span.tytulnapis')?.textContent ?? '';

    public getHtml = (): string => this.document.body.innerHTML;

    public getGenerationDate = (): string =>
        /<td align="right">\nwygenerowano(.+?)<br>\nza pomocą programu/.exec(this.documentInnerHtml)?.[1]?.trim() ?? '';

    public getValidationDate = (): string | undefined =>
        /<td align="left">\nObowiązuje od: (.+?)\n<\/td>/.exec(this.documentInnerHtml)?.[1]?.trim();

    public getTimeSlots(): TimeSlot[] {
        return [...this.mainTable.querySelectorAll('tr:not(:first-of-type)')].map((row, index) => {
            const name = row.querySelector('td.nr')?.textContent?.trim();
            const timeSpan = row.querySelector('td.g')?.textContent?.trim();
            if (name === undefined || timeSpan === undefined) {
                throw new Error('Missing time slot name or time span');
            }
            const [beginMinute, endMinute] = timeSpan.split('-').map((time) => parseTime(time));
            return {
                index,
                name,
                beginMinute,
                endMinute,
            };
        });
    }

    public getDays(): Day[] {
        return [...this.mainTable.querySelectorAll('tr:first-of-type > th:nth-child(n+3)')].map((day, index) => {
            const dayName = day.textContent?.trim() ?? '-';
            return {
                index,
                name: dayName,
                isoNumber: Table.weekdayIsoNumber[slugify(dayName)] ?? null,
            };
        });
    }

    public getLessons(): LessonTimeSlot[] {
        const lessons: LessonTimeSlot[] = [];
        this.rows.forEach((row, timeSlotIndex) => {
            row.querySelectorAll('.l').forEach((lessonTag, dayIndex) => {
                const groups = splitByBr(lessonTag)
                    .map((groupDocument) => ({
                        timeSlotIndex,
                        dayIndex,
                        lesson: parseLesson(groupDocument),
                    }))
                    .filter(
                        ({ lesson }) =>
                            (lesson.comment !== null && lesson.comment !== '') || lesson.subjectCode !== null,
                    );
                lessons.push(...groups);
            });
        });
        return lessons;
    }

    public getData(): TableData {
        return {
            fullName: this.getFullName(),
            generationDate: this.getGenerationDate(),
            validationDate: this.getValidationDate(),
            timeSlots: this.getTimeSlots(),
            days: this.getDays(),
            lessons: this.getLessons(),
        };
    }
}
