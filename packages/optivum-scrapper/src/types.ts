export interface UnitList {
    classIds: number[];
    teacherIds: number[];
    roomIds: number[];
}

export interface TimeSlot {
    index: number;
    name: string;
    beginMinute: number;
    endMinute: number;
}

export interface Weekday {
    index: number;
    name: string;
    isoNumber: number;
}

export interface Class {
    id: number | null;
    code: string | null;
    groupCode: string | null;
}

export interface Lesson {
    rowIndex: number;
    columnIndex: number;
    subjectCode: string | null;
    teacherId: number | null;
    teacherInitials: string | null;
    roomId: number | null;
    roomCode: string | null;
    classes: Class[];
    interclassGroupCode: string | null;
    comment: string | null;
}

export interface TableData {
    fullName: string | undefined;
    generationDate: string | undefined;
    validationDate: string | undefined;
    timeSlots: TimeSlot[];
    weekdays: Weekday[];
    lessons: Lesson[];
}
