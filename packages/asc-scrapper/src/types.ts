export interface TimetableVersionListRaw {
    regular: {
        timetables: {
            tt_num: string;
            year: number;
            text: string;
            datefrom: string;
            hidden: boolean;
        }[];
    };
}

export interface TimetableVersionInfo {
    number: string;
    year: number;
    name: string;
    dateFrom: string;
    hidden: boolean;
}

export interface TimetableVersionDBTable<T> {
    id: string;
    data_rows: T[];
}

export interface PeriodsTableRow {
    id: string;
    name: string;
    short: string;
    starttime: string;
    endtime: string;
}

export interface DaysDefsTableRow {
    id: string;
    vals: string[];
}

export interface WeeksDefsTableRow {
    id: string;
    vals: string[];
}

export interface TermsDefsTableRow {
    id: string;
    vals: string[];
}

export interface BuildingsTableRow {
    id: string;
    name: string;
    short: string;
    color: string;
}

export interface ClassroomsTableRow {
    id: string;
    name: string;
    short: string;
    buildingid: string;
    color: string;
}

export interface ClassesTableRow {
    id: string;
    name: string;
    short: string;
    teacherid: string;
    color: string;
}
export interface SubjectsTableRow {
    id: string;
    name: string;
    short: string;
    color: string;
}
export interface TeachersTableRow {
    id: string;
    firstname: string | undefined;
    lastname: string | undefined;
    nameprefix: string | undefined;
    namesuffix: string | undefined;
    short: string;
    color: string;
}
export interface GroupsTableRow {
    id: string;
    name: string;
    classid: string;
    entireclass: boolean;
    divisionid: string;
    color: string;
}
export interface DivisionsTableRow {
    id: string;
    groupids: string[];
}
export interface StudentsTableRow {
    id: string;
    firstname: string | undefined;
    lastname: string | undefined;
    classid: string;
    short: string;
    groupids: string[];
}
export interface LessonsTableRow {
    id: string;
    subjectid: string;
    teacherids: string[];
    groupids: string[];
    classids: string[];
    terms: string;
    studentids: string[];
    seminargroup: number | null;
}
export interface CardsTableRow {
    id: string;
    lessonid: string;
    period: string;
    days: string;
    weeks: string;
    classroomids: string[];
}

export interface TimetableVersionRaw {
    dbiAccessorRes: {
        tables: [
            TimetableVersionDBTable<PeriodsTableRow>,
            TimetableVersionDBTable<DaysDefsTableRow>,
            TimetableVersionDBTable<WeeksDefsTableRow>,
            TimetableVersionDBTable<TermsDefsTableRow>,
            TimetableVersionDBTable<BuildingsTableRow>,
            TimetableVersionDBTable<ClassroomsTableRow>,
            TimetableVersionDBTable<ClassesTableRow>,
            TimetableVersionDBTable<SubjectsTableRow>,
            TimetableVersionDBTable<TeachersTableRow>,
            TimetableVersionDBTable<GroupsTableRow>,
            TimetableVersionDBTable<DivisionsTableRow>,
            TimetableVersionDBTable<StudentsTableRow>,
            TimetableVersionDBTable<LessonsTableRow>,
            TimetableVersionDBTable<CardsTableRow>,
        ];
    };
}

export interface TimetableVersion {
    common: {
        timeSlots: TimeSlot[];
        days: Day[];
        weeks: Week[];
        periods: Period[];
        buildings: Building[];
        rooms: Room[];
        classes: Clazz[];
        subjects: Subject[];
        teachers: Teacher[];
        groups: Group[];
        divisions: Division[];
        students: Student[];
    };
    lessons: Lesson[];
}

export interface TimeSlot {
    id: string;
    name: string;
    short: string;
    beginMinute: number;
    endMinute: number;
}

export interface Day {
    id: string;
    name: string;
    short: string;
}

export interface Week {
    id: string;
    name: string;
    short: string;
}

export interface Period {
    id: string;
    name: string;
    short: string;
}

export interface Building {
    id: string;
    name: string;
    short: string;
    color: string;
}

export interface Room {
    id: string;
    name: string;
    short: string;
    buildingId: string | null;
    color: string;
}

export interface Clazz {
    id: string;
    name: string;
    short: string;
    teacherId: string | null;
    color: string;
}

export interface Subject {
    id: string;
    name: string;
    short: string;
    color: string;
}

export interface Teacher {
    id: string;
    short: string;
    firstName: string | null;
    lastName: string | null;
    namePrefix: string | null;
    nameSuffix: string | null;
    color: string;
}

export interface Group {
    id: string;
    name: string;
    classId: string;
    entireClass: boolean;
    divisionId: string;
    color: string;
}

export interface Division {
    id: string;
    groupIds: string[];
}

export interface Student {
    id: string;
    short: string;
    firstName: string | null;
    lastName: string | null;
    classId: string;
    groupIds: string[];
}

export interface Lesson {
    id: string;
    timeSlotId: string;
    dayId: string;
    weekId: string;
    subjectId: string;
    teacherIds: string[];
    roomIds: string[];
    groupIds: string[];
    classIds: string[];
    periodId: string;
    seminarGroup: number | null;
    studentIds: string[];
}
