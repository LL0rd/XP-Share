module.exports = {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,vue}',
    '!**/?(*.)+(spec|test|story).js?(x)',
    '!**/node_modules/**',
    '!**/.nuxt/**',
    '!**/storybook/**',
    '!**/coverage/**',
    '!**/config/**',
    '!**/maintenance/**',
    '!**/plugins/**',
    '!**/.eslintrc.js',
    '!**/.prettierrc.js',
    '!**/nuxt.config.js',
  ],
  coverageReporters: ['lcov', 'text'],
  setupFiles: ['<rootDir>/test/registerContext.js', '<rootDir>/test/testSetup.js'],
  transform: {
    '.*\\.(vue)$': 'vue-jest',
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['**/?(*.)+(spec|test).js?(x)'],
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  moduleNameMapper: {
    '\\.(svg)$': '<rootDir>/test/fileMock.js',
    '\\.(css|less)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['js', 'json', 'vue'],
}