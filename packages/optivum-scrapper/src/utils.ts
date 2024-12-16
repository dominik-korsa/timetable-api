import { UnitType } from './types.js';
import { JSDOM } from 'jsdom';

const unitUrlRegex = /([ons])(\d+).html/;
export const parseUnitUrl = (url: string) => {
    const match = unitUrlRegex.exec(url);
    if (match === null) return null;
    return {
        type: match[1] as UnitType,
        id: match[2],
    };
};

export const parseUnitLink = (link: Element) => {
    const href = link.getAttribute('href');
    if (href === null) return null;
    return parseUnitUrl(href);
};

export const getUnitName = (fullName: string, short: string, type: UnitType) => {
    const regex = type === UnitType.TEACHER ? new RegExp(`^(.*?) \\(${short}\\)$`) : new RegExp(`^${short} (.*?)$`);
    return regex.exec(fullName)?.[1] ?? null;
};

/* SOURCE: https://github.com/dominik-korsa/timetable/blob/main/src/utils.ts */
export class DefaultsMap<K, V> extends Map<K, V> {
    private readonly generateDefault: (key: K) => V;

    constructor(defaultGenerator: (key: K) => V) {
        super();
        this.generateDefault = defaultGenerator;
    }

    override get(key: K): V {
        let value = super.get(key);
        if (value !== undefined) return value;
        value = this.generateDefault(key);
        this.set(key, value);
        return value;
    }
}

export const getDocument = (html: string) => new JSDOM(html).window.document;
