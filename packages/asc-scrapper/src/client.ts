import { Axios, AxiosResponse } from 'axios';
import {
    BuildingsTableRow,
    CardsTableRow,
    ClassesTableRow,
    ClassroomsTableRow,
    DaysDefsTableRow,
    DaysTableRow,
    DivisionsTableRow,
    GroupsTableRow,
    LessonsTableRow,
    PeriodsTableRow,
    StudentsTableRow,
    SubjectsTableRow,
    TeachersTableRow,
    TermsDefsTableRow,
    TermsTableRow,
    TimetableVersion,
    TimetableVersionInfo,
    TimetableVersionListRaw,
    TimetableVersionRaw,
    WeeksDefsTableRow,
    WeeksTableRow,
} from './types.js';
import {
    mapPeriodsTableRow,
    mapClassroomsTableRow,
    mapClassesTableRow,
    mapSubjectsTableRow,
    mapTeachersTableRow,
    mapGroupsTableRow,
    mapDivisionsTableRow,
    mapStudentsTableRow,
} from './mappers.js';
import { getTableRowsById } from './utils.js';

interface ServerRequestPayload {
    __args: unknown[];
    __gsh: '00000000';
}

interface ServerResponse<T> {
    r: T;
}

export class Client {
    private readonly axios: Axios;

    constructor(axios: Axios, edupageInstanceId: string) {
        this.axios = axios;
        this.axios.defaults.baseURL = `https://${edupageInstanceId}.edupage.org/timetable/server`;
    }

    private async sendRequest<T>(controller: string, function_: string, args: unknown[]): Promise<T> {
        const url = `/${controller}?__func=${function_}`;
        const response = await this.axios.post<
            ServerResponse<T>,
            AxiosResponse<ServerResponse<T>, ServerRequestPayload>
        >(url, {
            __args: args,
            __gsh: '00000000',
        });
        return response.data.r;
    }

    public async getTimetableVersionList(): Promise<TimetableVersionInfo[]> {
        const response = await this.sendRequest<TimetableVersionListRaw>('ttviewer.js', 'getTTViewerData', [
            null,
            2099, // School year is apparently ignored by edupage
        ]);
        return response.regular.timetables.map((version) => ({
            number: version.tt_num,
            year: version.year,
            name: version.text,
            dateFrom: version.datefrom,
            hidden: version.hidden,
        }));
    }

    public async getTimetableVersion(number: string): Promise<TimetableVersion> {
        const response = await this.sendRequest<TimetableVersionRaw>('regulartt.js', 'regularttGetData', [
            null,
            number,
        ]);
        return this.parseTimetableVersion(response);
    }

    private parseTimetableVersion(raw: TimetableVersionRaw): TimetableVersion {
        const tables = raw.dbiAccessorRes.tables;
        const periodsTableRow = getTableRowsById<PeriodsTableRow>(tables, 'periods');
        const daysDefsTableRows = getTableRowsById<DaysDefsTableRow>(tables, 'daysdefs');
        const weeksDefsTableRows = getTableRowsById<WeeksDefsTableRow>(tables, 'weeksdefs');
        const termsDefsTableRows = getTableRowsById<TermsDefsTableRow>(tables, 'termsdefs');
        const daysTableRows = getTableRowsById<DaysTableRow>(tables, 'daysdefs');
        const weeksTableRows = getTableRowsById<WeeksTableRow>(tables, 'weeksdefs');
        const termsTableRows = getTableRowsById<TermsTableRow>(tables, 'termsdefs');
        const buildingsTableRows = getTableRowsById<BuildingsTableRow>(tables, 'buildings');
        const classroomsTableRows = getTableRowsById<ClassroomsTableRow>(tables, 'classrooms');
        const classesTableRows = getTableRowsById<ClassesTableRow>(tables, 'classes');
        const subjectsTableRows = getTableRowsById<SubjectsTableRow>(tables, 'subjects');
        const teachersTableRows = getTableRowsById<TeachersTableRow>(tables, 'teachers');
        const groupsTableRows = getTableRowsById<GroupsTableRow>(tables, 'groups');
        const divisionsTableRows = getTableRowsById<DivisionsTableRow>(tables, 'divisions');
        const studentsTableRows = getTableRowsById<StudentsTableRow>(tables, 'students');
        const lessonsTableRows = getTableRowsById<LessonsTableRow>(tables, 'lessons');
        const cardsTableRows = getTableRowsById<CardsTableRow>(tables, 'cards');

        const days = daysTableRows.map((day, index) => ({
            id: day.id,
            name: day.name,
            short: day.short,
            value: daysDefsTableRows[index].vals[0],
        }));
        const weeks = weeksTableRows.map((day, index) => ({
            id: day.id,
            name: day.name,
            short: day.short,
            value: weeksDefsTableRows[index].vals[0],
        }));
        const periods = termsTableRows.map((day, index) => ({
            id: day.id,
            name: day.name,
            short: day.short,
            value: termsDefsTableRows[index].vals[0],
        }));

        return {
            common: {
                timeSlots: periodsTableRow.map(mapPeriodsTableRow),
                days,
                weeks,
                periods,
                buildings: buildingsTableRows,
                rooms: classroomsTableRows.map(mapClassroomsTableRow),
                classes: classesTableRows.map(mapClassesTableRow),
                subjects: subjectsTableRows.map(mapSubjectsTableRow),
                teachers: teachersTableRows.map(mapTeachersTableRow),
                groups: groupsTableRows.map(mapGroupsTableRow),
                divisions: divisionsTableRows.map(mapDivisionsTableRow),
                students: studentsTableRows.map(mapStudentsTableRow),
            },
            lessons: lessonsTableRows
                .map((lessonsRow) => {
                    const cards = cardsTableRows.filter(
                        (cardsRow) =>
                            cardsRow.lessonid === lessonsRow.id &&
                            cardsRow.period !== '' &&
                            cardsRow.days !== '' &&
                            cardsRow.weeks !== '',
                    );
                    return cards.map((cardsRow) => {
                        const day = days.find(
                            (day) => day.value === cardsRow.days,
                        );
                        const week = weeks.find(
                            (week) => week.value === cardsRow.weeks,
                        );
                        const period = periods.find(
                            (term) => term.value === lessonsRow.terms,
                        );
                        if (!day) {
                            throw Error('Missing day');
                        }
                        if (!week) {
                            throw Error('Missing week');
                        }
                        if (!period) {
                            throw Error('Missing period');
                        }
                        return {
                            id: cardsRow.id,
                            timeSlotId: cardsRow.period,
                            dayId: day.id,
                            weekId: week.id,
                            subjectId: lessonsRow.subjectid,
                            teacherIds: lessonsRow.teacherids,
                            roomIds: cardsRow.classroomids,
                            groupIds: lessonsRow.groupids,
                            classIds: lessonsRow.classids,
                            periodId: period.id,
                            seminarGroup: lessonsRow.seminargroup,
                            studentIds: lessonsRow.studentids,
                        };
                    });
                })
                .flat(),
        };
    }
}
