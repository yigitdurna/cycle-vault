import { describe, it, expect } from 'vitest';
import { phaseTypeToUI } from '../../types';

describe('phaseTypeToUI', () => {
  it('maps engine phase types to UI phases', () => {
    expect(phaseTypeToUI('period')).toBe('Menstrual');
    expect(phaseTypeToUI('fertile')).toBe('Follicular');
    expect(phaseTypeToUI('ovulation')).toBe('Ovulation');
    expect(phaseTypeToUI('luteal')).toBe('Luteal');
    expect(phaseTypeToUI('follicular')).toBe('Follicular');
  });

  it('hides ovulation as Follicular in childfree / not-TTC mode', () => {
    expect(phaseTypeToUI('ovulation', true)).toBe('Follicular');
    expect(phaseTypeToUI('fertile', true)).toBe('Follicular');
    // Non-fertility phases are unaffected by the flag.
    expect(phaseTypeToUI('period', true)).toBe('Menstrual');
    expect(phaseTypeToUI('luteal', true)).toBe('Luteal');
  });
});
