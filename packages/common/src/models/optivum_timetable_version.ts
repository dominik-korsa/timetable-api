export interface TimetableClass {
    id: string;
    level: string | null;
    order: string | null;
    code: string | null;
    longOrder: string | null;
    fullName: string | null;
    slugs: string[];
}

export interface TimetableTeacher {
    id: string;
    initials: string | null;
    name: string | null;
    fullName: string | null;
    slugs: string[];
}

export interface TimetableRoom {
    id: string;
    code: string | null;
    name: string | null;
    fullName: string | null;
    slugs: string[];
}

export interface TimetableSubject {
    id: string;
    name: string | null;
}

export interface TimetableCommonGroup {
    id: string;
    code: string;
    classId: string;
    subjectId: string;
}

export interface TimetableInterclassGroup {
    id: string;
    subjectId: string;
    classIds: string[];
}

export interface TimetableTimeSlot {
    name: string;
    index: number;
    beginMinute: number;
    endMinute: number;
}

export interface TimetableWeekday {
    name: string;
    index: number;
    isoNumber: number | null;
}

export interface TimetableLesson {
    subjectId: string | null;
    teacherId: string | null;
    roomId: string | null;
    classes: {
        id: string;
        commonGroupId: string | null;
    }[];
    interclassGroupId: string | null;
    comment: string | null;
}

export interface TimetableVersionCommon {
    weekdays: TimetableWeekday[];
    timeSlots: TimetableTimeSlot[];
    classes: TimetableClass[];
    teachers: TimetableTeacher[];
    rooms: TimetableRoom[];
    subjects: TimetableSubject[];
    commonGroups: TimetableCommonGroup[];
    interclassGroups: TimetableInterclassGroup[];
}

export interface TimetableVersion {
    data: {
        common: TimetableVersionCommon;
        lessons: TimetableLesson[];
        validationDate: Date;
        generationDate: Date;
    }
    htmls: string[];
}
