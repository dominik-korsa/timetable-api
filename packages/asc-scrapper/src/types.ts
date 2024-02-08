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
    name: string;
    short: string;
    typ: 'all' | 'any' | 'one';
    vals: string[];
    val: number | null;
}

export interface WeeksDefsTableRow {
    id: string;
    name: string;
    short: string;
    typ: 'all' | 'any' | 'one';
    vals: string[];
    val: number | null;
}

export interface TermsDefsTableRow {
    id: string;
    name: string;
    short: string;
    typ: 'all' | 'any' | 'one';
    vals: string[];
    val: number | null;
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
