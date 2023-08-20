import {TimetableVersionCommon} from "../timetable.js";

export interface TimetableVersionData {
    common: TimetableVersionCommon,
}

export interface TimetableVersionRedis {
    data: TimetableVersionData,
    nextCheck: string,
    lastCheck: string,
    lastCheckFailed: boolean,
}
