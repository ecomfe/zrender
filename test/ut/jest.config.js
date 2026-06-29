module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    rootDir: __dirname,
    setupFiles: [
        'jest-canvas-mock'
    ],
    setupFilesAfterEnv: [
        '<rootDir>/extendExpect.ts'
    ],
    testMatch: [
        '<rootDir>/spec/**/*.test.ts'
    ]
};