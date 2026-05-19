// Backend service tests for ProfilePays
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock bcrypt for password hashing
const mockBcrypt = {
  hash: jest.fn<(...args: any[]) => Promise<string>>(),
  compare: jest.fn<(...args: any[]) => Promise<boolean>>(),
};

// Mock JWT for token handling
const mockJwt = {
  sign: jest.fn<(...args: any[]) => string>(),
  verify: jest.fn(),
};

// Sample AuthService class to test
class AuthService {
  private userRepository: any;

  constructor(userRepository: any) {
    this.userRepository = userRepository;
  }

  async hashPassword(password: string): Promise<string> {
    return mockBcrypt.hash(password, 12) as Promise<string>;
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return mockBcrypt.compare(password, hash) as Promise<boolean>;
  }

  async generateToken(payload: any): Promise<string> {
    return mockJwt.sign(payload, 'secret', { expiresIn: '1h' }) as string;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return { id: user.id, email: user.email, userType: user.userType };
  }

  async register(userData: any): Promise<any> {
    const existingUser = await this.userRepository.findOneBy({ email: userData.email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);
    const newUser = this.userRepository.create({
      ...userData,
      passwordHash: hashedPassword,
    });

    return this.userRepository.save(newUser);
  }
}

describe('ProfilePays AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = global.testUtils.createMockRepository();
    authService = new AuthService(mockUserRepository);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    test('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = 'hashed_password';

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await authService.hashPassword(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('comparePasswords', () => {
    test('should compare passwords correctly', async () => {
      const password = 'testpassword123';
      const hash = 'hashed_password';

      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await authService.comparePasswords(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    test('should return false for incorrect password', async () => {
      const password = 'wrongpassword';
      const hash = 'hashed_password';

      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await authService.comparePasswords(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('should generate JWT token', async () => {
      const payload = { userId: '1', email: 'test@example.com' };
      const token = 'jwt_token';

      mockJwt.sign.mockReturnValue(token as never);

      const result = await authService.generateToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(payload, 'secret', { expiresIn: '1h' });
      expect(result).toBe(token);
    });
  });

  describe('validateUser', () => {
    test('should validate user with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'testpassword123';
      const mockUser = global.testUtils.createMockUser({ email });

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await authService.validateUser(email, password);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        userType: mockUser.userType,
      });
    });

    test('should return null for non-existent user', async () => {
      const email = 'nonexistent@example.com';
      const password = 'testpassword123';

      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await authService.validateUser(email, password);

      expect(result).toBeNull();
    });

    test('should return null for incorrect password', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const mockUser = global.testUtils.createMockUser({ email });

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await authService.validateUser(email, password);

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'testpassword123',
        userType: 'member',
      };
      const hashedPassword = 'hashed_password';
      const savedUser = global.testUtils.createMockUser({
        email: userData.email,
        passwordHash: hashedPassword,
      });

      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await authService.register(userData);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ email: userData.email });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockUserRepository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toEqual(savedUser);
    });

    test('should throw error for existing user', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'testpassword123',
        userType: 'member',
      };
      const existingUser = global.testUtils.createMockUser({ email: userData.email });

      mockUserRepository.findOneBy.mockResolvedValue(existingUser);

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('Integration with test utilities', () => {
    test('should use global test utilities', () => {
      const mockUser = global.testUtils.createMockUser();
      const mockRequest = global.testUtils.createMockRequest({
        body: { email: 'test@example.com', password: 'password' },
      });
      const mockResponse = global.testUtils.createMockResponse();
      const mockJwtPayload = global.testUtils.createMockJwtPayload();

      expect(mockUser.email).toBe('test@example.com');
      expect(mockRequest.body.email).toBe('test@example.com');
      expect(typeof mockResponse.json).toBe('function');
      expect(mockJwtPayload.sub).toBe('1');
    });
  });
});
