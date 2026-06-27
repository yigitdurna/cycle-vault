#!/usr/bin/env node
/**
 * Independent translation review of cycle-vault's i18n catalog by an OpenAI model.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-...  node scripts/translation-review.mjs
 *   OPENAI_MODEL=gpt-5.5   node scripts/translation-review.mjs   # override model
 *
 * Zero dependencies — uses Node 20+ global fetch.
 * Reads src/i18n/translations.ts fresh from disk so the review reflects current
 * state. Never logs or stores the API key.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Error: set OPENAI_API_KEY in your environment.');
  console.error('  OPENAI_API_KEY=sk-... node scripts/translation-review.mjs');
  process.exit(1);
}

const catalog = readFileSync(join(ROOT, 'src/i18n/translations.ts'), 'utf8');

const SYSTEM = `You are a senior bilingual product-localization reviewer fluent in
English, Turkish, and German, reviewing the UI string catalog of "cycle vault",
a consumer menstrual-cycle tracking app. The brand name "cycle vault" stays
lowercase and untranslated in every locale — never flag it.

Each entry is { en, tr, de }. English is the source of truth for MEANING; judge
the Turkish (tr) and German (de) for: natural, idiomatic phrasing a native
speaker would actually use in a friendly health app; grammatical correctness
(German compound nouns, linking-s, capitalization of nouns; Turkish vowel
harmony, suffixes, and the rule that a noun stays singular after a numeral);
correct medical/cycle terminology (period, follicular, ovulation, luteal,
fertile window); consistency of tone and terminology across keys; and that
{placeholder} tokens are preserved identically.

Be specific and concrete. Do NOT pad. Only report entries that are genuinely
wrong, awkward, inconsistent, or could read better — skip ones that are fine.`;

const USER = `Review the tr and de translations in this catalog. For EACH issue,
output a row:

- key: <group.leaf>
- locale: tr | de
- current: "<current string>"
- suggested: "<your improved string>"
- why: <one concise sentence>

Group the rows by severity: (A) Incorrect/ungrammatical, (B) Awkward/unnatural,
(C) Inconsistent terminology. End with a short prioritized summary of the top
fixes. Pay particular attention to phase names (especially "luteal"), the
"{phase}phase" German compounds, and any place a numeral precedes a Turkish noun.

CATALOG (src/i18n/translations.ts):
${catalog}`;

async function main() {
  console.error(`Reviewing translations with model: ${MODEL} ...`);

  const endpoints = [
    {
      url: 'https://api.openai.com/v1/responses',
      body: { model: MODEL, input: `${SYSTEM}\n\n${USER}` },
      extract: (d) =>
        d.output_text ??
        d.output?.flatMap((o) => o.content ?? []).map((c) => c.text).filter(Boolean).join('\n'),
    },
    {
      url: 'https://api.openai.com/v1/chat/completions',
      body: {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: USER },
        ],
      },
      extract: (d) => d.choices?.[0]?.message?.content,
    },
  ];

  let lastErr = '';
  for (const ep of endpoints) {
    const res = await fetch(ep.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(ep.body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      lastErr = `${ep.url} -> ${res.status}: ${data?.error?.message || JSON.stringify(data)}`;
      continue;
    }
    const text = ep.extract(data);
    if (text) {
      console.log('\n' + '='.repeat(60));
      console.log(`OpenAI translation review (${MODEL})`);
      console.log('='.repeat(60) + '\n');
      console.log(text);
      return;
    }
    lastErr = `${ep.url}: empty response — ${JSON.stringify(data).slice(0, 400)}`;
  }
  console.error('Failed to get a review.\n' + lastErr);
  process.exit(1);
}

main().catch((e) => {
  console.error('Request failed:', e.message);
  process.exit(1);
});
