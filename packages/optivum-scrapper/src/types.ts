export type UnitType = 'o' | 'n' | 's';

export interface Unit {
    id: string;
    type: UnitType;
    fullName: string;
}

export interface TimeSlot {
    index: number;
    name: string;
    beginMinute: number;
    endMinute: number;
}

export interface Day {
    index: number;
    name: string;
    isoNumber: number | null;
}

export interface LessonClass {
    id: string | null;
    short: string | null;
    groupShort: string | null;
}

export interface Lesson {
    subjectId: string | null;
    teacher: { id: string | null; short: string } | null;
    room: { id: string | null; short: string } | null;
    classes: LessonClass[];
    comment: string | null;
    interclassGroupId: string | null;
}

export interface LessonTimeSlot {
    lesson: Lesson;
    dayIndex: number;
    timeSlotIndex: number;
}
