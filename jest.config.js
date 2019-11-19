const { pathsToModuleNameMapper } = require('ts-jest/utils')
    // In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
    // which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = require('./tsconfig.test')

module.exports = {
    preset: 'ts-jest',
    testPathIgnorePatterns: ['node_modules', 'dist'],
    globals: {
        'ts-jest': {
            tsConfig: 'tsconfig.test.json',
        },
    },
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
    }),
}