import {
    TimetableClass,
    TimetableCommonGroup,
    TimetableInterclassGroup,
    TimetableLesson,
    TimetableRoom,
    TimetableSubject,
    TimetableTeacher,
    TimetableTimeSlot,
    TimetableVersionData,
} from '@timetable-api/common';
import { Timetable } from './timetable.js';
import { Axios } from 'axios';
import { getClassKey, getRoomKey, getTeacherKey, parseTeacherFullName } from './utils.js';
import fs from "fs";

export async function parse(
    url: string,
    axiosInstance: Axios,
): Promise<{ data: TimetableVersionData; htmls: string[]; validFrom: string | null; generationDate: string }> {
    const timeSlots = new Map<string, TimetableTimeSlot>();
    const classes = new Map<string, TimetableClass>();
    const teachers = new Map<string, TimetableTeacher>();
    const rooms = new Map<string, TimetableRoom>();
    const subjects = new Map<string, TimetableSubject>();
    const commonGroups = new Map<string, TimetableCommonGroup>();
    const interclassGroups = new Map<string, TimetableInterclassGroup>();

    const timetable = new Timetable(url, axiosInstance);

    const { classTables, teacherTables, roomTables } = await timetable.getUnits();
    if (classTables.length === 0 && roomTables.length === 0 && teacherTables.length === 0)
        throw new Error('No units found');
    const units = [...classTables, ...teacherTables, ...roomTables];
    const days = units[0].table.getDays().map((day) => ({
        id: day.index.toString(),
        name: day.name,
        short: day.name,
        isoNumber: day.isoNumber,
    }));
    const generationDate = units[0].table.getGenerationDate();
    const validationDate = units[0].table.getValidationDate();

    classTables.forEach((unit) => {
        classes.set(unit.id.toString(), {
            id: unit.id.toString(),
            short: null,
            name: null,
            fullName: unit.table.getFullName(),
            teacherId: null,
            color: null,
        });
    });
    teacherTables.forEach((unit) => {
        const parsedFullName = parseTeacherFullName(unit.table.getFullName());
        teachers.set(unit.id.toString(), {
            id: unit.id.toString(),
            short: parsedFullName?.initials ?? null,
            name: parsedFullName?.name.trim() ?? null,
            fullName: unit.table.getFullName(),
            color: null,
        });
    });
    roomTables.forEach((unit) => {
        rooms.set(unit.id.toString(), {
            id: unit.id.toString(),
            short: null,
            name: null,
            fullName: unit.table.getFullName(),
            buildingId: null,
            color: null,
        });
    });

    const lessons: TimetableLesson[][][] = days.map(() => []);
    units.forEach((unit) => {
        unit.table.getTimeSlots().forEach((timeSlot) => {
            if (!timeSlots.has(timeSlot.name)) {
                timeSlots.set(timeSlot.name, {
                    id: timeSlot.index.toString(),
                    name: timeSlot.name,
                    short: timeSlot.name,
                    beginMinute: timeSlot.beginMinute,
                    endMinute: timeSlot.endMinute,
                });
                days.forEach((_day, index) => {
                    lessons[index].push([]);
                });
            }
        });
        unit.table.getLessons().forEach(({ lesson, dayIndex, timeSlotIndex }) => {
            if (lesson.subjectCode !== null)
                subjects.set(lesson.subjectCode, {
                    id: lesson.subjectCode,
                    name: null,
                    short: lesson.subjectCode,
                    color: null,
                });
            const teacherKey = getTeacherKey(unit, lesson.teacherId, lesson.teacherInitials);
            if (teacherKey !== null && !teachers.has(teacherKey) && unit.symbol !== 'n') {
                teachers.set(teacherKey, {
                    id: teacherKey,
                    fullName: null,
                    short: lesson.teacherInitials,
                    name: null,
                    color: null,
                });
            }

            const roomKey = getRoomKey(unit, lesson.roomId, lesson.roomCode);
            if (roomKey !== null && unit.symbol !== 's') {
                const existingRoom = rooms.get(roomKey);
                rooms.set(roomKey, {
                    id: roomKey,
                    short: lesson.roomCode,
                    fullName: existingRoom?.fullName ?? null,
                    name: existingRoom?.fullName?.replace(lesson.roomCode ?? '', '').trim() ?? null,
                    color: null,
                    buildingId: null,
                });
            }

            if (lesson.interclassGroupCode !== null) {
                const existingInterclassGroup = interclassGroups.get(lesson.interclassGroupCode);
                if (existingInterclassGroup === undefined) {
                    interclassGroups.set(lesson.interclassGroupCode, {
                        id: lesson.interclassGroupCode,
                        classIds: [unit.id.toString()],
                        subjectId: lesson.subjectCode,
                    });
                } else if (!existingInterclassGroup.classIds.includes(unit.id.toString()))
                    existingInterclassGroup.classIds.push(unit.id.toString());
            }

            lesson.classes.forEach((_class) => {
                const classKey = getClassKey(unit, _class.id, _class.code);
                if (classKey === null) return;
                const existingClass = classes.get(classKey);
                if (existingClass?.short == null) {
                    classes.set(classKey, {
                        id: classKey,
                        short: _class.code,
                        name: existingClass?.fullName?.replace(_class.code ?? '', '').trim() ?? null,
                        fullName: existingClass?.fullName ?? null,
                        color: null,
                        teacherId: null,
                    });
                }
                if (_class.groupCode !== null && lesson.subjectCode !== null) {
                    const commonGroupKey = `${classKey};${lesson.subjectCode};${_class.groupCode}`;
                    commonGroups.set(commonGroupKey, {
                        id: commonGroupKey,
                        short: _class.groupCode,
                        classId: classKey,
                        subjectId: lesson.subjectCode,
                        entireClass: false,
                        color: null,
                    });
                }
            });

            const existingLesson = lessons[dayIndex][timeSlotIndex].find(
                (l) =>
                    (l.interclassGroupId !== null && l.interclassGroupId === lesson.interclassGroupCode) ||
                    teacherKey === l.teacherIds[0],
            );
            if (existingLesson === undefined) {
                lessons[dayIndex][timeSlotIndex].push({
                    id: null,
                    timeSlotId: timeSlotIndex.toString(),
                    dayId: dayIndex.toString(),
                    weekId: '0',
                    periodId: '0',
                    seminarGroup: null,
                    studentIds: [],
                    subjectId: lesson.subjectCode,
                    teacherIds: teacherKey !== null ? [teacherKey] : [],
                    roomIds: roomKey !== null ? [roomKey] : [],
                    classIds: lesson.classes.map((class_) => {
                        const classKey = getClassKey(unit, class_.id, class_.code);
                        if (classKey === null) throw new Error('No class key');
                        return classKey;
                    }),
                    groupIds: lesson.classes
                        .filter((class_) => class_.groupCode !== null && lesson.subjectCode !== null)
                        .map((class_) => {
                            const classKey = getClassKey(unit, class_.id, class_.code);
                            if (classKey === null) throw new Error('No class key');
                            return `${classKey};${lesson.subjectCode};${class_.groupCode}`;
                        }),
                    interclassGroupId: lesson.interclassGroupCode,
                    comment: lesson.comment,
                });
            } else if (
                existingLesson.interclassGroupId === lesson.interclassGroupCode &&
                unit.symbol === 'o' &&
                existingLesson.classIds.includes(unit.id.toString()) &&
                (lesson.classes[0]?.groupCode == null ||
                    existingLesson.groupIds.includes(
                        `${unit.id.toString()};${existingLesson.subjectId};${lesson.classes[0]?.groupCode}`,
                    ))
            ) {
                existingLesson.classIds.push(unit.id.toString());
                if (lesson.classes[0]?.groupCode != null && lesson.subjectCode !== null)
                    existingLesson.groupIds.push(
                        `${unit.id.toString()};${existingLesson.subjectId};${lesson.classes[0]?.groupCode}`,
                    );
            }
            if (existingLesson && existingLesson.teacherIds.length < 1 && teacherKey !== null)
                existingLesson.teacherIds = [teacherKey];
        });
    });
    await fs.promises.writeFile(
        'data.json',
        JSON.stringify({
            data: {
                common: {
                    buildings: [],
                    students: [],
                    weeks: [{ id: '0', name: 'Tydzień A', short: 'A' }],
                    periods: [{ id: '0', name: 'Semestr A', short: 'A' }],
                    days,
                    timeSlots: [...timeSlots.values()],
                    classes: [...classes.values()],
                    teachers: [...teachers.values()],
                    rooms: [...rooms.values()],
                    subjects: [...subjects.values()],
                    commonGroups: [...commonGroups.values()],
                    interclassGroups: [...interclassGroups.values()],
                },
                lessons: lessons.flat().flat(),
            },
            htmls: units.map((unit) => unit.table.getHtml()),
            validFrom: validationDate ?? null,
            generationDate,
        }),
        'utf8',
    );
    return {
        data: {
            common: {
                buildings: [],
                students: [],
                weeks: [{ id: '0', name: 'Tydzień A', short: 'A' }],
                periods: [{ id: '0', name: 'Semestr A', short: 'A' }],
                days,
                timeSlots: [...timeSlots.values()],
                classes: [...classes.values()],
                teachers: [...teachers.values()],
                rooms: [...rooms.values()],
                subjects: [...subjects.values()],
                commonGroups: [...commonGroups.values()],
                interclassGroups: [...interclassGroups.values()],
            },
            lessons: lessons.flat().flat(),
        },
        htmls: units.map((unit) => unit.table.getHtml()),
        validFrom: validationDate ?? null,
        generationDate,
    };
}
