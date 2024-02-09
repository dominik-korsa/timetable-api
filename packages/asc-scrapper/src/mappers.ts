import {
    ClassesTableRow,
    ClassroomsTableRow,
    Clazz,
    Division,
    DivisionsTableRow,
    Group,
    GroupsTableRow,
    PeriodsTableRow,
    Room,
    Student,
    StudentsTableRow,
    Subject,
    SubjectsTableRow,
    Teacher,
    TeachersTableRow,
    TimeSlot,
} from './types.js';
import { parseTime } from './utils.js';

export const mapPeriodsTableRow = (row: PeriodsTableRow): TimeSlot => ({
    id: row.id,
    name: row.name,
    short: row.short,
    beginMinute: parseTime(row.starttime),
    endMinute: parseTime(row.endtime),
});

export const mapClassroomsTableRow = (row: ClassroomsTableRow): Room => ({
    id: row.id,
    name: row.name,
    short: row.short,
    buildingId: row.buildingid === '' ? null : row.buildingid,
    color: row.color,
});

export const mapClassesTableRow = (row: ClassesTableRow): Clazz => ({
    id: row.id,
    name: row.name,
    short: row.short,
    teacherId: row.teacherid === '' ? null : row.teacherid,
    color: row.color,
});

export const mapSubjectsTableRow = (row: SubjectsTableRow): Subject => ({
    id: row.id,
    name: row.name,
    short: row.short,
    color: row.color,
});

export const mapTeachersTableRow = (row: TeachersTableRow): Teacher => ({
    id: row.id,
    short: row.short,
    firstName: row.firstname ?? null,
    lastName: row.lastname ?? null,
    namePrefix: row.nameprefix ?? null,
    nameSuffix: row.namesuffix ?? null,
    color: row.color,
});

export const mapGroupsTableRow = (row: GroupsTableRow): Group => ({
    id: row.id,
    name: row.name,
    classId: row.classid,
    entireClass: row.entireclass,
    divisionId: row.divisionid,
    color: row.color,
});

export const mapDivisionsTableRow = (row: DivisionsTableRow): Division => ({
    id: row.id,
    groupIds: row.groupids,
});

export const mapStudentsTableRow = (row: StudentsTableRow): Student => ({
    id: row.id,
    short: row.short,
    firstName: row.firstname ?? null,
    lastName: row.lastname ?? null,
    classId: row.classid,
    groupIds: row.groupids,
});
