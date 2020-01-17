module.exports = {
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testRegex: '\\.spec\\.ts$',
  roots: ['<rootDir>/src'],
  transform: {
    '.ts': 'ts-jest',
  },
}
