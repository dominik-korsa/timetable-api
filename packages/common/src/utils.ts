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
        .replaceAll(/[^a-z]/g, '-');

export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
