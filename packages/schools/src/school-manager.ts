import {School, SchoolSpecifier, SpecifierMinimum} from "@timetable-api/common";
import {RspoClient} from "./rspo/index.js";
import {RspoSchoolResponse} from "./rspo/types.js";
import {redisClient} from "./redis.js";
import {loadSchoolConfigs, loadTerritoriesConfig, TerritoriesResolvedConfig, updateRepo} from "./repo.js";
import {isDefined, slugify} from "./utils.js";

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

function createSpecifierStrings(specifier: SchoolSpecifier): string[] {
    const list: string[] = [];
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
        list.push(specifierParts.slice(0, parts).join(','));
    }
    return list;
}

export async function loadSchools(): Promise<School[]> {
    await updateRepo();

    const territoriesConfig = await loadTerritoriesConfig();
    const schoolConfigs = await loadSchoolConfigs();

    console.log('Loading school info...');
    return (await Promise.all(schoolConfigs.map(async (config) => {
        const rspoResponse = await rspoClient.getSchoolInfo(config.rspoId);
        const specifier = createSpecifier(rspoResponse, config.slug, territoriesConfig);
        const school: School = {
            rspoId: config.rspoId,
            specifier,
        };
        return school;
    }))).filter(isDefined);
}

export async function updateSchoolCache() {
    const schools = await loadSchools();

    const transaction = redisClient.multi();
    transaction.del("schools");
    transaction.del("school-specifiers");

    schools.forEach((school) => {
        transaction.hSet(
            "schools", school.rspoId, JSON.stringify(school),
        );
        createSpecifierStrings(school.specifier).forEach((string) => {
            transaction.hSet('school-specifiers', string, school.rspoId);
        });
    });

    console.log('Executing Redis transaction...');
    await transaction.exec();
    console.log('Done!');
}
