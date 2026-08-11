import { describe, it, expect } from 'vitest';
import { asArray, asString, parseSort, parseDate } from './queryParams.js';

describe('asArray', () => {
  it('returns [] for undefined', () => {
    expect(asArray(undefined)).toEqual([]);
  });
  it('wraps a single value', () => {
    expect(asArray('new_request')).toEqual(['new_request']);
  });
  it('passes through an array, stringifying entries', () => {
    expect(asArray(['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('asString', () => {
  it('returns undefined for undefined', () => {
    expect(asString(undefined)).toBeUndefined();
  });
  it('takes the first element of an array', () => {
    expect(asString(['x', 'y'])).toBe('x');
  });
});

describe('parseSort', () => {
  const allowed = ['createdAt', 'name'] as const;

  it('falls back to the default when no sort param is given', () => {
    expect(parseSort(undefined, allowed, 'createdAt', 'desc')).toEqual({ createdAt: 'desc' });
  });
  it('parses ascending sort', () => {
    expect(parseSort('name', allowed, 'createdAt')).toEqual({ name: 'asc' });
  });
  it('parses descending sort (leading -)', () => {
    expect(parseSort('-name', allowed, 'createdAt')).toEqual({ name: 'desc' });
  });
  it('falls back to default for a disallowed field (no arbitrary column sort)', () => {
    expect(parseSort('password_hash', allowed, 'createdAt', 'asc')).toEqual({ createdAt: 'asc' });
  });
});

describe('parseDate', () => {
  it('returns undefined for absent/invalid input', () => {
    expect(parseDate(undefined)).toBeUndefined();
    expect(parseDate('not-a-date')).toBeUndefined();
  });
  it('parses a valid YYYY-MM-DD date', () => {
    const result = parseDate('2026-08-13');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2026);
  });
});
