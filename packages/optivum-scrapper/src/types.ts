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

export type Lesson = {
    subjectCode: string | null;
    teacherId: number | null;
    teacherInitials: string | null;
    roomId: number | null;
    roomCode: string | null;
    classes: Class[];
    comment: string | null;
} & (
    | {
          subjectCode: string | null;
          interclassGroupCode: null;
      }
    | {
          subjectCode: string;
          interclassGroupCode: string;
      }
);

export interface LessonTimeSlot {
    lesson: Lesson;
    weekdayIndex: number;
    timeSlotIndex: number;
}

export interface TableData {
    fullName: string | undefined;
    generationDate: string | undefined;
    validationDate: string | undefined;
    timeSlots: TimeSlot[];
    timeSlotCount: number;
    weekdays: Weekday[];
    lessons: LessonTimeSlot[];
}
