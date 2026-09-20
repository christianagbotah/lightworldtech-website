import { describe, expect, test } from 'bun:test';
import {
  normalizeNavigationLinks,
  normalizeNavigationMenu,
  safeNavigationHref,
} from './navigation-content';

describe('managed navigation safety', () => {
  test('allows internal and explicit safe external schemes', () => {
    expect(safeNavigationHref('/services')).toBe('/services');
    expect(safeNavigationHref('https://example.com/work')).toBe('https://example.com/work');
    expect(safeNavigationHref('mailto:mail@example.com')).toBe('mailto:mail@example.com');
    expect(safeNavigationHref('tel:+233243618186')).toBe('tel:+233243618186');
  });

  test('rejects executable, protocol-relative and control-character links', () => {
    expect(safeNavigationHref('javascript:alert(1)', '/contact')).toBe('/contact');
    expect(safeNavigationHref('//evil.example/path', '/contact')).toBe('/contact');
    expect(safeNavigationHref('/safe\nLocation: evil', '/contact')).toBe('/contact');
  });

  test('drops malformed items and trims managed labels', () => {
    const fallback = [{ label: 'Home', href: '/' }];
    expect(normalizeNavigationLinks([
      { label: '  Work  ', href: '/portfolio' },
      { label: '', href: '/bad' },
      null,
    ], fallback)).toEqual([{ label: 'Work', href: '/portfolio' }]);
  });

  test('normalizes menu descriptions, icons, and URLs', () => {
    const fallback = [{ title: 'Services', desc: '', href: '/services', icon: 'grid' }];
    expect(normalizeNavigationMenu([
      {
        title: '  AI & automation ',
        desc: ' Assistive AI workflows ',
        href: 'javascript:alert(1)',
        icon: ' Brain ',
      },
    ], fallback)).toEqual([
      {
        title: 'AI & automation',
        desc: 'Assistive AI workflows',
        href: '/',
        icon: 'brain',
      },
    ]);
  });
});
