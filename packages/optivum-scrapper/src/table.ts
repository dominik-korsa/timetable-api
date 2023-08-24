import { slugify } from '@timetable-api/common';
import { parseLesson, parseTime, splitByBr } from './utils.js';
import { JSDOM } from 'jsdom';
import { Lesson, TableData, TimeSlot, Weekday } from './types.js';

export class Table {
    private readonly document;
    private readonly mainTable;
    private readonly rows;

    constructor(html: string) {
        this.document = new JSDOM(html).window.document;
        const mainTable = this.document.querySelector('.tabela');
        if (!mainTable) {
            throw new Error(`Element table.tabela not found ${html}`);
        }
        this.mainTable = mainTable;
        this.rows = this.mainTable.querySelectorAll('tr:not(:first-of-type)');
    }

    static readonly weekdayIsoNumber: Record<string, number> = {
        poniedzialek: 1,
        wtorek: 2,
        sroda: 3,
        czwartek: 4,
        piatek: 5,
        sobota: 6,
        niedziela: 7,
    };

    public getFullName(): string | undefined {
        return /Plan lekcji (?:oddziału|nauczyciela|sali) - (.+?)/.exec(this.document.title)?.[0];
    }

    public getGenerationDate(): string | undefined {
        return /<td align="right">\nwygenerowano(.+?)<br>\nza pomocą programu/
            .exec(this.document.documentElement.innerHTML.replace(' ', ''))?.[1]
            ?.trim();
    }

    public getValidationDate(): string | undefined {
        return /<td align="left">\nObowiązuje od: (.+?)\n<\/td>/
            .exec(this.document.documentElement.innerHTML.replace(' ', ''))?.[1]
            ?.trim();
    }

    public getTimeSlots(): TimeSlot[] {
        return Array.from(this.mainTable.querySelectorAll('tr:not(:first-of-type)')).map((row, index) => {
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

    public getWeekdays(): Weekday[] {
        return Array.from(this.mainTable.querySelectorAll('tr:first-of-type > th:nth-child(n+3)')).map(
            (weekday, index) => {
                const weekdayName = weekday.textContent?.trim() ?? '-';
                return {
                    index,
                    name: weekdayName,
                    isoNumber: Table.weekdayIsoNumber[slugify(weekdayName)],
                };
            },
        );
    }

    public getLessons(): Lesson[] {
        const lessons: Lesson[] = [];
        this.rows.forEach((row, rowIndex) => {
            row.querySelectorAll('.l').forEach((lessonTag, columnIndex) => {
                const groups = splitByBr(lessonTag)
                    .map(
                        (groupDocument): Lesson => ({
                            rowIndex,
                            columnIndex,
                            ...parseLesson(groupDocument),
                        }),
                    )
                    .filter((group) => group.comment !== null || group.subjectCode !== null);
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
            weekdays: this.getWeekdays(),
            lessons: this.getLessons(),
        };
    }
}
