// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCycles } from '../useCycles';

// In-memory localStorage shim (see useCycles-active.test.ts for rationale).
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

function jsonFile(cycles: { start: string; end: string | null }[]): File {
  return new File([JSON.stringify({ cycles })], 'backup.json', { type: 'application/json' });
}

function csvFile(rows: string[]): File {
  return new File([['Start Date,End Date', ...rows].join('\n')], 'backup.csv', { type: 'text/csv' });
}

describe('import does not drop cycles added in-session (stale-closure regression)', () => {
  it('importJSON merges against current state, not the initial snapshot', async () => {
    const { result } = renderHook(() => useCycles());

    // User adds a cycle AFTER mount — this is the entry the buggy closure dropped.
    act(() => {
      result.current.addCycle('2026-04-01', '2026-04-05');
    });
    expect(result.current.cycles).toHaveLength(1);

    let count = 0;
    await act(async () => {
      const res = await result.current.importJSON(jsonFile([{ start: '2026-06-01', end: '2026-06-05' }]));
      count = res.cycles;
    });

    expect(count).toBe(1);
    expect(result.current.cycles).toHaveLength(2);
    expect(result.current.cycles.map(c => c.start)).toEqual(['2026-04-01', '2026-06-01']);
  });

  it('importCSV merges against current state, not the initial snapshot', async () => {
    const { result } = renderHook(() => useCycles());

    act(() => {
      result.current.addCycle('2026-04-01', '2026-04-05');
    });

    let count = 0;
    await act(async () => {
      count = await result.current.importCSV(csvFile(['2026-06-01,2026-06-05']));
    });

    expect(count).toBe(1);
    expect(result.current.cycles).toHaveLength(2);
    expect(result.current.cycles.map(c => c.start)).toEqual(['2026-04-01', '2026-06-01']);
  });
});

describe('importJSON validates the end date', () => {
  it('stores null for a malformed end (non-date)', async () => {
    const { result } = renderHook(() => useCycles());
    const file = new File([JSON.stringify({
      cycles: [{ start: '2026-05-01', end: 'not-a-date' }],
    })], 'backup.json', { type: 'application/json' });

    await act(async () => { await result.current.importJSON(file); });

    expect(result.current.cycles).toEqual([{ start: '2026-05-01', end: null }]);
  });

  it('stores null for an end that is before the start', async () => {
    const { result } = renderHook(() => useCycles());
    const file = new File([JSON.stringify({
      cycles: [{ start: '2026-06-01', end: '2026-05-20' }],
    })], 'backup.json', { type: 'application/json' });

    await act(async () => { await result.current.importJSON(file); });

    expect(result.current.cycles).toEqual([{ start: '2026-06-01', end: null }]);
  });

  it('keeps a well-formed end >= start', async () => {
    const { result } = renderHook(() => useCycles());
    const file = new File([JSON.stringify({
      cycles: [{ start: '2026-07-01', end: '2026-07-05' }],
    })], 'backup.json', { type: 'application/json' });

    await act(async () => { await result.current.importJSON(file); });

    expect(result.current.cycles).toEqual([{ start: '2026-07-01', end: '2026-07-05' }]);
  });
});

describe('importCSV validates the end date (parity with JSON import)', () => {
  it('stores null for a CSV end that is before the start', async () => {
    const { result } = renderHook(() => useCycles());

    await act(async () => {
      await result.current.importCSV(csvFile(['2026-06-01,2026-05-20']));
    });

    expect(result.current.cycles).toEqual([{ start: '2026-06-01', end: null }]);
  });

  it('keeps a CSV end >= start', async () => {
    const { result } = renderHook(() => useCycles());

    await act(async () => {
      await result.current.importCSV(csvFile(['2026-07-01,2026-07-05']));
    });

    expect(result.current.cycles).toEqual([{ start: '2026-07-01', end: '2026-07-05' }]);
  });
});

describe('importCSV handles the app’s own symptom CSV (column-by-name + dedupe)', () => {
  it('reads cycles from Period Start/End columns, not the Date column', async () => {
    const { result } = renderHook(() => useCycles());
    // Shape of exportCSV when day logs exist: many rows per cycle, with a
    // quoted free-text note containing a comma.
    const symptomCsv = new File([[
      'Date,Period Start,Period End,Flow,Mood,Energy,Cramps,Pain Locations,Pain Severity,Affected My Day,Note',
      '2026-03-01,2026-03-01,2026-03-05,Heavy,Tired,Low,Severe,,,Yes,"cramps, bad day"',
      '2026-03-02,2026-03-01,2026-03-05,Medium,,,,,,,',
      '2026-03-20,2026-03-18,2026-03-22,Light,,,,,,,',
    ].join('\n')], 'symptoms.csv', { type: 'text/csv' });

    let count = 0;
    await act(async () => {
      count = await result.current.importCSV(symptomCsv);
    });

    // Two distinct cycles, deduped from the repeated Period Start values —
    // and the quoted comma in the note did not desync the columns.
    expect(count).toBe(2);
    expect(result.current.cycles).toEqual([
      { start: '2026-03-01', end: '2026-03-05' },
      { start: '2026-03-18', end: '2026-03-22' },
    ]);
  });
});

describe('exportCSV neutralizes spreadsheet formula injection', () => {
  it('prefixes a note beginning with = so it cannot execute as a formula', async () => {
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const blobs: Blob[] = [];
    URL.createObjectURL = (b: Blob) => { blobs.push(b); return 'blob:mock'; };
    URL.revokeObjectURL = () => {};

    try {
      const { result } = renderHook(() => useCycles());
      act(() => { result.current.addCycle('2026-03-01', '2026-03-05'); });
      act(() => {
        result.current.exportCSV({ '2026-03-01': { date: '2026-03-01', note: '=SUM(A1:A9)' } });
      });

      const text = await blobs[0].text();
      expect(text).toContain("'=SUM(A1:A9)"); // leading single-quote inserted
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
    }
  });

  it('escapes formula injection in non-note cells too (e.g. an imported mood)', async () => {
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const blobs: Blob[] = [];
    URL.createObjectURL = (b: Blob) => { blobs.push(b); return 'blob:mock'; };
    URL.revokeObjectURL = () => {};

    try {
      const { result } = renderHook(() => useCycles());
      act(() => { result.current.addCycle('2026-03-01', '2026-03-05'); });
      act(() => {
        // A malicious imported log could put a formula in a non-note field.
        result.current.exportCSV({
          '2026-03-01': { date: '2026-03-01', mood: ['=cmd|"/c calc"!A1' as never] },
        });
      });
      const text = await blobs[0].text();
      expect(text).toContain("'=cmd"); // mood cell was guarded
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
    }
  });
});
