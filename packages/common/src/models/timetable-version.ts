export interface TimetableTimeSlot {
    id: string;
    name: string;
    short: string;
    beginMinute: number;
    endMinute: number;
}

export interface TimetableDay {
    id: string;
    name: string;
    short: string;
    isoNumber: number | null;
}

export interface TimetableWeek {
    id: string;
    name: string;
    short: string;
}

export interface TimetablePeriod {
    id: string;
    name: string;
    short: string;
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
    entireClass: boolean;
    color: string | null;
    subjectId: string | null;
}

export interface TimetableInterclassGroup {
    id: string;
    subjectId: string;
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
    id: string | null;
    timeSlotId: string;
    dayId: string;
    weekId: string | null;
    subjectId: string;
    teacherIds: string[];
    roomIds: string[];
    groupIds: string[];
    classIds: string[];
    periodId: string | null;
    seminarGroup: number | null;
    studentIds: string[];
    interclassGroupId: string | null;
}

export interface TimetableVersionData {
    common: {
        timeSlots: TimetableTimeSlot[];
        days: TimetableDay[];
        weeks: TimetableWeek[];
        periods: TimetablePeriod[];
        rooms: TimetableRoom[];
        classes: TimetableClass[];
        subjects: TimetableSubject[];
        teachers: TimetableTeacher[];
        commonGroups: TimetableCommonGroup[];
        interclassGroups: TimetableInterclassGroup[];
        students: TimetableStudent[];
    }
    lessons: TimetableLesson[];
}
