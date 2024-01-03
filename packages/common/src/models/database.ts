export interface SchoolColumn {
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

export interface OptivumTimetableVersionColumn {
    unique_id: number;
    school_rspo_id: number;
    generated_on: string;
    timetable_data: string;
    discriminant: number;
    hash: string;
}

export interface TimetableUrlColumn {
    id: number;
    school_rspo_id: number;
    timetable_version_id: number;
    last_check_at: Date;
    url: string;
}
