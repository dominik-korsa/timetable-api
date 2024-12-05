import { TimetableVersionDBTable } from './types';

/**
 * Converts a time string in the format "HH:MM" to the number of minutes since midnight.
 *
 * @param value A string representing the time, formatted as "HH:MM".
 * @returns The number of minutes since midnight.
 */
export const parseTime = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};

/**
 * Retrieves rows of a specific table by its id from a list of timetable version database tables.
 *
 * @template T The type of the data rows in the table.
 * @param tables An array of timetable version database tables.
 * @param id The id of the table to retrieve rows from.
 * @returns An array of rows of type T from the specified table.
 */
export const getTableRowsById = <T>(tables: TimetableVersionDBTable<unknown>[], id: string): T[] =>
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    (tables.find((table) => table.id === id) as TimetableVersionDBTable<T>).data_rows;
