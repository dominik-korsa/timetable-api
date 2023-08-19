import {School} from "../models/types.js";

export function getSchoolList(): School[] {
    return [
        {
            school: {
                mainSlug: {
                    type: 'county',
                    countySlug: 'zaganski',
                    townSlug: 'dlugie',
                    schoolSlug: 'sp'
                },
                alternativeSlugs: [],
                rspoId: 267617,
            },
            versions: [
                {
                    id: 'main',
                }
            ],
            latestVersionId: 'main'
        }
    ]
}
