import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatMonthYear,
  formatDateRange,
  isoDate,
  hasRevision,
} from '@/lib/format-date';

/** Build spec §10 — date formatting and the updatedDate > pubDate invariant. */

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('formatDate', () => {
  it('renders the long form', () => {
    expect(formatDate(utc('2026-03-12'))).toBe('March 12, 2026');
  });

  it('formats in UTC regardless of the builder’s timezone', () => {
    // Midnight UTC is the previous day in every negative offset. If this
    // formatted locally, a CI build in US time would shift the date by one.
    expect(formatDate(new Date('2026-01-01T00:30:00Z'))).toBe('January 1, 2026');
    expect(formatDate(new Date('2026-01-01T23:30:00Z'))).toBe('January 1, 2026');
  });
});

describe('isoDate', () => {
  it('renders a machine-readable date', () => {
    expect(isoDate(utc('2026-03-12'))).toBe('2026-03-12');
  });
});

describe('formatMonthYear', () => {
  it('renders the compact form', () => {
    expect(formatMonthYear(utc('2026-03-12'))).toBe('Mar 2026');
  });
});

describe('formatDateRange', () => {
  it('joins a start and end', () => {
    expect(formatDateRange(utc('2025-04-01'), utc('2025-09-30'))).toBe('Apr 2025 — Sep 2025');
  });

  it('marks an absent end date as ongoing', () => {
    expect(formatDateRange(utc('2023-11-01'))).toBe('Nov 2023 — ongoing');
  });

  it('collapses a range inside one month to a single label', () => {
    expect(formatDateRange(utc('2025-04-02'), utc('2025-04-28'))).toBe('Apr 2025');
  });
});

describe('hasRevision', () => {
  it('is false without an updatedDate', () => {
    expect(hasRevision(utc('2026-03-02'))).toBe(false);
  });

  it('is true when the post was updated on a later day', () => {
    expect(hasRevision(utc('2026-03-02'), utc('2026-03-19'))).toBe(true);
  });

  it('is false for a same-day update — a typo fix is not a revision', () => {
    expect(hasRevision(utc('2026-03-02'), new Date('2026-03-02T18:00:00Z'))).toBe(false);
  });

  it('is false when updatedDate precedes pubDate', () => {
    // The schema rejects this outright; the display helper stays defensive.
    expect(hasRevision(utc('2026-03-02'), utc('2026-03-01'))).toBe(false);
  });
});
