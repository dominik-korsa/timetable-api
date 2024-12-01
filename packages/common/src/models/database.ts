export interface SchoolsTable {
    rspo_id: number;
    name: string;
    generated_on: Date | null;
    voivodeship_teryt: string;
    commune_teryt: string;
    county_teryt: string;
    geo_lat: string | null;
    geo_long: string | null;
    corresp_addr_town: string;
    corresp_addr_street: string;
    corresp_addr_building_nr: string;
    corresp_addr_apartament_nr: string;
    corresp_addr_zip_code: string;
    website_url: string | null;
    institution_type: number;
}

export interface OptivumTimetableVersionsTable {
    id: number;
    data: string;
    hash: string;
    generated_on: string;
}

export interface OptivumTimetableVersionSchoolsTable {
    id: number;
    optivum_timetable_version_id: number;
    school_rspo_id: number;
}

export interface OptivumTimetableVersionSourcesTable {
    id: number;
    optivum_timetable_version_id: number;
    last_checked_at: Date;
    sources: string[];
}

export interface OptivumCandidatesTable {
    id: number;
    school_rspo_ids: number[];
    sources: string[];
    unit_list: string;
    added_at: Date;
}

export interface EdupageInstancesTable {
    id: number;
    instance_name: string;
    school_rspo_id: number;
    found_on: Date;
}

export interface EdupageTimetableVersionsTable {
    id: number;
    edupage_instance_name: string;
    number: string;
    date_from: string;
    data: string;
    found_on: Date;
}
