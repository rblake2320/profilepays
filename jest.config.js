module.exports = {
  // Projects for monorepo structure
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/**/*.(test|spec).(ts|tsx|js|jsx)'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
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
        '^.+\\.(ts)$': 'ts-jest',
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

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Watch plugins for better development experience
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
