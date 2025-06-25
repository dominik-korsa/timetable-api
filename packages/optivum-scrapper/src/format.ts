import { TimetableClass, TimetableTeacher, TimetableRoom } from '@timetable-api/common';
import { ClientLesson, CommonGroup, Day, ParseResult, TimeSlot, UnitType } from './types.js';
import { DefaultsMap, getUnitName } from './utils.js';
import { DATA_SCHEMA_VERSION } from './index.js';

const mapDay = ({ name, isoNumber }: Day) => ({ short: null, name, isoNumber });

const mapTimeSlot = ({ name, beginMinute, endMinute }: TimeSlot) => ({ name, beginMinute, endMinute });

const mapInterclassGroup = ([id, classIds]: [string, string[]]) => ({ id, classIds });

const mapSubject = (id: string) => ({ id, short: id, name: null, color: null });

const mapCommonGroup = ([id, { groupShort, subjectId, classId }]: [
    string,
    { groupShort: string; subjectId: string; classId: string },
]) => ({ id, short: groupShort, subjectId, classId, color: null });

const mapClass = ({ id, short, fullName }: { id: string; short: string; fullName: string | null }) => ({
    id,
    short,
    fullName,
    name: fullName !== null ? getUnitName(fullName, short, UnitType.CLASS) : null,
    color: null,
    teacherId: null,
});

const mapTeacher = ({ id, short, fullName }: { id: string; short: string; fullName: string | null }) => ({
    id,
    short,
    fullName,
    name: fullName !== null ? getUnitName(fullName, short, UnitType.TEACHER) : null,
    color: null,
});

const mapRoom = ({ id, short, fullName }: { id: string; short: string; fullName: string | null }) => ({
    id,
    short,
    fullName,
    name: fullName !== null ? getUnitName(fullName, short, UnitType.ROOM) : null,
    color: null,
    buildingId: null,
});

const formatLessons = (lessons: DefaultsMap<string, ClientLesson[]>, timeSlots: TimeSlot[]) =>
    [...lessons.entries()].flatMap(([index, cell]) => {
        const [dayIndex, timeSlotIndex] = index.split('|').map(Number);
        const timeSlot = timeSlots[timeSlotIndex];
        return cell.map((lesson) => {
            const isDefaultLesson = lesson.type === 'default';
            return {
                timeSlotIndex,
                dayIndex,
                beginMinute: timeSlot.beginMinute,
                endMinute: timeSlot.endMinute,
                comment: !isDefaultLesson ? lesson.comment : null,
                subjectId: isDefaultLesson ? lesson.subjectId : null,
                teacherIds: lesson.teacherId !== null ? [lesson.teacherId] : [],
                roomIds: lesson.roomId !== null ? [lesson.roomId] : [],
                groupIds: isDefaultLesson ? [...lesson.groupIds] : [],
                classIds: [...lesson.classIds],
                interclassGroupId: isDefaultLesson ? lesson.interclassGroupId : null,
                weekIndex: null,
                periodIndex: null,
                seminarGroup: null,
                studentIds: [],
            };
        });
    });

const formatUnits = (shorts: Map<string, string>, fullNames: Map<string, string>, type: UnitType) =>
    [...shorts]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([id, short]) => {
            const fullName = fullNames.get(type + id) ?? null;
            switch (type) {
                case UnitType.CLASS:
                    return mapClass({ id, short, fullName });
                case UnitType.TEACHER:
                    return mapTeacher({ id, short, fullName });
                case UnitType.ROOM:
                    return mapRoom({ id, short, fullName });
            }
        });

export const formatResult = (
    days: Day[],
    timeSlots: TimeSlot[],
    classShorts: Map<string, string>,
    teacherShorts: Map<string, string>,
    roomShorts: Map<string, string>,
    unitFullNames: Map<string, string>,
    interclassGroups: Map<string, string[]>,
    subjects: Set<string>,
    commonGroups: Map<string, CommonGroup>,
    lessons: DefaultsMap<string, ClientLesson[]>,
    generatedDate: string,
    validFrom: string | null,
): ParseResult => ({
    data: {
        schemaVersion: DATA_SCHEMA_VERSION,
        common: {
            days: days.map(mapDay),
            timeSlots: timeSlots.map(mapTimeSlot),
            classes: formatUnits(classShorts, unitFullNames, UnitType.CLASS) as TimetableClass[],
            teachers: formatUnits(teacherShorts, unitFullNames, UnitType.TEACHER) as TimetableTeacher[],
            rooms: formatUnits(roomShorts, unitFullNames, UnitType.ROOM) as TimetableRoom[],
            interclassGroups: [...interclassGroups].map(mapInterclassGroup),
            subjects: [...subjects].map(mapSubject),
            commonGroups: [...commonGroups].map(mapCommonGroup),
            buildings: [],
            periods: [],
            weeks: [],
            students: [],
        },
        lessons: formatLessons(lessons, timeSlots),
    },
    generatedDate,
    validFrom,
});
