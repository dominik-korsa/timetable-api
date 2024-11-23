/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Axios } from 'axios';
import { Timetable } from './timetable.js';
import {
    isDefined,
    TimetableLesson,
    type TimetableInterclassGroup,
    type TimetableVersionData,
} from '@timetable-api/common';
import { DefaultsMap, getTimetableHash, getUnitKey, parseTeacherFullName } from './utils.js';
import { Table } from './table.js';
import { Day, Lesson, TimeSlot, Unit, UnitType } from './types.js';

interface ClientUnit {
    id: string;
    type: UnitType;
    short: string | null;
    name: string | null;
    fullName: string | null;
}

type ClientLesson =
    | {
          subjectId: string;
          classIds: string[];
          teacherId: string | null;
          roomId: string | null;
          groupIds: string[];
          comment: null;
          interclassGroupId: string | null;
      }
    | {
          subjectId: null;
          classIds: string[];
          teacherId: null;
          roomId: null;
          groupIds: string[];
          comment: string;
          interclassGroupId: null;
      };

interface CommonGroup {
    id: string;
    short: string;
    subjectId: string;
    classId: string;
}

export interface ParseResult {
    data: TimetableVersionData;
    validFrom: string | null;
    generationDate: string;
}

export class OptivumScrapper {
    private readonly timetable: Timetable;
    private unitList: { id: string; fullName: string; type: UnitType; html: string }[];
    private classes: Map<string, ClientUnit>;
    private teachers: Map<string, ClientUnit>;
    private rooms: Map<string, ClientUnit>;
    private readonly lessons: DefaultsMap<string, ClientLesson[]>;
    private timeSlots: TimeSlot[];
    private days: Day[];
    private readonly subjects: string[];
    private readonly interclassGroups: Map<string, TimetableInterclassGroup>;
    private readonly commonGroups: Map<string, CommonGroup>;

    constructor(url: string, axiosInstance: Axios) {
        this.timetable = new Timetable(url, axiosInstance);
        this.unitList = [];
        this.classes = new Map();
        this.teachers = new Map();
        this.rooms = new Map();
        this.lessons = new DefaultsMap(() => []);
        this.timeSlots = [];
        this.days = [];
        this.subjects = [];
        this.interclassGroups = new Map();
        this.commonGroups = new Map();
    }

    public async getUnitList() {
        const { units: list, sources } = await this.timetable.getUnitList();
        return { list, sources };
    }

    private async getUnitHTMLs(list: Unit[]) {
        this.unitList = (
            await Promise.all(
                list.map(async (unit) => {
                    try {
                        return Object.assign(unit, {
                            html: (await this.timetable.getDocument(`plany/${unit.type}${unit.id}.html`)).response,
                        });
                    } catch {
                        return;
                    }
                }),
            )
        ).filter(isDefined);
    }

    public async preParse(unitList: Unit[]) {
        await this.getUnitHTMLs(unitList);
        if (!this.unitList.length) throw new Error('No units found');
    }

    public getHash() {
        const htmls: string[] = this.unitList.map(({ html }) => html);
        return getTimetableHash(htmls);
    }

    private filterUnitsByType(units: ClientUnit[]) {
        const classes = new Map<string, ClientUnit>();
        const teachers = new Map<string, ClientUnit>();
        const rooms = new Map<string, ClientUnit>();
        units.forEach((unit) => {
            switch (unit.type) {
                case 'o':
                    classes.set(unit.id, {
                        id: unit.id,
                        type: unit.type,
                        name: unit.name,
                        short: unit.short,
                        fullName: unit.fullName,
                    });
                    break;
                case 'n':
                    teachers.set(unit.id, {
                        id: unit.id,
                        type: unit.type,
                        name: unit.name,
                        short: unit.short,
                        fullName: unit.fullName,
                    });
                    break;
                case 's':
                    rooms.set(unit.id, {
                        id: unit.id,
                        type: unit.type,
                        name: unit.name,
                        short: unit.short,
                        fullName: unit.fullName,
                    });
                    break;
                default:
                    break;
            }
        });
        return [classes, teachers, rooms];
    }

