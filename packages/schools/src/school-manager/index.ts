import {loadSchoolConfigs, loadTerritoriesConfig, TerritoriesResolvedConfig, updateRepo} from "../repo/index.js";
import {School, SchoolSpecifier, SpecifierMinimum} from "@timetable-api/models";
import {RspoClient} from "../rspo/index.js";
import {RspoSchoolResponse} from "../rspo/types.js";
import {slugify} from "../utils/index.js";

export class SchoolManager {
    private schoolMap = new Map<number, School>();
    private specifierMap = new Map<string, School>();

    private readonly rspoClient = new RspoClient();

    private static createSpecifier(
        rspoResponse: RspoSchoolResponse,
        schoolSlug: string,
        territoriesConfig: TerritoriesResolvedConfig,
    ): SchoolSpecifier {
        const countySlug = slugify(rspoResponse.powiat);

        // Miasto na prawach powiatu
        const isCity = parseInt(rspoResponse.powiatKodTERYT.substring(2, 4), 10) > 60;

        // gmina wiejska albo obszar wiejski gminy miejsko-wiejskiej
        const isRural = !isCity && (rspoResponse.gminaRodzajKod === '2' || rspoResponse.gminaRodzajKod === '5');

        const isDuplicateTown = !isCity && territoriesConfig.duplicateTowns.has(rspoResponse.gminaKodTERYT);

        let minimum: SpecifierMinimum = isRural || isDuplicateTown ? 'county' : 'commune';
        if (minimum === 'county' && territoriesConfig.duplicateCounties.has(rspoResponse.powiatKodTERYT)) minimum = 'voivodeship';

        return {
            schoolSlug,
            countySlug,
            communeSlug: isCity ? countySlug : slugify(rspoResponse.gmina),
            areaType: isRural ? 'rural' : 'urban',
            minimum,
            voivodeshipSlug: slugify(rspoResponse.wojewodztwo),
        }
    }

    async load() {
        await updateRepo();
        const territoriesConfig = await loadTerritoriesConfig();
        const schoolConfigs = await loadSchoolConfigs();
        const newSchoolMap = new Map<number, School>();
        const newSpecifierMap = new Map<string, School>;
        await Promise.all(schoolConfigs.map(async (config) => {
            const rspoResponse = await this.rspoClient.getSchoolInfo(config.rspoId);
            const specifier = SchoolManager.createSpecifier(rspoResponse, config.slug, territoriesConfig);
            const school = {
                rspoId: config.rspoId,
                specifier,
            };
            newSchoolMap.set(config.rspoId, school);
            const specifierParts = [
                specifier.schoolSlug,
                specifier.areaType,
                specifier.communeSlug,
                specifier.countySlug,
                specifier.voivodeshipSlug,
            ];
            console.log(JSON.stringify(school));
            const minParts = ({
                voivodeship: 5,
                county: 4,
                commune: 3,
            } satisfies Record<SpecifierMinimum, number>)[specifier.minimum];
            for (let parts = minParts; parts <= specifierParts.length; ++parts) {
                newSpecifierMap.set(specifierParts.slice(0, parts).join(','), school);
            }
        }));
        this.schoolMap = newSchoolMap;
        this.specifierMap = newSpecifierMap;
        console.log(newSpecifierMap.keys());
    }

    getSchoolByRspoId(rspoId: number): School | undefined {
        return this.schoolMap.get(rspoId);
    }
}
