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
import { parseClassCode, parseTeacherFullName } from './utils.js';

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
        if (classes.has(unit.id.toString())) return;
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
        if (teachers.has(unit.id.toString())) return;
        const parsedFullName = parseTeacherFullName(unit.table.getFullName());
        teachers.set(unit.id.toString(), {
            id: unit.id.toString(),
            initials: parsedFullName?.initials ?? null,
            name: parsedFullName?.name.trim() ?? null,
            fullName: unit.table.getFullName(),
        });
    });
    roomTables.forEach((unit) => {
        if (rooms.has(unit.id.toString())) return;
        rooms.set(unit.id.toString(), {
            id: unit.id.toString(),
            code: null,
            name: null,
            fullName: unit.table.getFullName(),
        });
    });

    const lessons: TimetableLesson[][][] = weekdays.map(() => []);
    const htmls: string[] = units.map((unit) => unit.table.getHtml());
    units.forEach((unit) => {
        unit.table.getTimeSlots().forEach((timeSlot) => {
            if (!timeSlots.has(timeSlot.name)) {
                timeSlots.set(timeSlot.name, timeSlot);
                weekdays.forEach((weekday, index) => {
                    lessons[index].push([]);
                });
            }
        });
        unit.table.getLessons().forEach(({ lesson, weekdayIndex, timeSlotIndex }) => {
            if (lesson.teacherId === null && lesson.teacherInitials !== null) {
                teachers.set(`#${lesson.teacherInitials}`, {
                    id: `#${lesson.teacherInitials}`,
                    fullName: null,
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
                    });
                }
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

            const existingLesson = lessons[weekdayIndex][timeSlotIndex].find(
                (l) =>
                    (l.interclassGroupId !== null && l.interclassGroupId === lesson.interclassGroupCode) ||
                    (teacherKey === l.teacherId && l.teacherId !== null),
            );
            if (existingLesson === undefined) {
                lessons[weekdayIndex][timeSlotIndex].push({
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
                existingLesson.classes.push({
                    id: unit.id.toString(),
                    commonGroupId:
                        lesson.classes[0]?.groupCode != null && lesson.subjectCode !== null
                            ? `${unit.id.toString()};${existingLesson.subjectId};${lesson.classes[0]?.groupCode}`
                            : null,
                });
            }

            if (
                existingLesson?.teacherId === null &&
                (lesson.teacherId !== null || lesson.teacherInitials !== null || unit.symbol === 'n')
            ) {
                existingLesson.teacherId =
                    unit.symbol === 'n'
                        ? unit.id.toString()
                        : lesson.teacherId?.toString() ?? `#${lesson.teacherInitials}`;
            }
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
        htmls,
    };
}
