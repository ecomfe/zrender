module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: __dirname,
    setupFilesAfterEnv: [
        '<rootDir>/extendExpect.ts'
    ],
    testMatch: [
        '<rootDir>/spec/**/*.test.ts'
    ]
};