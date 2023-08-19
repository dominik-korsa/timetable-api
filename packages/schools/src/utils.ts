export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

export const slugify = (value: string) => value
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
    .replaceAll(/[^a-z]/g, '-')
