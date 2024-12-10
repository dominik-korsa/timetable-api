import { Axios, AxiosResponse } from 'axios';
import {
    BuildingsTableRow,
    CardsTableRow,
    ClassesTableRow,
    ClassroomsTableRow,
    DaysDefsTableRow,
    DaysTableRow,
    GroupsTableRow,
    LessonsTableRow,
    PeriodsTableRow,
    StudentsTableRow,
    SubjectsTableRow,
    TeachersTableRow,
    TermsDefsTableRow,
    TermsTableRow,
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
    mapStudentsTableRow,
    mapDaysTableRow,
    mapWeeksTableRow,
    mapTermsTableRow,
} from './mappers.js';
import { getTableRowsById } from './utils.js';
import { parseTime, TimetableVersionData } from '@timetable-api/common';

interface ServerRequestPayload {
    __args: unknown[];
    __gsh: '00000000';
}

interface ServerResponse<T> {
    r: T;
}

export class Client {
    private readonly axios: Axios;
    private readonly baseURL: string;

    /**
     * Creates new instance of the class.
     * @param axios An axios instance for making HTTP requests.
     * @param edupageInstanceId An id of edupage instance eg. v-lo-krakow.
     */
    constructor(axios: Axios, edupageInstanceId: string) {
        this.axios = axios;
        this.baseURL = `https://${edupageInstanceId}.edupage.org/timetable/server`;
    }

    /**
     * Sends request to the EduPage timetable server API.
     * @template T The expected type of the response data.
     * @param controller The controller name for the API endpoint.
     * @param function_ Name of the function invoked by the controller.
     * @param args The arguments to pass in the request payload.
     * @returns A promise resolving to the response data of type T.
     */
    private async sendRequest<T>(controller: string, function_: string, args: unknown[]): Promise<T> {
        const url = `${this.baseURL}/${controller}?__func=${function_}`;
        const response = await this.axios.post<
            ServerResponse<T>,
            AxiosResponse<ServerResponse<T>, ServerRequestPayload>
        >(url, {
            __args: args,
            __gsh: '00000000',
        });
        return response.data.r;
    }

    /**
     * Fetches the list of timetable versions.
     * @returns A promise resolving to an array of timetable version list.
     */
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

    /**
     * Fetches and parses data for a specific timetable version.
     * @param number A identifier of the timetable version.
     * @returns A promise resolving to a parsed timetable version data.
     */
    public async getTimetableVersion(number: string): Promise<TimetableVersionData> {
        const response = await this.sendRequest<TimetableVersionRaw>('regulartt.js', 'regularttGetData', [
            null,
            number,
        ]);
        return this.parseTimetableVersion(response);
    }