    public parse() {
        const units = this.unitList.map((unit) =>
            Object.assign(unit, {
                short: unit.type === 'n' ? parseTeacherFullName(unit.fullName)?.short ?? null : null,
                name: unit.type === 'n' ? parseTeacherFullName(unit.fullName)?.name ?? null : null,
            }),
        );
        [this.classes, this.teachers, this.rooms] = this.filterUnitsByType(units);

        let generationDate: string | null = null;
        let validFrom: string | null = null;
        units.forEach((unit) => {
            const table = new Table(unit.html);
            if (generationDate === null) {
                generationDate = table.getGenerationDate();
                validFrom = table.getValidationDate() ?? null;
                this.days = table.getDays();
            }
            if (table.getRowsLength() > this.timeSlots.length) {
                this.timeSlots = table.getTimeSlots();
            }
            table.getLessons().forEach(({ lesson, dayIndex, timeSlotIndex }) => {
                this.handleLesson(unit, lesson, timeSlotIndex, dayIndex);
            });
        });
        return this.formatData(generationDate!, validFrom);
    }

    private handleLesson(unit: ClientUnit, lesson: Lesson, timeSlotIndex: number, dayIndex: number) {
        // Lesson with comment
        if (lesson.comment !== null) {
            this.lessons.get(`${dayIndex.toString()}|${timeSlotIndex.toString()}`).push({
                subjectId: null,
                classIds: [],
                teacherId: null,
                roomId: null,
                groupIds: [],
                comment: lesson.comment,
                interclassGroupId: null,
            });
            return;
        }

        // Subject
        if (!this.subjects.includes(lesson.subjectId!)) {
            this.subjects.push(lesson.subjectId!);
        }

        // Teacher, room, classes and common groups
        const { teacherKey, roomKey, classKeys, commonGroupKeys } = this.handleLessonUnits(unit, lesson);

        // Interclass groups
        if (lesson.interclassGroupId !== null) {
            const existingInterclassGroup = this.interclassGroups.get(lesson.interclassGroupId);
            if (!existingInterclassGroup) {
                this.interclassGroups.set(lesson.interclassGroupId, {
                    id: lesson.interclassGroupId,
                    subjectId: lesson.subjectId!,
                    classIds: classKeys,
                });
            } else {
                classKeys.forEach((classId) => {
                    if (!existingInterclassGroup.classIds.includes(classId))
                        existingInterclassGroup.classIds.push(classId);
                });
            }
        }

        // Lesson
        const existingLesson = this.lessons.get(`${dayIndex.toString()}|${timeSlotIndex.toString()}`).find(
            (l) =>
                l.interclassGroupId !== null &&
                (l.interclassGroupId === lesson.interclassGroupId ||
                    (unit.type === 'n' && l.teacherId === unit.id) ||
                    (unit.type === 's' && l.roomId === unit.id) ||
                    lesson.classes.find((class_) => {
                        const classKey = getUnitKey(class_ as { id: string | null; short: string });
                        if (class_.groupShort !== null)
                            return l.groupIds.find(
                                (groupId) => groupId === `${classKey};${lesson.subjectId!};${groupId}`,
                            );
                        else return l.classIds.includes(classKey);
                    })),
        );
        if (!existingLesson) {
            this.lessons.get(`${dayIndex.toString()}|${timeSlotIndex.toString()}`).push({
                classIds: classKeys,
                teacherId: teacherKey,
                roomId: roomKey,
                subjectId: lesson.subjectId!,
                interclassGroupId: lesson.interclassGroupId,
                groupIds: commonGroupKeys,
                comment: null,
            });
        } else {
            if (unit.type === 'o' && !existingLesson.classIds.includes(unit.id)) existingLesson.classIds.push(unit.id);
            commonGroupKeys.forEach((commonGroupKey) => {
                if (!existingLesson.groupIds.includes(commonGroupKey)) existingLesson.groupIds.push(commonGroupKey);
            });
            if (unit.type === 'n' && existingLesson.teacherId === null) existingLesson.teacherId = unit.id;
            if (unit.type === 's' && existingLesson.roomId === null) existingLesson.roomId = unit.id;
        }
    }

