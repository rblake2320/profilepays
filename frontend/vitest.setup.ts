import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered components between tests; jsdom provides localStorage,
// sessionStorage, and the DOM globals the app expects.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
