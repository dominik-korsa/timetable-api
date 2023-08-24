import { JSDOM } from 'jsdom';

export const parseTime = (value: string): number => {
    const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
    return hours * 60 + minutes;
};

export const extractClassLevelAndOrderFromCode = (code: string): RegExpMatchArray | null =>
    code.match('(0-8|r|t|c|p)(.+?)');

export const extractUnitSymbolAndIdFromUrl = (url: string): RegExpMatchArray | null =>
    url.match('(o|n|s)([0-9]+).html');

export const parseLesson = (document: Document) => {
    let groupCode: string | null;
    let interclassGroupCode;
    let roomId;
    let roomCode;
    let teacherId;
    let teacherInitials;
    if (!document.querySelector('.p')) {
        return {
            teacherId: null,
            teacherInitials: null,
            roomId: null,
            roomCode: null,
            classes: [],
            subjectCode: null,
            interclassGroupCode: null,
            comment: document.documentElement.textContent?.trim(),
        };
    }
    let subjectCode = Array.from(document.querySelectorAll('.p'))
        .map((subjectTag) => subjectTag.textContent)
        .join('');
    document.querySelectorAll('.p').forEach((subjectTag) => {
        subjectTag.remove();
    });
    if (subjectCode.includes('-')) {
        groupCode = subjectCode.split('-')[subjectCode.split('-').length - 1];
        subjectCode = subjectCode.replace(`-${groupCode}`, '');
    }
    if (subjectCode.includes('#')) {
        interclassGroupCode = subjectCode.split('#')[subjectCode.split('#').length - 1];
        subjectCode = subjectCode.replace(`#${interclassGroupCode}`, '');
    }
    if (document.querySelector('.s') && document.querySelector('.s')?.textContent !== '@') {
        const roomTag = document.querySelector('.s');
        const href = roomTag?.getAttribute('href');
        roomId = href ? Number(extractUnitSymbolAndIdFromUrl(href)?.[2]) : null;
        roomCode = roomTag?.textContent;
        roomTag?.remove();
    }
    if (document.querySelector('.n')) {
        const teacherTag = document.querySelector('.n');
        const href = teacherTag?.getAttribute('href');
        teacherId = href ? Number(extractUnitSymbolAndIdFromUrl(href)?.[2]) : null;
        teacherInitials = teacherTag?.textContent;
        teacherTag?.remove();
    }
    const classes = document.documentElement.innerHTML.split('<br>').map((class_) => {
        const classDocument = new JSDOM(class_).window.document;
        const classTag = classDocument.querySelector('.o');
        const href = classTag?.getAttribute('href');
        const id = href ? extractUnitSymbolAndIdFromUrl(href)?.[1] : null;
        const code = classTag?.textContent;
        classTag?.remove();
        if (classDocument.documentElement.textContent) {
            groupCode = classDocument.documentElement.textContent;
        }
        return { id, code, groupCode };
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