    private handleLessonUnits(unit: ClientUnit, lesson: Lesson) {
        // Teacher
        const teacherKey = lesson.teacher ? getUnitKey(lesson.teacher) : unit.type === 'n' ? unit.id : null;
        if (teacherKey !== null && !this.teachers.has(teacherKey)) {
            this.teachers.set(teacherKey, {
                id: teacherKey,
                name: null,
                short: lesson.teacher!.short,
                fullName: null,
                type: 'n',
            });
        }

        // Room
        const roomKey = lesson.room ? getUnitKey(lesson.room) : unit.type === 's' ? unit.id : null;
        if (roomKey !== null) {
            const existingRoom = this.rooms.get(roomKey);
            if (!existingRoom) {
                this.rooms.set(roomKey, {
                    id: roomKey,
                    name: null,
                    short: lesson.room!.short,
                    fullName: null,
                    type: 's',
                });
            }
            if (existingRoom?.short === null && lesson.room?.short != null) {
                existingRoom.short = lesson.room.short;
                if (existingRoom.fullName !== null)
                    existingRoom.name = existingRoom.fullName.replace(lesson.room.short, '').trim();
            }
        }

        // Classes and common groups
        const commonGroupKeys: string[] = [];
        const classKeys: string[] = unit.type === 'o' ? [unit.id] : [];
        lesson.classes.forEach((class_) => {
            const classKey = class_.short !== null ? getUnitKey(class_ as { id: string | null; short: string }) : null;
            if (classKey !== null) {
                classKeys.push(classKey);
                const existingClass = this.classes.get(classKey);
                if (!existingClass) {
                    this.classes.set(classKey, {
                        id: classKey,
                        short: class_.short,
                        name: null,
                        fullName: null,
                        type: 'o',
                    });
                }
                if (existingClass?.short === null) {
                    existingClass.short = class_.short;
                    if (existingClass.fullName !== null && class_.short !== null)
                        existingClass.name = existingClass.fullName.replace(class_.short, '').trim();
                }
            }
            const commonGroupKey =
                class_.groupShort !== null && classKey !== null ? `${classKey};${lesson.subjectId!};${class_.groupShort}` : null;
            if (commonGroupKey !== null) commonGroupKeys.push(commonGroupKey);
            if (commonGroupKey !== null && !this.commonGroups.has(commonGroupKey))
                this.commonGroups.set(commonGroupKey, {
                    id: commonGroupKey,
                    short: class_.groupShort!,
                    subjectId: lesson.subjectId!,
                    classId: classKey ?? unit.id,
                });
        });
        return { teacherKey, roomKey, classKeys, commonGroupKeys };
    }

    private formatData(generationDate: string, validFrom: string | null): ParseResult {
        const lessons: TimetableLesson[] = [];
        this.lessons.forEach((cell, index) => {
            const [dayIndex, timeSlotIndex] = index.split('|')
            cell.forEach((lesson) => {
                lessons.push({
                    timeSlotId: timeSlotIndex.toString(),
                    dayId: dayIndex.toString(),
                    weekId: null,
                    subjectId: lesson.subjectId,
                    teacherIds: lesson.teacherId !== null ? [lesson.teacherId] : [],
                    roomIds: lesson.roomId !== null ? [lesson.roomId] : [],
                    groupIds: lesson.groupIds,
                    classIds: lesson.classIds,
                    periodId: null,
                    seminarGroup: null,
                    studentIds: [],
                    interclassGroupId: lesson.interclassGroupId,
                    comment: lesson.comment,
                });
            });
        });
        return {
            data: {
                common: {
                    days: this.days.map((day) => ({
                        id: day.index.toString(),
                        short: day.name,
                        name: day.name,
                        isoNumber: day.isoNumber,
                    })),
                    timeSlots: this.timeSlots.map((timeSlot) => ({
                        id: timeSlot.index.toString(),
                        name: timeSlot.name,
                        beginMinute: timeSlot.beginMinute,
                        endMinute: timeSlot.endMinute,
                    })),
                    classes: [...this.classes.values()].map((class_) => ({
                        id: class_.id,
                        short: class_.short,
                        name: class_.name,
                        fullName: class_.fullName,
                        color: null,
                        teacherId: null,
                    })),
                    teachers: [...this.teachers.values()].map((teacher) => ({
                        id: teacher.id,
                        short: teacher.short,
                        name: teacher.name,
                        fullName: teacher.fullName,
                        color: null,
                    })),
                    rooms: [...this.rooms.values()].map((room) => ({
                        id: room.id,
                        short: room.short,
                        name: room.name,
                        fullName: room.fullName,
                        color: null,
                        buildingId: null,
                    })),
                    interclassGroups: [...this.interclassGroups.values()],
                    subjects: this.subjects.map((subjectId) => ({
                        id: subjectId,
                        short: subjectId,
                        name: null,
                        color: null,
                    })),
                    commonGroups: [...this.commonGroups.values()].map((group) => ({
                        id: group.id,
                        short: group.short,
                        subjectId: group.subjectId,
                        classId: group.classId,
                        color: null,
                    })),
                    buildings: [],
                    periods: [],
                    weeks: [],
                    students: [],
                },
                lessons,
            },
            generationDate,
            validFrom,
        };
    }
}
