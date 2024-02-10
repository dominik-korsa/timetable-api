import {
    TimetableClass,
    TimetableCommonGroup,
    TimetableInterclassGroup,
    TimetableLesson,
    TimetableRoom,
    TimetableSubject,
    TimetableTeacher,
    TimetableTimeSlot,
    TimetableVersion,
} from '@timetable-api/common';
import { Timetable } from './timetable.js';
import { Axios } from 'axios';
import { getClassKey, getRoomKey, getTeacherKey, parseClassCode, parseTeacherFullName } from './utils.js';

export async function parse(url: string, axiosInstance: Axios): Promise<TimetableVersion> {
    const timeSlots = new Map<string, TimetableTimeSlot>();
    const classes = new Map<string, TimetableClass>();
    const teachers = new Map<string, TimetableTeacher>();
    const rooms = new Map<string, TimetableRoom>();
    const subjects = new Map<string, TimetableSubject>();
    const commonGroups = new Map<string, TimetableCommonGroup>();
    const interclassGroups = new Map<string, TimetableInterclassGroup>();

    const timetable = new Timetable(url, axiosInstance);
    const unitsIds = await timetable.getUnitIds();

    if (unitsIds.classIds.length === 0 && unitsIds.roomIds.length === 0 && unitsIds.teacherIds.length === 0)
        throw new Error('No unit IDs found');
    const [classTables, teacherTables, roomTables] = await timetable.getUnits();
    const units = [...classTables, ...teacherTables, ...roomTables];
    const weekdays = units[0].table.getWeekdays();
    const generationDate = units[0].table.getGenerationDate();
    const validationDate = units[0].table.getValidationDate();

    classTables.forEach((unit) => {
        classes.set(unit.id.toString(), {
            id: unit.id.toString(),
            level: null,
            order: null,
            code: null,
            longOrder: null,
            fullName: unit.table.getFullName(),
        });
    });
    teacherTables.forEach((unit) => {
        const parsedFullName = parseTeacherFullName(unit.table.getFullName());
        teachers.set(unit.id.toString(), {
            id: unit.id.toString(),
            initials: parsedFullName?.initials ?? null,
            name: parsedFullName?.name.trim() ?? null,
            fullName: unit.table.getFullName(),
        });
    });
    roomTables.forEach((unit) => {
        rooms.set(unit.id.toString(), {
            id: unit.id.toString(),
            code: null,
            name: null,
            fullName: unit.table.getFullName(),
        });
    });

    const lessons: TimetableLesson[][][] = weekdays.map(() => []);
    units.forEach((unit) => {
        unit.table.getTimeSlots().forEach((timeSlot) => {
            if (!timeSlots.has(timeSlot.name)) {
                timeSlots.set(timeSlot.name, timeSlot);
                weekdays.forEach((_weekday, index) => {
                    lessons[index].push([]);
                });
            }
        });
        unit.table.getLessons().forEach(({ lesson, weekdayIndex, timeSlotIndex }) => {
            const teacherKey = getTeacherKey(unit, lesson.teacherId, lesson.teacherInitials);
            if (teacherKey !== null && !teachers.has(teacherKey) && unit.symbol !== 'n') {
                teachers.set(teacherKey, {
                    id: teacherKey,
                    fullName: null,
                    initials: lesson.teacherInitials,
                    name: null,
                });
            }

            const roomKey = getRoomKey(unit, lesson.roomId, lesson.roomCode);
            if (roomKey !== null && unit.symbol !== 's') {
                const existingRoom = rooms.get(roomKey);
                rooms.set(roomKey, {
                    id: roomKey,
                    code: lesson.roomCode,
                    fullName: existingRoom?.fullName ?? null,
                    name: existingRoom?.fullName?.replace(lesson.roomCode ?? '', '').trim() ?? null,
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
                if (existingClass?.code == null) {
                    const parsedClassCode = _class.code !== null ? parseClassCode(_class.code) : null;
                    classes.set(classKey, {
                        id: classKey,
                        level: parsedClassCode?.level ?? null,
                        order: parsedClassCode?.order ?? null,
                        code: _class.code,
                        longOrder: existingClass?.fullName?.replace(_class.code ?? '', '').trim() ?? null,
                        fullName: existingClass?.fullName ?? null,
                    });
                }
                if (_class.groupCode !== null && lesson.subjectCode !== null) {
                    const commonGroupKey = `${classKey};${lesson.subjectCode};${_class.groupCode}`;
                    commonGroups.set(commonGroupKey, {
                        id: commonGroupKey,
                        code: _class.groupCode,
                        classId: classKey,
                        subjectId: lesson.subjectCode,
                    });
                }
            });

            const existingLesson = lessons[weekdayIndex][timeSlotIndex].find(
                (l) =>
                    (l.interclassGroupId !== null && l.interclassGroupId === lesson.interclassGroupCode) ||
                    (teacherKey === l.teacherId && l.teacherId !== null),
            );
            if (existingLesson === undefined) {
                lessons[weekdayIndex][timeSlotIndex].push({
                    subjectId: lesson.subjectCode,
                    teacherId: teacherKey,
                    roomId: roomKey,
                    classes: lesson.classes.map((_class) => {
                        const classKey = getClassKey(unit, _class.id, _class.code);
                        if (classKey === null) throw new Error('No class key');
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
                existingLesson.classes.push({
                    id: unit.id.toString(),
                    commonGroupId:
                        lesson.classes[0]?.groupCode != null && lesson.subjectCode !== null
                            ? `${unit.id.toString()};${existingLesson.subjectId};${lesson.classes[0]?.groupCode}`
                            : null,
                });
            }
            if (existingLesson?.teacherId === null && teacherKey !== null) existingLesson.teacherId = teacherKey;
        });
    });
    return {
        data: {
            common: {
                weekdays,
                timeSlots: [...timeSlots.values()],
                classes: [...classes.values()],
                teachers: [...teachers.values()],
                rooms: [...rooms.values()],
                subjects: [...subjects.values()],
                commonGroups: [...commonGroups.values()],
                interclassGroups: [...interclassGroups.values()],
            },
            lessons: lessons.flat().flat(),
            validFrom: validationDate ?? null,
            generationDate,
        },
        htmls: units.map((unit) => unit.table.getHtml()),
    };
}
