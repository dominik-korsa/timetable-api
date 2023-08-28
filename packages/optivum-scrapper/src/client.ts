import {
    maxBy,
    TimetableClass,
    TimetableCommonGroup,
    TimetableInterclassGroup,
    TimetableLesson,
    TimetableRoom,
    TimetableSubject,
    TimetableTeacher,
    TimetableTimeSlot,
    TimetableWeekday,
} from '@timetable-api/common';
import { Timetable } from './timetable.js';
import { Axios } from 'axios';
import fs from 'fs';
import { parseClassCode, parseTeacherFullName } from './utils.js';

export async function parse(url: string) {
    const classes = new Map<string, TimetableClass>();
    const teachers = new Map<string, TimetableTeacher>();
    const rooms = new Map<string, TimetableRoom>();
    const subjects = new Map<string, TimetableSubject>();
    const commonGroups = new Map<string, TimetableCommonGroup>();
    const interclassGroups = new Map<string, TimetableInterclassGroup>();

    const timetable = new Timetable(url, new Axios({ headers: {} }));
    const unitsIds = await timetable.getUnitIds();

    if (unitsIds.classIds.length === 0 && unitsIds.roomIds.length === 0 && unitsIds.teacherIds.length === 0)
        throw new Error('No unit IDs found');

    const [classTables, teacherTables, roomTables] = await Promise.all([
        Promise.all(
            unitsIds.classIds.map(async (classId) => ({
                symbol: 'o',
                id: classId,
                table: await timetable.getTable('o', classId),
            })),
        ),
        Promise.all(
            unitsIds.teacherIds.map(async (teacherId) => ({
                symbol: 'n',
                id: teacherId,
                table: await timetable.getTable('n', teacherId),
            })),
        ),
        Promise.all(
            unitsIds.roomIds.map(async (roomId) => ({
                symbol: 's',
                id: roomId,
                table: await timetable.getTable('s', roomId),
            })),
        ),
    ]);
    const units = [...classTables, ...teacherTables, ...roomTables];
    const tableWithMaxTimeSlots = maxBy(units, (item) => item.table.getTimeSlotCount()).table;
    const timeSlots: TimetableTimeSlot[] = tableWithMaxTimeSlots.getTimeSlots();
    const weekdays: TimetableWeekday[] = tableWithMaxTimeSlots.getWeekdays();
    const generationDate = tableWithMaxTimeSlots.getGenerationDate();
    const validationDate = tableWithMaxTimeSlots.getValidationDate();

    classTables.forEach((unit) => {
        if (classes.has(unit.id.toString())) return;
        classes.set(unit.id.toString(), {
            id: unit.id.toString(),
            level: null,
            order: null,
            code: null,
            longOrder: null,
            fullName: unit.table.getFullName() ?? null,
            slugs: [],
        });
    });
    teacherTables.forEach((unit) => {
        if (teachers.has(unit.id.toString())) return;
        const parsedFullName = parseTeacherFullName(unit.table.getFullName() ?? '');
        teachers.set(unit.id.toString(), {
            id: unit.id.toString(),
            initials: parsedFullName?.initials ?? null,
            name: parsedFullName?.name.trim() ?? null,
            fullName: unit.table.getFullName() ?? null,
            slugs: [],
        });
    });
    roomTables.forEach((unit) => {
        if (rooms.has(unit.id.toString())) return;
        rooms.set(unit.id.toString(), {
            id: unit.id.toString(),
            code: null,
            name: null,
            fullName: unit.table.getFullName() ?? null,
            slugs: [],
        });
    });

    const lessons = weekdays.map(() => timeSlots.map((): TimetableLesson[] => []));
    units.forEach((unit) => {
        unit.table.getLessons().forEach((lesson) => {
            if (lesson.teacherId === null && lesson.teacherInitials !== null) {
                teachers.set(`#${lesson.teacherInitials}`, {
                    id: `#${lesson.teacherInitials}`,
                    fullName: null,
                    slugs: [],
                    initials: lesson.teacherInitials,
                    name: null,
                });
            }
            if (lesson.roomId !== null || lesson.roomCode !== null) {
                const roomKey = lesson.roomId?.toString() ?? `#${lesson.roomCode}`;
                const existingRoom = rooms.get(roomKey);
                if (existingRoom === undefined || (existingRoom.code === null && lesson.roomCode !== null)) {
                    rooms.set(roomKey, {
                        id: roomKey,
                        code: lesson.roomCode,
                        fullName: existingRoom?.fullName ?? null,
                        name: existingRoom?.fullName?.replace(lesson.roomCode ?? '', '').trim() ?? null,
                        slugs: [],
                    });
                }
            }
            if (lesson.interclassGroupCode !== null) {
                const existingInterclassGroup = interclassGroups.get(lesson.interclassGroupCode);
                if (existingInterclassGroup === undefined && lesson.subjectCode !== null) {
                    interclassGroups.set(lesson.interclassGroupCode, {
                        id: lesson.interclassGroupCode,
                        classIds: [unit.id.toString()],
                        subjectId: lesson.subjectCode,
                    });
                } else if (
                    existingInterclassGroup !== undefined &&
                    !existingInterclassGroup.classIds.includes(unit.id.toString())
                ) {
                    interclassGroups.set(existingInterclassGroup.id, {
                        id: existingInterclassGroup.id,
                        classIds: [...existingInterclassGroup.classIds, unit.id.toString()],
                        subjectId: existingInterclassGroup.subjectId,
                    });
                }
            }
            lesson.classes.forEach((_class) => {
                if (_class.code !== null || _class.id !== null) {
                    const classKey = _class.id?.toString() ?? `#${_class.code}`;
                    const existingClass = classes.get(classKey);
                    if (existingClass === undefined || (existingClass.code === null && _class.code !== null)) {
                        const parsedClassCode = _class.code !== null ? parseClassCode(_class.code) : null;
                        classes.set(classKey, {
                            id: classKey,
                            level: parsedClassCode?.level ?? null,
                            order: parsedClassCode?.order ?? null,
                            code: _class.code,
                            longOrder: existingClass?.fullName?.replace(_class.code ?? '', '').trim() ?? null,
                            fullName: existingClass?.fullName ?? null,
                            slugs: [],
                        });
                    }
                    if (_class.groupCode !== null && lesson.subjectCode !== null) {
                        const commonGroupKey = `${classKey};${lesson.subjectCode};${_class.groupCode}`;
                        const existingCommonGroup = commonGroups.get(commonGroupKey);
                        if (!existingCommonGroup) {
                            commonGroups.set(commonGroupKey, {
                                id: commonGroupKey,
                                code: _class.groupCode,
                                classId: classKey,
                                subjectId: lesson.subjectCode,
                            });
                        }
                    }
                }
            });
            const teacherKey =
                unit.symbol === 'n'
                    ? unit.id.toString()
                    : lesson.teacherId?.toString() ??
                      (lesson.teacherInitials != null ? `#${lesson.teacherInitials}` : null);

            const existingLesson = lessons[lesson.columnIndex][lesson.rowIndex].find(
                (l) =>
                    (l.interclassGroupId !== null && l.interclassGroupId === lesson.interclassGroupCode) ||
                    (teacherKey === l.teacherId && l.teacherId !== null),
            );
            if (existingLesson === undefined) {
                lessons[lesson.columnIndex][lesson.rowIndex].push({
                    subjectId: lesson.subjectCode,
                    teacherId:
                        unit.symbol === 'n'
                            ? unit.id.toString()
                            : lesson.teacherId?.toString() ??
                              (lesson.teacherInitials !== null ? `#${lesson.teacherInitials}` : null),
                    roomId:
                        unit.symbol === 's'
                            ? unit.id.toString()
                            : lesson.roomId?.toString() ?? (lesson.roomCode !== null ? `#${lesson.roomCode}` : null),
                    classes: lesson.classes.map((_class) => {
                        const classKey =
                            unit.symbol === 'o' ? unit.id.toString() : _class.id?.toString() ?? `#${_class.code}`;
                        return {
                            id: classKey,
                            commonGroupId:
                                _class.groupCode != null && lesson.subjectCode !== null
                                    ? `${classKey};${lesson.subjectCode};${_class.groupCode}`
                                    : null,
                        };
                    }),
                    interclassGroupId: lesson.interclassGroupCode,
                    comment: lesson.comment,
                });
            } else if (
                existingLesson.interclassGroupId === lesson.interclassGroupCode &&
                unit.symbol === 'o' &&
                !existingLesson.classes.find(
                    (c) =>
                        c.id === unit.id.toString() &&
                        c.commonGroupId ===
                            (lesson.classes[0]?.groupCode != null
                                ? `${unit.id.toString()};${existingLesson.subjectId};${lesson.classes[0]?.groupCode}`
                                : null),
                )
            ) {
                lessons[lesson.columnIndex][lesson.rowIndex][
                    lessons[lesson.columnIndex][lesson.rowIndex].indexOf(existingLesson)
                ].classes = [
                    ...existingLesson.classes,
                    {
                        id: unit.id.toString(),
                        commonGroupId:
                            lesson.classes[0]?.groupCode != null && lesson.subjectCode !== null
                                ? `${unit.id.toString()};${existingLesson.subjectId};${lesson.classes[0]?.groupCode}`
                                : null,
                    },
                ];
            }
            if (
                existingLesson?.teacherId === null &&
                (lesson.teacherId !== null || lesson.teacherInitials !== null || unit.symbol === 'n')
            ) {
                lessons[lesson.columnIndex][lesson.rowIndex][
                    lessons[lesson.columnIndex][lesson.rowIndex].indexOf(existingLesson)
                ].teacherId =
                    unit.symbol === 'n'
                        ? unit.id.toString()
                        : lesson.teacherId?.toString() ?? `#${lesson.teacherInitials}`;
            }
        });
    });
    await fs.promises.writeFile(
        'data.json',
        JSON.stringify({
            generationDate,
            validationDate,
            weekdays,
            timeSlots,
            classes: Array.from(classes),
            teachers: Array.from(teachers),
            rooms: Array.from(rooms),
            subjects: Array.from(subjects),
            commonGroups: Array.from(commonGroups),
            interclassGroups: Array.from(interclassGroups),
            lessons,
        }),
        'utf8',
    );
    return {
        weekdays,
        timeSlots,
        classes,
        teachers,
        rooms,
        subjects,
        commonGroups,
        interclassGroups,
        lessons,
    };
}
