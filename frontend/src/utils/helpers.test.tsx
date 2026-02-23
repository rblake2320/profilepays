// Frontend utility tests for ProfilePays
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test, expect } from '@jest/globals';

// Sample utility functions to test
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
};

// Sample React component to test
const WelcomeMessage = ({ userName }: { userName: string }) => {
  return <h1>Welcome to ProfilePays, {userName}!</h1>;
};

describe('ProfilePays Frontend Utilities', () => {
  describe('formatCurrency', () => {
    test('should format currency correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    test('should handle negative amounts', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('truncateText', () => {
    test('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long ...');
    });

    test('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    test('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('Exact', 5)).toBe('Exact');
    });
  });

  describe('React Component Tests', () => {
    test('should render welcome message', () => {
      const markup = renderToStaticMarkup(<WelcomeMessage userName="John Doe" />);
      expect(markup).toContain('Welcome to ProfilePays, John Doe!');
    });

    test('should handle empty username', () => {
      const markup = renderToStaticMarkup(<WelcomeMessage userName="" />);
      expect(markup).toContain('Welcome to ProfilePays, !');
    });
  });

  describe('Test Utilities', () => {
    test('should use global test utilities', () => {
      const mockUser = global.testUtils.createMockUser();
      const mockCampaign = global.testUtils.createMockCampaign();
      const mockStore = global.testUtils.createMockStore({ user: mockUser });

      expect(mockUser.email).toBe('test@example.com');
      expect(mockCampaign.title).toBe('Test Campaign');
      expect(mockStore.getState().user).toEqual(mockUser);
    });

    test('should mock API responses', () => {
      const mockResponse = global.testUtils.mockApiResponse({ success: true });

      expect(mockResponse.data.success).toBe(true);
      expect(mockResponse.status).toBe(200);
    });
  });

  describe('Local Storage Integration', () => {
    test('should interact with localStorage', () => {
      const testKey = 'profilepays-test';
      const testValue = 'test-value';

      localStorage.setItem(testKey, testValue);
      expect(localStorage.setItem).toHaveBeenCalledWith(testKey, testValue);

      localStorage.getItem(testKey);
      expect(localStorage.getItem).toHaveBeenCalledWith(testKey);
    });
  });
});
