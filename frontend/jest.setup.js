// Frontend Jest setup for ProfilePays

// Polyfill TextEncoder/TextDecoder for jsdom (required by react-dom/server)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.console = {
  ...console,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000/api/v1';

if (typeof global.window === 'undefined') {
  global.window = global;
}

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.testUtils = {
  createMockUser: () => ({
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    userType: 'member',
  }),
  createMockCampaign: () => ({
    id: '1',
    title: 'Test Campaign',
    description: 'Test Description',
    budget: 100,
    status: 'active',
  }),
  mockApiResponse: (data, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  }),
  createMockStore: (initialState = {}) => ({
    getState: () => initialState,
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  }),
};

afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  global.sessionStorage.clear();
});
