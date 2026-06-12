/**
 * Tests for the auth service module.
 * Validates token storage, retrieval, and user parsing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock axios to avoid network issues in tests
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    }),
  },
}));

import { storeAuth, getStoredToken, getStoredUser, clearAuth } from '../services/auth';

describe('Auth token management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves token', () => {
    storeAuth('test-token-123', { id: '1', name: 'Test', email: 'test@example.com', created_at: '2026-01-01' });
    expect(getStoredToken()).toBe('test-token-123');
  });

  it('stores and retrieves user', () => {
    const user = { id: '1', name: 'Test User', email: 'test@example.com', created_at: '2026-01-01' };
    storeAuth('token', user);
    const stored = getStoredUser();
    expect(stored).toEqual(user);
  });

  it('clears auth data', () => {
    storeAuth('token', { id: '1', name: 'Test', email: 'test@example.com', created_at: '2026-01-01' });
    clearAuth();
    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('returns null when no token stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('returns null for invalid user JSON', () => {
    localStorage.setItem('skinai_user', 'not-valid-json');
    expect(getStoredUser()).toBeNull();
  });

  it('returns null for user without required fields', () => {
    localStorage.setItem('skinai_user', JSON.stringify({ name: 'Test' }));
    expect(getStoredUser()).toBeNull();
  });
});
