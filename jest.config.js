module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: './',
    transform: { '^.+\\.ts?$': 'ts-jest' },
    testPathIgnorePatterns: ['<rootDir/node_modules>'],
    moduleFileExtensions: ['ts', 'js'],
    projects: [
        {
            displayName: 'ASC Scrapper',
            testEnvironment: 'node',
            transform: { '^.+\\.ts?$': 'ts-jest' },
            testMatch: ['<rootDir>/packages/asc-scrapper/tests/*.test.ts']
        },
    ]
};
