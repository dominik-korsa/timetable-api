export interface TimetableClass {
    id: string;
   /**
    * The level (grade) of the class without a code, usually a number from 0 to 8, e. g. 1.
    */
    level: string | null;
   /**
    * The short symbol representing the class, usually a letter, e. g. A.
    */
    order: string | null;
   /**
    * The combination of level and order, e. g. 1A.
    */
    code: string | null;
   /**
    * The extended name of the class, e. g. 1 mat.
    */
    longOrder: string | null;
   /**
    * The combination of code and longOrder, e. g. 1A 1 mat.
    */
    fullName: string | null;
}

export interface TimetableTeacher {
    id: string;
    initials: string | null;
    name: string | null;
    fullName: string | null;
}

export interface TimetableRoom {
    id: string;
    code: string | null;
    name: string | null;
    fullName: string | null;
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
        validFrom: string | null;
        generationDate: string;
    }
    htmls: string[];
}
