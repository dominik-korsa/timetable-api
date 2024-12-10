import { Day, TimeSlot, UnitType } from './types.js';
import { getUnitName } from './utils.js';

export const mapDay = ({ name, isoNumber }: Day) => ({ short: null, name, isoNumber });

export const mapTimeSlot = ({ name, beginMinute, endMinute }: TimeSlot) => ({ name, beginMinute, endMinute });

export const mapInterclassGroup = ([id, classIds]: [string, string[]]) => ({ id, classIds });

export const mapSubject = (id: string) => ({ id, short: id, name: null, color: null });

export const mapCommonGroup = ([id, { groupShort, subjectId, classId }]: [
    string,
    { groupShort: string; subjectId: string; classId: string },
]) => ({ id, short: groupShort, subjectId, classId, color: null });

export const mapClass = ({ id, short, fullName }: { id: string; short: string; fullName: string | null }) => ({
    id,
    short,
    fullName,
    name: fullName !== null ? getUnitName(fullName, short, UnitType.CLASS) : null,
    color: null,
    teacherId: null,
});

export const mapTeacher = ({ id, short, fullName }: { id: string; short: string; fullName: string | null }) => ({
    id,
    short,
    fullName,
    name: fullName !== null ? getUnitName(fullName, short, UnitType.TEACHER) : null,
    color: null,
});

export const mapRoom = ({ id, short, fullName }: { id: string; short: string; fullName: string | null }) => ({
    id,
    short,
    fullName,
    name: fullName !== null ? getUnitName(fullName, short, UnitType.ROOM) : null,
    color: null,
    buildingId: null,
});
