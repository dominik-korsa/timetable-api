import { Axios } from 'axios';
import { Timetable } from './timetable.js';
import { TimetableClass, TimetableLesson, TimetableRoom, TimetableTeacher } from '@timetable-api/common';
import { DefaultsMap, getTimetableHash } from './utils.js';
import { Table } from './table.js';
import { ClientLesson, Day, LessonTimeSlot, ParseResult, TimeSlot, Unit, UnitType } from './types.js';
import {
    mapClass,
    mapCommonGroup,
    mapDay,
    mapInterclassGroup,
    mapRoom,
    mapSubject,
    mapTeacher,
    mapTimeSlot,
} from './mappers.js';

export class OptivumScrapper {
    private readonly timetable: Timetable;

    private unitList: Unit[];
    private readonly unitHTMLs: Map<string, string>;
    private readonly unitFullNames: Map<string, string>;
    private classShorts: Map<string, string>;
    private teacherShorts: Map<string, string>;
    private roomShorts: Map<string, string>;

    private subjects: Set<string>;
    private readonly interclassGroups: Map<string, string[]>;
    private commonGroups: Map<string, { subjectId: string; classId: string; groupShort: string }>;

    private readonly lessons: DefaultsMap<string, ClientLesson[]>;

    constructor(url: string, axiosInstance: Axios, unitList?: Unit[]) {
        this.timetable = new Timetable(url, axiosInstance);

        // Units
        this.unitList = unitList ?? [];
        this.unitHTMLs = new Map<string, string>();
        this.unitFullNames = new Map<string, string>();
        this.classShorts = new Map<string, string>();
        this.teacherShorts = new Map<string, string>();
        this.roomShorts = new Map<string, string>();

        // Common
        this.subjects = new Set<string>();
        this.interclassGroups = new Map();
        this.commonGroups = new Map();

        this.lessons = new DefaultsMap(() => []);
    }

    async loadUnitList() {
        // eslint-disable-next-line prefer-const
        let { units: unitList, sources } = await this.timetable.getUnitList();
        this.unitList = unitList;
        return { unitList, sources };
    }

    private async loadUnitHTMLs() {
        await Promise.allSettled(
            this.unitList.map(async ({ type, id }) =>
                this.timetable.getUnitHTML(type, id).then((html) => this.unitHTMLs.set(type + id, html)),
            ),
        );
    }

    async preParse() {
        if (!this.unitList.length) throw new Error('No units');
        await this.loadUnitHTMLs();
    }

    getHash() {
        return getTimetableHash([...this.unitHTMLs.values()]);
    }

