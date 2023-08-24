import { slugify } from '@timetable-api/common';
import { parseLesson, parseTime } from './utils.js';
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
        return this.document.title.match('Plan lekcji (?:oddziału|nauczyciela|sali) - (.+?)')?.[0];
    }

    public getGenerationDate(): string | undefined {
        return this.document.documentElement.innerHTML
            .replace(' ', '')
            .match('<td align="right">\nwygenerowano(.+?)<br>\nza pomocą programu')?.[1]
            ?.trim();
    }

    public getValidationDate(): string | undefined {
        return this.document.documentElement.innerHTML
            .replace(' ', '')
            .match('<td align="left">\nObowiązuje od: (.+?)\n</td>')?.[1]
            ?.trim();
    }

    public getTimeSlots(): TimeSlot[] {
        return Array.from(this.mainTable.querySelectorAll('tr:not(:first-of-type)')).map((row, index) => {
            const name = row.querySelector('td.nr')?.textContent?.trim();
            const timeSpan = row.querySelector('td.g')?.textContent?.trim();
            if (!name || !timeSpan) {
                throw new Error('Cośtam cośtam nie chcę mi się pisać');
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
        let lessons: Lesson[] = [];
        this.rows.forEach((row, rowIndex) => {
            row.querySelectorAll('.l').forEach((lessonTag, columnIndex) => {
                const groupHTMLs = lessonTag.innerHTML.split('<br>');
                const groups = groupHTMLs.map((groupHTML): Lesson => {
                    const groupDocument = new JSDOM(groupHTML).window.document;
                    const lessonData = parseLesson(groupDocument);
                    return {
                        rowIndex,
                        columnIndex,
                        ...lessonData,
                    };
                });
                lessons = [...lessons, ...groups.filter((group) => group.comment || group.subjectCode)];
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
