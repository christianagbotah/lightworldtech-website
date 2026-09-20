import { describe, expect, test } from 'bun:test';
import {
  acceptedCurrentCookiePreferences,
  defaultCookiePreferences,
  normalizeCookiePreferences,
  parseCookiePreferences,
} from './cookie-consent';

describe('cookie consent preference model', () => {
  test('keeps only current analytics as accepted optional storage', () => {
    expect(acceptedCurrentCookiePreferences).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
      preferences: false,
    });
  });

  test('forces essential on and inactive categories off for legacy values', () => {
    expect(normalizeCookiePreferences({
      essential: false,
      analytics: true,
      marketing: true,
      preferences: true,
    })).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
      preferences: true,
    });
  });

  test('falls back safely for malformed saved preferences', () => {
    expect(parseCookiePreferences('{bad-json')).toEqual(defaultCookiePreferences);
    expect(parseCookiePreferences(null)).toEqual(defaultCookiePreferences);
  });
});
