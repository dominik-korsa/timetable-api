export interface SchoolInfo {
    rspoId: number | null,
    mainSlug: Slug,
    alternativeSlugs: Slug[],
}

export type Slug = {
    type: 'city',
    countySlug: string,
    schoolSlug: string,
} | {
    type: 'county',
    countySlug: string,
    townSlug: string,
    schoolSlug: string,
}

export interface School<T extends TimetableVersionInfo[] = TimetableVersionInfo[]> {
    school: SchoolInfo,
    versions: T,
    latestVersionId: T[number]["id"],
}

export interface TimetableVersionInfo {
    id: string,
}
