// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDayLogs } from '../useDayLogs';
import type { DayLogs } from '../../types';

// In-memory localStorage shim (see useCycles-import.test.ts for rationale).
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

describe('mergeLogs — non-destructive JSON-import merge', () => {
  it('adds a date the user does not have yet', () => {
    const { result } = renderHook(() => useDayLogs());

    const imported: DayLogs = {
      '2026-06-01': {
        date: '2026-06-01',
        flow: 'medium',
        history: [{ timestamp: '2026-06-01T08:00:00.000Z', flow: 'medium' }],
      },
    };
    act(() => { result.current.mergeLogs(imported); });

    expect(result.current.allLogs['2026-06-01'].flow).toBe('medium');
  });

  it('on a collision keeps the existing day but folds in imported history (deduped by timestamp)', () => {
    const { result } = renderHook(() => useDayLogs());

    // The user already logged this day locally (creates one history snapshot).
    act(() => {
      result.current.setLog('2026-06-01', { date: '2026-06-01', flow: 'light' });
    });
    const localTs = result.current.allLogs['2026-06-01'].history![0].timestamp;

    // Import a backup carrying the same day with a *different* snapshot plus a
    // duplicate of the local one (same timestamp) — the dup must not double up.
    const imported: DayLogs = {
      '2026-06-01': {
        date: '2026-06-01',
        flow: 'heavy',
        history: [
          { timestamp: localTs, flow: 'light' },
          { timestamp: '2020-01-01T00:00:00.000Z', flow: 'heavy' },
        ],
      },
    };
    act(() => { result.current.mergeLogs(imported); });

    const merged = result.current.allLogs['2026-06-01'];
    // Existing current fields are preserved (not overwritten by the import).
    expect(merged.flow).toBe('light');
    // The imported snapshot was folded in; the duplicate timestamp was not.
    expect(merged.history).toHaveLength(2);
    expect(merged.history!.map(h => h.timestamp)).toContain('2020-01-01T00:00:00.000Z');
  });

  it('does not silently drop imported logs on collision (regression)', () => {
    const { result } = renderHook(() => useDayLogs());

    act(() => {
      result.current.setLog('2026-06-01', { date: '2026-06-01', flow: 'spotting' });
    });

    const imported: DayLogs = {
      '2026-06-01': {
        date: '2026-06-01',
        flow: 'heavy',
        history: [{ timestamp: '2019-01-01T00:00:00.000Z', flow: 'heavy' }],
      },
    };
    act(() => { result.current.mergeLogs(imported); });

    // The imported snapshot survives inside the merged day's history.
    expect(result.current.allLogs['2026-06-01'].history!.some(
      h => h.timestamp === '2019-01-01T00:00:00.000Z',
    )).toBe(true);
  });
});
