import { describe, it, expect } from 'vitest';
import { createTranslator, listJoin, phaseName, phaseNameLower, capitalizeFirst } from '../index';

describe('createTranslator — lookup', () => {
  it('resolves a plain key per locale', () => {
    expect(createTranslator('en')('nav.home')).toBe('Home');
    expect(createTranslator('tr')('nav.home')).toBe('Ana Sayfa');
    expect(createTranslator('de')('nav.home')).toBe('Start');
  });

  it('returns the key itself for an unknown key (safe fallback)', () => {
    expect(createTranslator('en')('does.notExist')).toBe('does.notExist');
    expect(createTranslator('en')('noDotKey')).toBe('noDotKey');
  });
});

describe('createTranslator — interpolation', () => {
  it('substitutes {placeholders} across locales', () => {
    expect(createTranslator('en')('home.ringDay', { day: 3 })).toBe('Day 3');
    expect(createTranslator('tr')('home.ringDay', { day: 3 })).toBe('3. gün');
    expect(createTranslator('de')('home.ringDay', { day: 3 })).toBe('Tag 3');
  });

  it('leaves unmatched placeholders intact', () => {
    // patternDesc expects {label} {pct} {phase}; omit some.
    const out = createTranslator('en')('insights.patternDesc', { pct: 50 });
    expect(out).toContain('{label}');
    expect(out).toContain('50%');
  });
});

describe('createTranslator — plural resolution', () => {
  it('English: one vs other by count', () => {
    const t = createTranslator('en');
    expect(t('home.nextPeriodDay', { count: 1 })).toBe('1 Day');
    expect(t('home.nextPeriodDay', { count: 2 })).toBe('2 Days');
  });

  it('German: one vs other by count', () => {
    const t = createTranslator('de');
    expect(t('settings.cyclesShort', { count: 1 })).toBe('1 Zyklus');
    expect(t('settings.cyclesShort', { count: 5 })).toBe('5 Zyklen');
  });

  it('Turkish: numeral takes the singular noun (one === other)', () => {
    const t = createTranslator('tr');
    // Turkish keeps the noun singular after a numeral: "1 gün", "5 gün".
    expect(t('history.duration', { count: 1 })).toBe('1 gün');
    expect(t('history.duration', { count: 5 })).toBe('5 gün');
    expect(t('history.duration', { count: 5 })).not.toContain('günler');
  });

  it('falls back to the base key when no plural variant matches', () => {
    // nav.home has no One/Other; count is irrelevant.
    expect(createTranslator('en')('nav.home', { count: 3 })).toBe('Home');
  });
});

describe('helpers', () => {
  it('phaseName resolves the localized phase noun', () => {
    expect(phaseName(createTranslator('en'), 'Menstrual')).toBe('Menstrual');
    expect(phaseName(createTranslator('tr'), 'Ovulation')).toBe('Yumurtlama');
    expect(phaseName(createTranslator('de'), 'Ovulation')).toBe('Eisprung');
  });

  it('phaseNameLower lowercases only for English', () => {
    expect(phaseNameLower(createTranslator('en'), 'en', 'Menstrual')).toBe('menstrual');
    expect(phaseNameLower(createTranslator('de'), 'de', 'Menstrual')).toBe('Menstruation');
  });

  it('listJoin builds a localized list with a final conjunction', () => {
    expect(listJoin(['a'], 'and')).toBe('a');
    expect(listJoin(['a', 'b'], 'and')).toBe('a and b');
    expect(listJoin(['a', 'b', 'c'], 've')).toBe('a, b ve c');
  });

  it('capitalizeFirst uppercases the first character', () => {
    expect(capitalizeFirst('cramps in menstrual')).toBe('Cramps in menstrual');
  });
});
