/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { createHash } from 'crypto';
import { UnitType } from './types.js';
import { JSDOM } from 'jsdom';

export const parseTime = (value: string) => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};

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

/*export const splitByBr = (fragment: Element | DocumentFragment) => {
    let lastBucket: ChildNode[] = [];
    const buckets = [lastBucket];
    fragment.childNodes.forEach((node) => {
        if (node.nodeName === 'BR') {
            lastBucket = [];
            buckets.push(lastBucket);
            return;
        }
        lastBucket.push(node);
    });
    return buckets.map((nodes) => {
        const childFragment = fragment.ownerDocument.createDocumentFragment();
        childFragment.append(...nodes);
        return childFragment;
    });
};*/

export const splitByBr = (fragment: Element | DocumentFragment) => {
    const buckets: ChildNode[][] = [[]];
    fragment.childNodes.forEach((node) => {
        if (node.nodeName === 'BR') buckets.push([]);
        else buckets[buckets.length - 1].push(node);
    });
    return buckets.map((nodes) => {
        const childFragment = fragment.ownerDocument.createDocumentFragment();
        childFragment.append(...nodes);
        return childFragment;
    });
};

export const getUnitKey = (id: string | null, short: string) => id ?? `@${short}`;

export const createKeyFromShort = (short: string) => `@${short}`;

export const getTimetableHash = (htmls: string[]) =>
    createHash('sha512').update(JSON.stringify(htmls.sort())).digest('hex');

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
