export interface TimetableClass {
    id: string;
   /**
    * The level (grade) of the class without a code, usually a number from 0 to 8.
    */
    level: string | null;
   /**
    * The short symbol representing the class, usually a letter.
    */
    order: string | null;
   /**
    * The combination of level and order.
    */
    code: string | null;
   /**
    * The extended name of the class.
    */
    longOrder: string | null;
   /**
    * The combination of code and longOrder.
    */
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
        validFrom: string;
        generationDate: string;
    }
    htmls: string[];
}
