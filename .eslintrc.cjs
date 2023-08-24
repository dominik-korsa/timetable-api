/* eslint-env node */
module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict-type-checked'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./packages/*/tsconfig.json'],
    },
    plugins: ['@typescript-eslint'],
    root: true,
    ignorePatterns: [
        "**/node_modules",
        "**/dist",
    ],
    rules: {
        "@typescript-eslint/no-unused-vars": "warn",
    }
};