    parse() {
        let generatedDate: string | null = null;
        let validFrom: string | null = null;
        let days: Day[] = [];
        let timeSlots: TimeSlot[] = [];

        if (!this.unitList.length) throw new Error('No units');
        this.unitList.forEach((unit) => {
            const html = this.unitHTMLs.get(unit.type + unit.id);
            if (html === undefined) return;

            const table = new Table(html, unit.id, unit.type);

            this.unitFullNames.set(unit.type + unit.id, table.getTitle());

            if (generatedDate === null) {
                generatedDate = table.getGeneratedDate();
                validFrom = table.getValidationDate();
                days = table.getDays();
            }
            if (table.getRowsLength() > timeSlots.length) timeSlots = table.getTimeSlots();

            const { subjects, roomShorts, teacherShorts, classShorts, groups, interclassGroupIds, lessons } =
                table.parseMainTable();
            this.handleTableCommon(unit, subjects, roomShorts, teacherShorts, classShorts, groups, interclassGroupIds);
            lessons.forEach((lesson) => {
                this.handleLesson(unit, lesson);
            });
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.formatResult(days, timeSlots, generatedDate!, validFrom);
    }

    private handleTableCommon(
        unit: Unit,
        subjects: Set<string>,
        roomShorts: Map<string, string>,
        teacherShorts: Map<string, string>,
        classShorts: Map<string, string>,
        groups: Map<string, { subjectId: string; classId: string; groupShort: string }>,
        interclassGroupIds: Set<string>,
    ) {
        this.subjects = new Set([...this.subjects, ...subjects]);
        this.classShorts = new Map([...this.classShorts, ...classShorts]);
        this.teacherShorts = new Map([...this.teacherShorts, ...teacherShorts]);
        this.roomShorts = new Map([...this.roomShorts, ...roomShorts]);
        this.commonGroups = new Map([...this.commonGroups, ...groups]);
        interclassGroupIds.forEach((id) => {
            const existingInterclassGroup = this.interclassGroups.get(id);
            if (existingInterclassGroup) existingInterclassGroup.push(unit.id);
            else this.interclassGroups.set(id, [unit.id]);
        });
    }

    private handleLesson(unit: Unit, lesson: LessonTimeSlot) {
        const timeSlotLessons = this.lessons.get(`${lesson.dayIndex.toString()}|${lesson.timeSlotIndex.toString()}`);

        // Lesson with comment
        if (lesson.type === 'comment') return timeSlotLessons.push({ type: 'comment', comment: lesson.comment });

        const isMatchingLesson = (existingLesson: ClientLesson) => {
            // Comment
            if (existingLesson.type === 'comment') return;

            // Lessons without interclass groups (by teacher)
            if (lesson.teacherId !== null && existingLesson.teacherId !== null)
                return lesson.teacherId === existingLesson.teacherId;

            // Interclass groups
            if (lesson.subjectId !== existingLesson.subjectId) return;
            // Interclass groups: class tables
            if (lesson.interclassGroupId !== null && existingLesson.interclassGroupId !== null)
                return lesson.interclassGroupId === existingLesson.interclassGroupId;
            // Interclass groups: teacher tables
            if (unit.type !== UnitType.CLASS)
                return [...existingLesson.classIds.values()].find((classId) => lesson.classIds.has(classId));
        };
        const existingLesson = timeSlotLessons.find(isMatchingLesson);

        if (!existingLesson) {
            return timeSlotLessons.push({
                type: 'default',
                classIds: lesson.classIds,
                teacherId: lesson.teacherId,
                roomId: lesson.roomId,
                subjectId: lesson.subjectId,
                interclassGroupId: lesson.interclassGroupId,
                groupIds: lesson.groupIds,
            });
        }
        if (existingLesson.type === 'comment') return;

        // Uzupełni teacherId, gdy grupa międzyoddziałowa i nie było info o nauczycielu
        if (
            existingLesson.interclassGroupId !== null &&
            unit.type === UnitType.TEACHER &&
            existingLesson.teacherId === null
        )
            existingLesson.teacherId = unit.id;
        // Uzupełnij interclassGroupId
        else if (lesson.interclassGroupId !== null && existingLesson.interclassGroupId === null)
            existingLesson.interclassGroupId = lesson.interclassGroupId;
        // Uzupełnij classIds i groupIds
        lesson.classIds.forEach((classId) => existingLesson.classIds.add(classId));
        lesson.groupIds.forEach((groupId) => existingLesson.groupIds.add(groupId));
    }

    private formatLessons() {
        const lessons: TimetableLesson[] = [];
        this.lessons.forEach((cell, index) => {
            const [dayIndex, timeSlotIndex] = index.split('|');
            cell.forEach((lesson) => {
                const isDefaultLesson = lesson.type === 'default';
                lessons.push({
                    timeSlotId: timeSlotIndex.toString(),
                    dayId: dayIndex.toString(),
                    comment: !isDefaultLesson ? lesson.comment : null,
                    subjectId: isDefaultLesson ? lesson.subjectId : null,
                    teacherIds: isDefaultLesson && lesson.teacherId !== null ? [lesson.teacherId] : [],
                    roomIds: isDefaultLesson && lesson.roomId !== null ? [lesson.roomId] : [],
                    groupIds: isDefaultLesson ? [...lesson.groupIds] : [],
                    classIds: isDefaultLesson ? [...lesson.classIds] : [],
                    interclassGroupId: isDefaultLesson ? lesson.interclassGroupId : null,
                    weekId: null,
                    periodId: null,
                    seminarGroup: null,
                    studentIds: [],
                });
            });
        });
        return lessons;
    }

    private formatUnits(type: UnitType) {
        const shorts = (() => {
            switch (type) {
                case UnitType.CLASS:
                    return [...this.classShorts];
                case UnitType.TEACHER:
                    return [...this.teacherShorts];
                case UnitType.ROOM:
                    return [...this.roomShorts];
            }
        })();
        return shorts
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([id, short]) => {
                const fullName = this.unitFullNames.get(type + id) ?? null;
                switch (type) {
                    case UnitType.CLASS:
                        return mapClass({ id, short, fullName });
                    case UnitType.TEACHER:
                        return mapTeacher({ id, short, fullName });
                    case UnitType.ROOM:
                        return mapRoom({ id, short, fullName });
                }
            });
    }

    private formatResult(
        days: Day[],
        timeSlots: TimeSlot[],
        generatedDate: string,
        validFrom: string | null,
    ): ParseResult {
        const lessons = this.formatLessons();
        return {
            data: {
                common: {
                    days: days.map(mapDay),
                    timeSlots: timeSlots.map(mapTimeSlot),
                    classes: this.formatUnits(UnitType.CLASS) as TimetableClass[],
                    teachers: this.formatUnits(UnitType.TEACHER) as TimetableTeacher[],
                    rooms: this.formatUnits(UnitType.ROOM) as TimetableRoom[],
                    interclassGroups: [...this.interclassGroups].map(mapInterclassGroup),
                    subjects: [...this.subjects].map(mapSubject),
                    commonGroups: [...this.commonGroups].map(mapCommonGroup),
                    buildings: [],
                    periods: [],
                    weeks: [],
                    students: [],
                },
                lessons,
            },
            generatedDate,
            validFrom,
        };
    }
}
