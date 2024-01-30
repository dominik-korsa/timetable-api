import { TimetableVersionDBTable } from './types';

export const parseTime = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};

export const getTableRowsById = <T>(tables: TimetableVersionDBTable<unknown>[], id: string): T[] =>
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    (tables.find((table) => table.id === id) as TimetableVersionDBTable<T>).data_rows;
