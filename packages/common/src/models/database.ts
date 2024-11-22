export interface SchoolsTable {
    rspo_id: number;
    name: string;
    generated_on: Date | null;
    commune_teryt: string;
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
    unique_id: number;
    school_rspo_id: number;
    generated_on: string;
    timetable_data: string;
    discriminant: number;
    hash: string;
}

export interface TimetableUrlsTable {
    id: number;
    school_rspo_id: number;
    timetable_version_id: number;
    last_check_at: Date;
    url: string;
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
