import { Axios, AxiosResponse } from 'axios';
import {
    BuildingsTableRow,
    CardsTableRow,
    ClassesTableRow,
    ClassroomsTableRow,
    DaysDefsTableRow,
    DivisionsTableRow,
    GroupsTableRow,
    LessonsTableRow,
    PeriodsTableRow,
    StudentsTableRow,
    SubjectsTableRow,
    TeachersTableRow,
    TermsDefsTableRow,
    TimetableVersion,
    TimetableVersionInfo,
    TimetableVersionListRaw,
    TimetableVersionRaw,
    WeeksDefsTableRow,
} from './types.js';
import {
    mapPeriodsTableRow,
    mapDaysDefTableRow,
    mapWeeksDefTableRow,
    mapTermsDefTableRow,
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
            2099,
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

        return {
            common: {
                timeSlots: periodsTableRow.map(mapPeriodsTableRow),
                days: daysDefsTableRows.filter((daysDef) => daysDef.typ === 'one').map(mapDaysDefTableRow),
                weeks: weeksDefsTableRows.filter((weeksDef) => weeksDef.typ === 'one').map(mapWeeksDefTableRow),
                periods: termsDefsTableRows.filter((termsDef) => termsDef.typ === 'one').map(mapTermsDefTableRow),
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
                        const daysDefRow = daysDefsTableRows.find(
                            (daysDef) => daysDef.typ === 'one' && daysDef.vals.includes(cardsRow.days),
                        );
                        const weeksDefRow = weeksDefsTableRows.find(
                            (weeksDef) => weeksDef.typ === 'one' && weeksDef.vals.includes(cardsRow.weeks),
                        );
                        const termsDefRow = termsDefsTableRows.find(
                            (termsDef) => termsDef.typ === 'one' && termsDef.vals.includes(lessonsRow.terms),
                        );
                        if (!daysDefRow) {
                            throw Error('Missing daysDefRow');
                        };
                        if (!weeksDefRow) {
                            throw Error('Missing weeksDefRow');
                        };
                        if (!termsDefRow) {
                            throw Error('Missing termsDefRow');
                        };
                        return {
                            id: cardsRow.id,
                            timeSlotId: cardsRow.period,
                            dayId: daysDefRow.id,
                            weekId: weeksDefRow.id,
                            subjectId: lessonsRow.subjectid,
                            teacherIds: lessonsRow.teacherids,
                            roomIds: cardsRow.classroomids,
                            groupIds: lessonsRow.groupids,
                            classIds: lessonsRow.classids,
                            periodId: termsDefRow.id,
                            seminarGroup: lessonsRow.seminargroup,
                            studentIds: lessonsRow.studentids,
                        };
                    });
                })
                .flat(),
        };
    }
}
