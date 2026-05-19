module.exports = {
  // Projects for monorepo structure
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/**/*.(test|spec).(ts|tsx|js|jsx)'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      globals: {
        'import.meta': { env: { VITE_API_URL: 'http://localhost:3000/api/v1' } },
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            module: 'esnext',
            moduleResolution: 'bundler',
          },
          diagnostics: {
            ignoreCodes: ['TS1343', 'TS2339'],
          },
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
      moduleDirectories: ['<rootDir>/frontend/node_modules', 'node_modules'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '^.*/api/client$': '<rootDir>/frontend/src/api/__mocks__/client.ts',
        '^react$': '<rootDir>/frontend/node_modules/react',
        '^react-dom$': '<rootDir>/frontend/node_modules/react-dom',
        '^react-dom/(.*)$': '<rootDir>/frontend/node_modules/react-dom/$1',
        '^react/(.*)$': '<rootDir>/frontend/node_modules/react/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          'jest-transform-stub',
      },
      collectCoverageFrom: [
        'frontend/src/**/*.{ts,tsx,js,jsx}',
        '!frontend/src/**/*.d.ts',
        '!frontend/src/**/*.stories.{ts,tsx,js,jsx}',
        '!frontend/src/main.tsx',
        '!frontend/src/vite-env.d.ts',
      ],
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/**/*.(test|spec).(ts|js)'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.(ts)$': ['ts-jest', {
          tsconfig: { esModuleInterop: true },
        }],
        '^.+\\.(js)$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/backend/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
      },
      collectCoverageFrom: [
        'backend/src/**/*.{ts,js}',
        '!backend/src/**/*.d.ts',
        '!backend/src/main.ts',
      ],
    },
  ],

  // Global configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Coverage thresholds - relaxed for initial pass
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
};
