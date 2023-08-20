export * from './models/index.js';
export * from './redis/storage.js'

export const slugify = (value: string) => value
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
