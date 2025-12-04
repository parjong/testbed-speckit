import { describe, it, expect } from 'vitest';
import { getAlbumNameFromDate } from '../../../src/utils/date-grouping';

describe('date-grouping', () => {
  it('should return a formatted date string for a valid date', () => {
    const dateString = '2023-10-26T10:00:00Z';
    expect(getAlbumNameFromDate(dateString)).toBe('October 26, 2023');
  });

  it('should return "Undated Photos" for an invalid date string', () => {
    const dateString = 'invalid-date';
    expect(getAlbumNameFromDate(dateString)).toBe('Undated Photos');
  });

  it('should return "Undated Photos" for an empty date string', () => {
    const dateString = '';
    expect(getAlbumNameFromDate(dateString)).toBe('Undated Photos');
  });

  it('should handle different valid date formats', () => {
    const dateString = '2024-01-15';
    expect(getAlbumNameFromDate(dateString)).toBe('January 15, 2024');
  });
});