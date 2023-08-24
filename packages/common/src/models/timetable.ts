import {Static, Type} from "@sinclair/typebox";
import {Id, Nullable} from "./common.js";

const getWeekdayLiteral = <Name extends string, IsoNumber extends number>(name: Name, number: IsoNumber) => Type.Object({
   name: Type.Literal(name),
   isoNumber: Type.Literal(number),
});

export const TimetableWeekday = Type.Union([
    getWeekdayLiteral('poniedziałek', 1),
    getWeekdayLiteral('wtorek', 2),
    getWeekdayLiteral('środa', 3),
    getWeekdayLiteral('czwartek', 4),
    getWeekdayLiteral('piątek', 5),
    getWeekdayLiteral('sobota', 6),
    getWeekdayLiteral('niedziela', 7),
    Type.Object({
        name: Type.String(),
        isoNumber: Type.Null(),
    }),
]);
export type TimetableWeekday = Static<typeof TimetableWeekday>;

const TimetableTimeSlot = Type.Object({
    name: Type.String(),
    beginMinute: Type.Integer(),
    endMinute: Type.Integer(),
});
export type TimetableTimeSlot = Static<typeof TimetableTimeSlot>;

export const TimetableVersionCommon = Type.Object({
    weekdays: Type.Array(TimetableWeekday),
    timeSlots: Type.Array(TimetableTimeSlot),
    classes: Type.Array(Type.Object({
        name: Type.String(),
        id: Id(),
        slugs: Type.Array(Id(), { minItems: 1 }),
        hasTimetable: Type.Boolean(),
    })),
    rooms: Type.Array(Type.Object({
        name: Type.String(),
        id: Id(),
        slugs: Type.Array(Id(), { minItems: 1 }),
        hasTimetable: Type.Boolean(),
    })),
    teachers: Type.Array(Type.Object({
        initials: Type.String(),
        shortName: Type.String(),
        fullName: Type.String(),
        id: Id(),
        slugs: Type.Array(Id(), { minItems: 1 }),
        hasTimetable: Type.Boolean(),
    })),
});
export type TimetableVersionCommon = Static<typeof TimetableVersionCommon>;

const TimetableLesson = Type.Object({
    subject: Type.String(),
    subjectShort: Type.String(),
    teacherId: Nullable(Id()),
    roomId: Nullable(Id()),
    group: Nullable(Type.Object({
        id: Id(),
        name: Type.String(),
    })),
    classIds: Type.Array(Type.String()),
    color: Nullable(Type.String()),
});

const TimetableVersionLessons = Type.Object({
   weekdays: Type.Array(Type.Object({
      timeSlots: Type.Array(Type.Object({
         lessons: Type.Array(TimetableLesson),
      })),
   })),
});