    /**
     * Parses raw timetable data into a common format.
     * @param raw The raw timetable data returned by API.
     * @returns A parsed timetable version data.
     */
    private parseTimetableVersion(raw: TimetableVersionRaw): TimetableVersionData {
        const tables = raw.dbiAccessorRes.tables;
        const periodsTableRow = getTableRowsById<PeriodsTableRow>(tables, 'periods');
        const daysDefsTableRows = getTableRowsById<DaysDefsTableRow>(tables, 'daysdefs');
        const weeksDefsTableRows = getTableRowsById<WeeksDefsTableRow>(tables, 'weeksdefs');
        const termsDefsTableRows = getTableRowsById<TermsDefsTableRow>(tables, 'termsdefs');
        const daysTableRows = getTableRowsById<DaysTableRow>(tables, 'days');
        const weeksTableRows = getTableRowsById<WeeksTableRow>(tables, 'weeks');
        const termsTableRows = getTableRowsById<TermsTableRow>(tables, 'terms');
        const buildingsTableRows = getTableRowsById<BuildingsTableRow>(tables, 'buildings');
        const classroomsTableRows = getTableRowsById<ClassroomsTableRow>(tables, 'classrooms');
        const classesTableRows = getTableRowsById<ClassesTableRow>(tables, 'classes');
        const subjectsTableRows = getTableRowsById<SubjectsTableRow>(tables, 'subjects');
        const teachersTableRows = getTableRowsById<TeachersTableRow>(tables, 'teachers');
        const groupsTableRows = getTableRowsById<GroupsTableRow>(tables, 'groups');
        const studentsTableRows = getTableRowsById<StudentsTableRow>(tables, 'students');
        const lessonsTableRows = getTableRowsById<LessonsTableRow>(tables, 'lessons');
        const cardsTableRows = getTableRowsById<CardsTableRow>(tables, 'cards');
        const lessonsCards = new Map<string, CardsTableRow[]>();
        cardsTableRows.forEach((card) => {
            if (card.period === '' || card.days === '' || card.weeks === '') return;
            const existingLessonsCardsItem = lessonsCards.get(card.lessonid);
            if (existingLessonsCardsItem) existingLessonsCardsItem.push(card);
            else lessonsCards.set(card.lessonid, [card]);
        });
        return {
            common: {
                timeSlots: periodsTableRow.map(mapPeriodsTableRow),
                days: daysTableRows.map(mapDaysTableRow),
                weeks: weeksTableRows.map(mapWeeksTableRow),
                periods: termsTableRows.map(mapTermsTableRow),
                buildings: buildingsTableRows,
                rooms: classroomsTableRows.map(mapClassroomsTableRow),
                classes: classesTableRows.map(mapClassesTableRow),
                subjects: subjectsTableRows.map(mapSubjectsTableRow),
                teachers: teachersTableRows.map(mapTeachersTableRow),
                commonGroups: groupsTableRows.filter((row: GroupsTableRow) => !row.entireclass).map(mapGroupsTableRow),
                interclassGroups: [],
                students: studentsTableRows.map(mapStudentsTableRow),
            },
            lessons: lessonsTableRows
                .map((lessonsRow) => {
                    const cards = lessonsCards.get(lessonsRow.id) ?? [];
                    return cards.map((cardsRow) => {
                        const daysDef = daysDefsTableRows.find(
                            (daysDefsRow) => daysDefsRow.vals.length === 1 && daysDefsRow.vals[0] === cardsRow.days,
                        );
                        if (!daysDef) throw Error('Missing daysDef');
                        const weeksDef = weeksDefsTableRows.find(
                            (weeksDefsRow) => weeksDefsRow.vals.length === 1 && weeksDefsRow.vals[0] === cardsRow.weeks,
                        );
                        if (!weeksDef) throw Error('Missing weeksDef');
                        const termsDef = termsDefsTableRows.find(
                            (termsDefsRow) =>
                                termsDefsRow.vals.length === 1 && termsDefsRow.vals[0] === lessonsRow.terms,
                        );
                        if (!termsDef) throw Error('Missing termsDef');

                        const period = periodsTableRow.find((period) => period.id === cardsRow.period);
                        if (!period) throw Error('Missing period');

                        return {
                            timeSlotIndex: periodsTableRow.indexOf(period),
                            beginMinute: parseTime(period.starttime),
                            endMinute: parseTime(period.starttime),
                            dayIndex: daysDefsTableRows.indexOf(daysDef),
                            weekIndex: weeksDefsTableRows.indexOf(weeksDef),
                            periodIndex: termsDefsTableRows.indexOf(termsDef),
                            subjectId: lessonsRow.subjectid,
                            teacherIds: lessonsRow.teacherids,
                            roomIds: cardsRow.classroomids,
                            groupIds: lessonsRow.groupids.filter(
                                (group) => !(groupsTableRows.find((row) => row.id === group)?.entireclass ?? false),
                            ),
                            classIds: lessonsRow.classids,
                            seminarGroup: lessonsRow.seminargroup,
                            studentIds: lessonsRow.studentids,
                            interclassGroupId: null,
                            comment: null,
                        };
                    });
                })
                .flat(),
        };
    }

    /**
     * Fetches and parses data for all timetable versions.
     *
     * @returns A promise resolving to an array of timetable version data.
     */
    public async getAllVersions() {
        const versionList = await this.getTimetableVersionList();
        const versions = await Promise.all(
            versionList.map(async (version) => {
                const versionData = await this.getTimetableVersion(version.number);
                return { data: versionData, ...version };
            }),
        );
        return versions;
    }
}
