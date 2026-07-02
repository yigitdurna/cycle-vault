// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCycles } from '../useCycles';

const STORAGE_KEY = 'cycle-tracker-calendar-v4';

// Node 25's native localStorage lacks clear/getItem/setItem when
// --localstorage-file is not set. Replace it with a simple in-memory shim
// so the hook (and tests) can use the standard Web Storage API.
const store: Record<string, string> = {};
const storageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });

beforeEach(() => {
  localStorage.clear();
});

describe('activeCycle', () => {
  it('returns null when no cycles exist', () => {
    const { result } = renderHook(() => useCycles());
    expect(result.current.activeCycle).toBeNull();
  });

  it('returns null when all cycles have end dates', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { start: '2026-03-01', end: '2026-03-05' },
    ]));
    const { result } = renderHook(() => useCycles());
    expect(result.current.activeCycle).toBeNull();
  });

  it('returns the cycle with null end', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { start: '2026-03-01', end: '2026-03-05' },
      { start: '2026-04-01', end: null },
    ]));
    const { result } = renderHook(() => useCycles());
    expect(result.current.activeCycle).toEqual({ start: '2026-04-01', end: null });
  });
});

describe('addCycle with null end', () => {
  it('creates a cycle with null end date', () => {
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.addCycle('2026-04-07', null);
    });
    expect(result.current.activeCycle).toEqual({ start: '2026-04-07', end: null });
    expect(result.current.cycles).toHaveLength(1);
  });

  // Regression: a "did your period start?" notification firing while a period is
  // already active must NOT open a second cycle — two open cycles collide in
  // sanitizeCycles and the earlier (already-logged) one gets silently deleted.
  it('does not open a second cycle while one is active (data-loss guard)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ start: '2026-06-30', end: null }]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.addCycle('2026-07-01', null);
    });
    // The June 30 entry the user logged yesterday survives untouched.
    expect(result.current.cycles).toEqual([{ start: '2026-06-30', end: null }]);
    expect(result.current.activeCycle).toEqual({ start: '2026-06-30', end: null });
  });

  // Logging a historical (closed) period while one is active is still allowed —
  // only an *overlapping* cycle is blocked.
  it('still allows adding a closed historical cycle while one is active', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ start: '2026-06-30', end: null }]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.addCycle('2026-01-01', '2026-01-05');
    });
    expect(result.current.cycles).toHaveLength(2);
    expect(result.current.cycles.some(c => c.start === '2026-01-01' && c.end === '2026-01-05')).toBe(true);
    expect(result.current.activeCycle).toEqual({ start: '2026-06-30', end: null });
  });

  // Bug 1: logging a CLOSED range that STARTS AFTER the active cycle overlaps it
  // (the active cycle extends to "forever"). Refuse — the active cycle must not
  // be silently deleted, and the logged range must not be dropped either.
  it('refuses a closed cycle that starts after and overlaps the active cycle', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ start: '2026-06-30', end: null }]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.addCycle('2026-07-01', '2026-07-03');
    });
    // State unchanged: the active cycle survives, no new entry added.
    expect(result.current.cycles).toEqual([{ start: '2026-06-30', end: null }]);
    expect(result.current.activeCycle).toEqual({ start: '2026-06-30', end: null });
  });

  // Bug 1 (other direction): a closed range that STARTS BEFORE the active cycle
  // but overlaps its start day. Refuse — no data lost either way.
  it('refuses a closed cycle that starts before but overlaps the active cycle', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ start: '2026-06-30', end: null }]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.addCycle('2026-06-25', '2026-07-01');
    });
    expect(result.current.cycles).toEqual([{ start: '2026-06-30', end: null }]);
    expect(result.current.activeCycle).toEqual({ start: '2026-06-30', end: null });
  });

  // Bug 3: a stale "did your period start?" notification opens a new OPEN cycle
  // that overlaps a period the user already recorded (closed). Refuse — the
  // recorded cycle must survive.
  it('refuses a new open cycle overlapping a recorded closed cycle', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ start: '2026-06-28', end: '2026-07-02' }]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.addCycle('2026-06-30', null);
    });
    // The recorded period is untouched; no open cycle was created.
    expect(result.current.cycles).toEqual([{ start: '2026-06-28', end: '2026-07-02' }]);
    expect(result.current.activeCycle).toBeNull();
  });
});

describe('updateCycle overlap guard', () => {
  it('refuses an edit that would overlap another cycle', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { start: '2026-05-01', end: '2026-05-05' },
      { start: '2026-06-01', end: '2026-06-05' },
    ]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      // Try to move the May cycle onto the June cycle's days.
      result.current.updateCycle('2026-05-01', '2026-06-03', '2026-06-04');
    });
    // No change — both cycles remain exactly as they were.
    expect(result.current.cycles).toEqual([
      { start: '2026-05-01', end: '2026-05-05' },
      { start: '2026-06-01', end: '2026-06-05' },
    ]);
  });

  it('allows a non-overlapping edit', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { start: '2026-05-01', end: '2026-05-05' },
      { start: '2026-06-01', end: '2026-06-05' },
    ]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.updateCycle('2026-05-01', '2026-05-02', '2026-05-06');
    });
    expect(result.current.cycles.some(c => c.start === '2026-05-02' && c.end === '2026-05-06')).toBe(true);
    expect(result.current.cycles).toHaveLength(2);
  });
});

describe('endCycle', () => {
  it('sets end date on the active cycle', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { start: '2026-04-01', end: null },
    ]));
    const { result } = renderHook(() => useCycles());
    act(() => {
      result.current.endCycle('2026-04-05');
    });
    expect(result.current.activeCycle).toBeNull();
    expect(result.current.cycles[0].end).toBe('2026-04-05');
  });
});
