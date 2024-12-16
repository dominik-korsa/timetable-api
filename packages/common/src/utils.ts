export const slugify = (value: string) =>
    value
        .trim()
        .toLocaleLowerCase('pl')
        .replaceAll('ą', 'a')
        .replaceAll('ć', 'c')
        .replaceAll('ę', 'e')
        .replaceAll('ł', 'l')
        .replaceAll('ń', 'n')
        .replaceAll('ó', 'o')
        .replaceAll('ś', 's')
        .replaceAll('ź', 'z')
        .replaceAll('ż', 'z')
        .replaceAll(/[^a-z0-9]/g, '-');

export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export const maxUsing = <T>(items: T[], greaterThan: (lhs: T, rhs: T) => boolean) =>
    items.reduce((lhs, rhs) => (greaterThan(lhs, rhs) ? lhs : rhs));

export const maxBy = <T>(items: T[], field: (item: T) => number) =>
    maxUsing(items, (lhs, rhs) => field(lhs) > field(rhs));

/**
 * Converts a time string in the format "HH:MM" to the number of minutes since midnight.
 *
 * @param value A string representing the time, formatted as "HH:MM".
 * @returns The number of minutes since midnight.
 */
export const parseTime = (value: string) => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};
