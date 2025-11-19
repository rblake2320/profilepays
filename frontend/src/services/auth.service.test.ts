import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './auth.service';
import api from './api';

// Mock the api module
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '1',
            email: 'test@example.com',
            userType: 'member',
          },
        },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
      expect(localStorage.getItem('user')).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('should clear tokens from localStorage', async () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');
      localStorage.setItem('user', '{}');

      vi.mocked(api.post).mockResolvedValue({});

      await authService.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('accessToken', 'token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when access token does not exist', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
