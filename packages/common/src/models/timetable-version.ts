export interface TimetableTimeSlot {
    name: string;
    beginMinute: number;
    endMinute: number;
}

export interface TimetableDay {
    name: string;
    short: string | null;
    isoNumber: number | null;
}

export interface TimetableWeek {
    name: string;
    short: string;
}

export interface TimetablePeriod {
    name: string;
    short: string;
}

export interface TimetableBuilding {
    id: string;
    name: string;
    short: string;
    color: string;
}

export interface TimetableRoom {
    id: string;
    name: string | null;
    short: string | null;
    fullName: string | null;
    buildingId: string | null;
    color: string | null;
}

export interface TimetableClass {
    id: string;
    name: string | null;
    short: string | null;
    fullName: string | null;
    teacherId: string | null;
    color: string | null;
}

export interface TimetableSubject {
    id: string;
    name: string | null;
    short: string;
    color: string | null;
}

export interface TimetableTeacher {
    id: string;
    name: string | null;
    short: string | null;
    fullName: string | null;
    color: string | null;
}

export interface TimetableCommonGroup {
    id: string;
    short: string;
    classId: string;
    color: string | null;
    subjectId: string | null;
}

export interface TimetableInterclassGroup {
    id: string;
    classIds: string[];
}

export interface TimetableStudent {
    id: string;
    name: string | null;
    short: string;
    classId: string;
    groupIds: string[];
}

export interface TimetableLesson {
    timeSlotIndex: number | null;
    beginMinute: number;
    endMinute: number;
    dayIndex: number;
    weekIndex: number | null;
    periodIndex: number | null;
    subjectId: string | null;
    teacherIds: string[];
    roomIds: string[];
    groupIds: string[];
    classIds: string[];
    seminarGroup: number | null;
    studentIds: string[];
    interclassGroupId: string | null;
    comment: string | null;
}

export interface TimetableVersionData {
    schemaVersion: string;
    common: {
        timeSlots: TimetableTimeSlot[];
        days: TimetableDay[];
        weeks: TimetableWeek[];
        periods: TimetablePeriod[];
        buildings: TimetableBuilding[];
        rooms: TimetableRoom[];
        classes: TimetableClass[];
        subjects: TimetableSubject[];
        teachers: TimetableTeacher[];
        commonGroups: TimetableCommonGroup[];
        interclassGroups: TimetableInterclassGroup[];
        students: TimetableStudent[];
    };
    lessons: TimetableLesson[];
}
