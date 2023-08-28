import { Static, Type } from '@fastify/type-provider-typebox';
import { Id, Nullable } from './common.js';

export const TimetableWeekday = Type.Object({
    index: Type.Number(),
    name: Type.String(),
    isoNumber: Nullable(Type.Number()),
});

export type TimetableWeekday = Static<typeof TimetableWeekday>;

const TimetableTimeSlot = Type.Object({
    index: Type.Number(),
    name: Type.String(),
    beginMinute: Type.Integer(),
    endMinute: Type.Integer(),
});
export type TimetableTimeSlot = Static<typeof TimetableTimeSlot>;

const TimetableClass = Type.Object({
    id: Id(),
    level: Nullable(Type.String()),
    order: Nullable(Type.String()),
    code: Nullable(Type.String()),
    longOrder: Nullable(Type.String()),
    fullName: Nullable(Type.String()),
    slugs: Type.Array(Id(), { minItems: 1 }),
});
export type TimetableClass = Static<typeof TimetableClass>;

const TimetableTeacher = Type.Object({
    id: Id(),
    initials: Nullable(Type.String()),
    name: Nullable(Type.String()),
    fullName: Nullable(Type.String()),
    slugs: Type.Array(Id(), { minItems: 1 }),
});
export type TimetableTeacher = Static<typeof TimetableTeacher>;

const TimetableRoom = Type.Object({
    id: Id(),
    code: Nullable(Type.String()),
    name: Nullable(Type.String()),
    fullName: Nullable(Type.String()),
    slugs: Type.Array(Id(), { minItems: 1 }),
});
export type TimetableRoom = Static<typeof TimetableRoom>;

const TimetableSubject = Type.Object({
    id: Id(),
    name: Nullable(Type.String()),
});
export type TimetableSubject = Static<typeof TimetableSubject>;

const TimetableCommonGroup = Type.Object({
    id: Id(),
    classId: Id(),
    subjectId: Id(),
    code: Type.String(),
});
export type TimetableCommonGroup = Static<typeof TimetableCommonGroup>;

const TimetableInterclassGroup = Type.Object({
    id: Id(),
    classIds: Type.Array(Id()),
    subjectId: Id(),
});
export type TimetableInterclassGroup = Static<typeof TimetableInterclassGroup>;

export const TimetableVersionCommon = Type.Object({
    weekdays: Type.Array(TimetableWeekday),
    timeSlots: Type.Array(TimetableTimeSlot),
    classes: Type.Array(TimetableClass),
    rooms: Type.Array(TimetableRoom),
    teachers: Type.Array(TimetableTeacher),
    subjects: Type.Array(TimetableSubject),
    commonGroups: Type.Array(TimetableCommonGroup),
    interclassGroup: Type.Array(TimetableInterclassGroup),
});
export type TimetableVersionCommon = Static<typeof TimetableVersionCommon>;

const TimetableLesson = Type.Object({
    subjectId: Nullable(Id()),
    teacherId: Nullable(Id()),
    roomId: Nullable(Id()),
    classes: Type.Array(
        Type.Object({
            id: Id(),
            commonGroupId: Nullable(Id()),
        }),
    ),
    interclassGroupId: Nullable(Id()),
    comment: Nullable(Type.String()),
});
export type TimetableLesson = Static<typeof TimetableLesson>;

const TimetableVersionLessons = Type.Object({
    lessons: Type.Array(TimetableLesson),
});
export type TimetableVersionLessons = Static<typeof TimetableVersionLessons>;
