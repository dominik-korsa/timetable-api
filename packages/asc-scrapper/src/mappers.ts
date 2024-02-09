import {
    TimetableClass,
    TimetableCommonGroup,
    TimetableDay,
    TimetablePeriod,
    TimetableRoom,
    TimetableStudent,
    TimetableSubject,
    TimetableTeacher,
    TimetableTimeSlot,
    TimetableWeek,
    slugify,
} from '@timetable-api/common';
import {
    ClassesTableRow,
    ClassroomsTableRow,
    DaysTableRow,
    GroupsTableRow,
    PeriodsTableRow,
    StudentsTableRow,
    SubjectsTableRow,
    TeachersTableRow,
    TermsTableRow,
    WeeksTableRow,
} from './types.js';
import { parseTime } from './utils.js';

const weekdayIsoNumber: Record<string, number> = {
    poniedzialek: 1,
    wtorek: 2,
    sroda: 3,
    czwartek: 4,
    piatek: 5,
    sobota: 6,
    niedziela: 7,
};

export const mapPeriodsTableRow = (row: PeriodsTableRow): TimetableTimeSlot => ({
    id: row.id,
    name: row.name,
    short: row.short,
    beginMinute: parseTime(row.starttime),
    endMinute: parseTime(row.endtime),
});

export const mapDaysTableRow = (row: DaysTableRow): TimetableDay => ({
    id: row.id,
    name: row.name,
    short: row.short,
    isoNumber: weekdayIsoNumber[slugify(row.name)],
});

export const mapWeeksTableRow = (row: WeeksTableRow): TimetableWeek => ({
    id: row.id,
    name: row.name,
    short: row.short,
});

export const mapTermsTableRow = (row: TermsTableRow): TimetablePeriod => ({
    id: row.id,
    name: row.name,
    short: row.short,
});

export const mapClassroomsTableRow = (row: ClassroomsTableRow): TimetableRoom => ({
    id: row.id,
    name: row.name,
    short: row.short,
    fullName: `${row.short} ${row.name}`,
    buildingId: row.buildingid === '' ? null : row.buildingid,
    color: row.color,
});

export const mapClassesTableRow = (row: ClassesTableRow): TimetableClass => ({
    id: row.id,
    name: row.name,
    short: row.short,
    fullName: `${row.short} ${row.name}`,
    teacherId: row.teacherid === '' ? null : row.teacherid,
    color: row.color,
});

export const mapSubjectsTableRow = (row: SubjectsTableRow): TimetableSubject => ({
    id: row.id,
    name: row.name,
    short: row.short,
    color: row.color,
});

export const mapTeachersTableRow = (row: TeachersTableRow): TimetableTeacher => ({
    id: row.id,
    short: row.short,
    name: row.firstname !== undefined && row.lastname !== undefined ? `${row.firstname} ${row.lastname}` : null,
    fullName:
        row.firstname !== undefined && row.lastname !== undefined
            ? `${row.firstname} ${row.lastname} (${row.short})`
            : row.short,
    color: row.color,
});

export const mapGroupsTableRow = (row: GroupsTableRow): TimetableCommonGroup => ({
    id: row.id,
    short: row.name,
    classId: row.classid,
    entireClass: row.entireclass,
    color: row.color,
    subjectId: null,
});

export const mapStudentsTableRow = (row: StudentsTableRow): TimetableStudent => ({
    id: row.id,
    short: row.short,
    name: row.firstname !== undefined && row.lastname !== undefined ? `${row.firstname} ${row.lastname}` : null,
    classId: row.classid,
    groupIds: row.groupids,
});
