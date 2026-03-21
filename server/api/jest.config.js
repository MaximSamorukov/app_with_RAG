/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // The root of your source code
  rootDir: '.',
  
  // Test files match these patterns
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.integration.spec.ts'],
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022'],
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitReturns: false,
        noFallthroughCasesInSwitch: false,
        moduleResolution: 'node',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strictPropertyInitialization: false,
        types: ['node', 'jest'],
        baseUrl: '.',
        paths: {
          '@modules/*': ['src/modules/*'],
          '@common/*': ['src/common/*'],
          '@config/*': ['src/config/*'],
          '@database/*': ['src/database/*'],
        },
      },
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Test environment
  testEnvironment: 'node',
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/main.ts',
    '!src/database/migrations/**',
  ],
  
  // Coverage thresholds - only for auth module
  coverageThreshold: {
    'src/modules/auth/auth.service.ts': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/auth/auth.controller.ts': {
      branches: 50,
      functions: 80,
      lines: 75,
      statements: 75,
    },
  },
  
  // Coverage report
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Collect coverage
  collectCoverage: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Force exit
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Test path ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
