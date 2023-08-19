import {loadSchoolConfigs, loadTerritoriesConfig, TerritoriesResolvedConfig, updateRepo} from "../repo/index.js";
import {SchoolSpecifier, SpecifierMinimum} from "@timetable-api/models";
import {RspoClient} from "../rspo/index.js";
import {RspoSchoolResponse} from "../rspo/types.js";
import {slugify} from "../utils/index.js";
import {redisClient} from "../redis.js";

const rspoClient = new RspoClient();

function createSpecifier(
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

export async function updateSchoolCache() {
    await updateRepo();
    const territoriesConfig = await loadTerritoriesConfig();
    const schoolConfigs = await loadSchoolConfigs();
    const transaction = redisClient.multi();
    transaction.del("schools");
    transaction.del("school-specifiers");

    await Promise.all(schoolConfigs.map(async (config) => {
        const rspoResponse = await rspoClient.getSchoolInfo(config.rspoId);
        const specifier = createSpecifier(rspoResponse, config.slug, territoriesConfig);
        const school = {
            rspoId: config.rspoId,
            specifier,
        };
        transaction.hSet(
            "schools", config.rspoId, JSON.stringify(school),
        );
        const specifierParts = [
            specifier.schoolSlug,
            specifier.areaType,
            specifier.communeSlug,
            specifier.countySlug,
            specifier.voivodeshipSlug,
        ];
        const minParts = ({
            voivodeship: 5,
            county: 4,
            commune: 3,
        } satisfies Record<SpecifierMinimum, number>)[specifier.minimum];
        for (let parts = minParts; parts <= specifierParts.length; ++parts) {
            const specifier = specifierParts.slice(0, parts).join(',');
            transaction.hSet('school-specifiers', specifier, config.rspoId);
        }
    }));

    console.log('Executing Redis transaction...');
    await transaction.exec();
    console.log('Done!');
}
