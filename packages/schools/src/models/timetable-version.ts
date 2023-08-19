import {Type} from "@sinclair/typebox";
import {Id, Nullable} from "@timetable-api/models";

const TimetableVersionCommon = Type.Object({
    weekdays: Type.Array(Type.Object({
        name: Type.String(),
    })),
    timeSlots: Type.Array(Type.Object({
        name: Type.String(),
        beginMinute: Type.Integer(),
        endMinute: Type.Integer(),
    })),
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

const TableLesson = Type.Object({
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
         lessons: Type.Array(TableLesson),
      })),
   })),
});
