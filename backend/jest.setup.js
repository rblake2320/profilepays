// Backend Jest setup for ProfilePays

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/profilepays_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';

// Global test utilities for backend
global.testUtils = {
  // Database utilities
  createMockUser: (overrides = {}) => ({
    id: '1',
    email: 'test@example.com',
    passwordHash: '$2b$12$fake.hash',
    userType: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMockCampaign: (overrides = {}) => ({
    id: '1',
    advertiserId: '1',
    title: 'Test Campaign',
    description: 'Test Description',
    budget: 100,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // HTTP utilities
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  }),

  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  },

  // JWT utilities
  createMockJwtPayload: (overrides = {}) => ({
    sub: '1',
    email: 'test@example.com',
    userType: 'member',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }),

  // Database connection mock
  createMockRepository: () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  }),
};

// Mock TypeORM decorators and utilities
jest.mock('typeorm', () => ({
  Entity: () => () => {},
  PrimaryGeneratedColumn: () => () => {},
  Column: () => () => {},
  CreateDateColumn: () => () => {},
  UpdateDateColumn: () => () => {},
  ManyToOne: () => () => {},
  OneToMany: () => () => {},
  JoinColumn: () => () => {},
  Repository: class MockRepository {},
  getRepository: jest.fn(),
  createConnection: jest.fn(),
}));

// Mock NestJS decorators
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Injectable: () => () => {},
  Controller: () => () => {},
  Get: () => () => {},
  Post: () => () => {},
  Put: () => () => {},
  Delete: () => () => {},
  Param: () => () => {},
  Body: () => () => {},
  Query: () => () => {},
  UseGuards: () => () => {},
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
