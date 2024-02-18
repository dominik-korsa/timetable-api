/* eslint-env node */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/stylistic-type-checked',
        'plugin:@typescript-eslint/strict-type-checked',
        'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./packages/*/tsconfig.json'],
    },
    plugins: ['@typescript-eslint'],
    root: true,
    ignorePatterns: ['**/node_modules', '**/dist'],
    rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'error',
        '@typescript-eslint/prefer-regexp-exec': 'error',
        'arrow-body-style': ['error', 'as-needed'],
    },
    overrides: [
        {
            files: ['tests/**'],
            env: {
                jest: true,
            },
        },
    ],
};
