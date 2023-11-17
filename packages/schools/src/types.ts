export interface School {
    rspoId: number;
    name: string;
    schoolTypeId: number;
    voivodeshipTERYT: string;
    communeTERYT: string;
    countyTERYT: string;
    townTERYT: string;
    geolocation: {
        latitude: string;
        longitude: string;
    }
    correspondenceAddress: {
        town: string;
        street: string;
        buildingNumber: string;
        apartamentNumber: string;
        zipCode: string;
    };
    website: string;
}
