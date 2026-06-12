/**
 * Tests for the API service module.
 * Validates file validation, URL construction, and API calls.
 */

import { describe, it, expect } from 'vitest';
import { validateFile, API_BASE_URL } from '../services/api';

describe('API_BASE_URL', () => {
  it('is defined and non-empty', () => {
    expect(API_BASE_URL).toBeTruthy();
    expect(typeof API_BASE_URL).toBe('string');
  });
});

describe('validateFile', () => {
  it('throws on non-image MIME types', () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    expect(() => validateFile(file)).toThrow('Invalid file type');
  });

  it('throws on files over 10MB', () => {
    const bigContent = new Uint8Array(11 * 1024 * 1024);
    const file = new File([bigContent], 'big.jpg', { type: 'image/jpeg' });
    expect(() => validateFile(file)).toThrow('too large');
  });

  it('throws on empty files', () => {
    const file = new File([], 'empty.jpg', { type: 'image/jpeg' });
    expect(() => validateFile(file)).toThrow('empty');
  });

  it('accepts valid JPG files', () => {
    const content = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const file = new File([content], 'photo.jpg', { type: 'image/jpeg' });
    expect(() => validateFile(file)).not.toThrow();
  });

  it('accepts valid PNG files', () => {
    const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const file = new File([content], 'photo.png', { type: 'image/png' });
    expect(() => validateFile(file)).not.toThrow();
  });
});
