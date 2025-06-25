import { TimetableVersionData } from "@timetable-api/common";

export interface UnitList {
    units: Unit[];
    sources: string[];
}

export interface Unit {
    id: string;
    type: UnitType;
}

export enum UnitType {
    CLASS = 'o',
    TEACHER = 'n',
    ROOM = 's',
}

export interface TimeSlot {
    name: string;
    beginMinute: number;
    endMinute: number;
}

export interface Day {
    name: string;
    isoNumber: number | null;
}


export type Lesson =
    | {
          type: 'comment';
          comment: string;
      }
    | {
          type: 'default';
          subjectId: string;
          roomId: string | null;
          teacherId: string | null;
          classIds: Set<string>;
          groupIds: Set<string>;
          interclassGroupId: string | null;
      };

export interface CommonGroup {
    subjectId: string;
    classId: string;
    groupShort: string;
}

export type LessonTimeSlot = Lesson & {
    dayIndex: number;
    timeSlotIndex: number;
}

export type ClientLesson =
    | {
          type: 'comment';
          comment: string;
          classIds: Set<string>;
          teacherId: string | null;
          roomId: string | null;
      }
    | {
          type: 'default';
          subjectId: string;
          classIds: Set<string>;
          teacherId: string | null;
          roomId: string | null;
          groupIds: Set<string>;
          interclassGroupId: string | null;
      };

export interface ParsedMainTable {
    lessons: LessonTimeSlot[];
    subjects: Set<string>;
    roomShorts: Map<string, string>;
    teacherShorts: Map<string, string>;
    classShorts: Map<string, string>;
    groups: Map<string, CommonGroup>;
    interclassGroupIds: Set<string>;
}

export interface ParseResult {
    data: TimetableVersionData;
    validFrom: string | null;
    generatedDate: string;
}
