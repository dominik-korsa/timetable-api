/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { createHash } from 'crypto';
import { LessonClass, Lesson } from './types.js';

export const parseTime = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};

const unitUrlRegex = /([ons])(\d+).html/;
export const parseUnitUrl = (url: string) => {
    const match = unitUrlRegex.exec(url);
    if (match === null) return null;
    return {
        type: match[1] as 'o' | 'n' | 's',
        id: match[2],
    };
};

export const parseUnitLink = (link: Element | null) => {
    if (link === null) return null;
    const href = link.getAttribute('href');
    if (href === null) return null;
    return parseUnitUrl(href);
};

export const splitByBr = (fragment: Element | DocumentFragment) => {
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
};

export const splitByComma = (fragment: Element | DocumentFragment) => {
    let lastBucket: ChildNode[] = [];
    const buckets = [lastBucket];
    fragment.childNodes.forEach((node) => {
        if (node.nodeName !== '#text') {
            lastBucket.push(node);
            return;
        }

        const parts = (node as Text).data.split(',');
        parts.forEach((part, index) => {
            if (index !== 0) {
                lastBucket = [];
                buckets.push(lastBucket);
            }
            if (part !== '') lastBucket.push(fragment.ownerDocument.createTextNode(part));
        });
    });
    return buckets.map((nodes) => {
        const childFragment = fragment.ownerDocument.createDocumentFragment();
        childFragment.append(...nodes);
        return childFragment;
    });
};

const parseTeacherFullNameRegex = /(.+?) \((.+?)\)/;
export const parseTeacherFullName = (fullName: string) => {
    const match = parseTeacherFullNameRegex.exec(fullName);
    return match ? { name: match[1], short: match[2] } : null;
};

export const parseLesson = (fragment: DocumentFragment): Lesson => {
    if (!fragment.querySelector('.p')) {
        return {
            teacher: null,
            room: null,
            classes: [],
            subjectId: null,
            interclassGroupId: null,
            comment: fragment.textContent?.trim() ?? null,
        };
    }

    // Interclass Group
    const interclassGroupTag = [...fragment.querySelectorAll('.p')].find(
        (subjectTag) => subjectTag.textContent?.startsWith('#'),
    );
    const interclassGroupId = interclassGroupTag?.textContent ?? null;
    interclassGroupTag?.remove();

    // Subject and common group
    const subjectTag = fragment.querySelector('.p')!;
    let subjectId = subjectTag.textContent!;
    let groupShort_: string | null = null;
    if (subjectId.includes('-') && interclassGroupId === null) {
        groupShort_ = subjectId.split('-')[subjectId.split('-').length - 1];
        subjectId = subjectId.replace(`-${groupShort_}`, '');
    }
    subjectTag.remove();

    // Room
    let room: { id: string | null; short: string } | null = null;
    const roomTag = fragment.querySelector('.s');
    if (roomTag !== null) {
        if (roomTag.textContent !== '@') {
            room = { id: parseUnitLink(roomTag)?.id ?? null, short: roomTag.textContent! };
        }
        roomTag.remove();
    }

    // Teacher
    let teacher: { id: string | null; short: string } | null = null;
    const teacherTag = fragment.querySelector('.n');
    if (teacherTag !== null) {
        teacher = { id: parseUnitLink(teacherTag)?.id ?? null, short: teacherTag.textContent! };
        teacherTag.remove();
    }

    // Classes and common groups
    let classes: LessonClass[] = [];
    if (fragment.querySelector('.o')) {
        classes = splitByComma(fragment).map((classDocument): LessonClass => {
            const classTag = classDocument.querySelector('.o')!;
            const id = parseUnitLink(classTag)?.id ?? null;
            const short = classTag.textContent ?? null;
            classTag.remove();
            let groupShort: string | null = groupShort_ ?? classDocument.textContent?.trim().replace('-', '') ?? null;
            if (groupShort === '') groupShort = null;
            return {
                id,
                short,
                groupShort,
            };
        });
    } else if (groupShort_ !== null) {
        classes.push({ id: null, short: null, groupShort: groupShort_ });
    }
    return {
        subjectId,
        teacher,
        room,
        classes,
        comment: null,
        interclassGroupId,
    };
};

export const getUnitKey = (unit: { id: string | null; short: string }) => (unit.id ?? `@${unit.short}`);

export const getTimetableHash = (htmls: string[]) =>
    createHash('sha512').update(JSON.stringify(htmls.sort())).digest('hex');
