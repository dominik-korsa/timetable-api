import { Class, Lesson } from './types.js';

export const parseTime = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};

const unitUrlRegex = /([ons])(\d+).html/;
export const parseUnitUrl = (url: string) => {
    const match = unitUrlRegex.exec(url);
    if (match === null) return null;
    return {
        type: match[1],
        id: parseInt(match[2], 10),
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
    return match ? { name: match[1], initials: match[2] } : null;
};

const parseClassCodeRegex = /([0-9]|r|t|c|p)(.+?)/;
export const parseClassCode = (code: string) => {
    const match = parseClassCodeRegex.exec(code);
    return match ? { level: match[1], order: match[2] } : null;
};

export const parseLesson = (fragment: DocumentFragment): Omit<Lesson, 'rowIndex' | 'columnIndex'> => {
    if (!fragment.querySelector('.p')) {
        return {
            teacherId: null,
            teacherInitials: null,
            roomId: null,
            roomCode: null,
            classes: [],
            subjectCode: null,
            interclassGroupCode: null,
            comment: fragment.textContent?.trim() ?? null,
        };
    }

    let commonGroupCode: string | null = null;
    let interclassGroupCode: string | null = null;
    let roomId: number | null = null;
    let roomCode: string | null = null;
    let teacherId: number | null = null;
    let teacherInitials: string | null = null;

    let subjectCode = [...fragment.querySelectorAll('.p')].map((subjectTag) => subjectTag.textContent).join('');
    fragment.querySelectorAll('.p').forEach((subjectTag) => {
        subjectTag.remove();
    });
    if (subjectCode.includes('-')) {
        commonGroupCode = subjectCode.split('-')[subjectCode.split('-').length - 1];
        subjectCode = subjectCode.replace(`-${commonGroupCode}`, '');
    }
    if (subjectCode.includes('#')) {
        interclassGroupCode = subjectCode.split('#')[subjectCode.split('#').length - 1];
        subjectCode = subjectCode.replace(`#${interclassGroupCode}`, '');
    }

    const roomTag = fragment.querySelector('.s');
    if (roomTag !== null) {
        if (roomTag.textContent !== '@') {
            roomId = parseUnitLink(roomTag)?.id ?? null;
            roomCode = roomTag.textContent ?? null;
        }
        roomTag.remove();
    }

    const teacherTag = fragment.querySelector('.n');
    if (teacherTag !== null) {
        teacherId = parseUnitLink(teacherTag)?.id ?? null;
        teacherInitials = teacherTag.textContent;
        teacherTag.remove();
    }
    const classes = splitByComma(fragment).map((classDocument): Class => {
        const classTag = classDocument.querySelector('.o');
        const id = parseUnitLink(classTag)?.id ?? null;
        const code = classTag?.textContent ?? null;
        classTag?.remove();
        let groupCode = commonGroupCode ?? classDocument.textContent?.trim().replace('-', '') ?? null;
        if (groupCode === '') groupCode = null;
        return {
            id,
            code,
            groupCode,
        };
    });
    return {
        subjectCode,
        teacherId,
        teacherInitials,
        roomId,
        roomCode,
        classes,
        comment: null,
        interclassGroupCode,
    };
};
