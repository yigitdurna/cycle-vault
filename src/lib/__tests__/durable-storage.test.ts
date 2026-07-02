import { describe, it, expect } from 'vitest';
import { decideHydration } from '../durable-storage';

describe('decideHydration', () => {
  it('pushes when localStorage is present and durable is empty (fresh + migration)', () => {
    expect(decideHydration('[{"start":"2026-01-01"}]', null)).toBe('push');
    expect(decideHydration('{}', '')).toBe('push');
  });

  it('restores when localStorage is missing/empty but durable has a value (purge recovery)', () => {
    expect(decideHydration(null, '[{"start":"2026-01-01"}]')).toBe('restore');
    expect(decideHydration('', '{"customCycleLength":30}')).toBe('restore');
  });

  it('pushes (localStorage wins) when both are present', () => {
    expect(decideHydration('local-value', 'durable-value')).toBe('push');
  });

  it('does nothing when both are empty', () => {
    expect(decideHydration(null, null)).toBe('none');
    expect(decideHydration('', '')).toBe('none');
    expect(decideHydration('', null)).toBe('none');
  });
});
