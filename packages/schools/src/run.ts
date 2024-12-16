import { handleInstitutionType } from './schools.js';

const INSTITUTION_TYPES = [
    93, // Branżowa szkoła I stopnia
    94, // Branżowa szkoła II stopnia
    97, // Branżowe Centrum Umiejętności
    45, // Centrum Kształcenia Praktycznego
    96, // Centrum Kształcenia Zawodowego
    89, // Inna szkoła artystyczna
    34, // Kolegium nauczycielskie
    65, // Kolegium Pracowników Służb Społecznych
    14, // Liceum ogólnokształcące
    17, // Liceum ogólnokształcące uzupełniające dla absolwentów zasadniczych szkół zawodowych
    15, // Liceum profilowane
    27, // Liceum sztuk plastycznych
    54, // Młodzieżowy Ośrodek Socjoterapii ze szkołami
    75, //Niepubliczna placówka kształcenia ustawicznego i praktycznego
    83, // Niepubliczna placówka kształcenia ustawicznego i praktycznego ze szkołami
    64, // Niepubliczna placówka oświatowo-wychowawcza w systemie oświaty
    29, // Ogólnokształcąca szkoła baletowa
    21, // Ogólnokształcąca szkoła muzyczna I stopnia
    24, // Ogólnokształcąca szkoła muzyczna II stopnia
    26, // Ogólnokształcąca szkoła sztuk pięknych
    47, // Ośrodek dokształcania i doskonalenia zawodowego
    74, // Placówka Kształcenia Ustawicznego - bez szkół
    46, // Placówka Kształcenia Ustawicznego ze szkołami
    91, // Policealna szkoła muzyczna
    92, // Policealna szkoła plastyczna
    51, // Specjalny Ośrodek Szkolno-Wychowawczy
    50, // Specjalny Ośrodek Wychowawczy
    85, // Szkoła muzyczna I stopnia
    86, // Szkoła muzyczna II stopnia
    3, // Szkoła podstawowa
    19, // Szkoła policealna
    20, // Szkoła specjalna przysposabiająca do pracy
    16, // Technikum
    100, // Zespół szkół i placówek oświatowych
]

async function main() {
    await Promise.all(INSTITUTION_TYPES.map(async typeId => { await handleInstitutionType(typeId) }))
}

main()
    .then(() => {
        process.exit();
    })
    .catch((error: unknown) => {
        console.error(error);
    });
