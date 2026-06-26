#!/usr/bin/env node
/**
 * Independent code review of cycle-vault by an OpenAI model.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-...  node scripts/openai-review.mjs
 *   OPENAI_MODEL=gpt-5.5   node scripts/openai-review.mjs   # override model
 *
 * Zero dependencies — uses Node 20+ global fetch.
 * Reads source files fresh from disk so the review reflects current state.
 * Never logs or stores the API key.
 */
import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Error: set OPENAI_API_KEY in your environment.');
  console.error('  OPENAI_API_KEY=sk-... node scripts/openai-review.mjs');
  process.exit(1);
}

// Files that matter most for judging build quality. Tweak freely.
const FILES = [
  'package.json',
  'vite.config.ts',
  'capacitor.config.ts',
  '.github/workflows/deploy.yml',
  'src/index.css',
  'src/types.ts',
  'src/App.tsx',
  'src/lib/cycle-math.ts',
  'src/lib/insights.ts',
  'src/hooks/useCycles.ts',
  'src/hooks/useDayLogs.ts',
  'src/hooks/useSettings.ts',
  'src/views/CalendarView.tsx',
  'src/components/CalendarGrid.tsx',
  'src/components/DayDetailSheet.tsx',
  'src/views/SettingsView.tsx',
];

const MAX_BYTES_PER_FILE = 24_000;

function bundle() {
  const parts = [];
  for (const rel of FILES) {
    const abs = join(ROOT, rel);
    try {
      const size = statSync(abs).size;
      let body = readFileSync(abs, 'utf8');
      if (size > MAX_BYTES_PER_FILE) {
        body = body.slice(0, MAX_BYTES_PER_FILE) + '\n... [truncated]';
      }
      parts.push(`===== FILE: ${rel} =====\n${body}`);
    } catch {
      parts.push(`===== FILE: ${rel} (missing) =====`);
    }
  }
  return parts.join('\n\n');
}

function fileTree() {
  try {
    return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '(git ls-files unavailable)';
  }
}

const SYSTEM = `You are a senior staff engineer doing an independent, critical code review.
Be specific and concrete. Cite file:line when you flag something. Do not pad.
The project is "cycle vault": a privacy-first menstrual-cycle tracking PWA
(React 19 + Vite + TypeScript + Tailwind v4, all data in localStorage, no backend,
deployed to GitHub Pages). Tooling status (verified by the maintainer): tsc --noEmit
clean, 86/86 unit tests passing, production build succeeds, live site serves 200.`;

const USER = `Assess this codebase. Cover:
1. Code quality & correctness (call out real bugs, not nits).
2. Architecture & separation of concerns.
3. The prediction engine in cycle-math.ts (is the cycle/phase math sound?).
4. Privacy & security posture given the privacy-first claim.
5. Deployment / CI / PWA setup.

Then give a scorecard (each /10) for: Code quality, Architecture, Correctness,
Privacy/Security, Deployment — plus an overall /10 and a one-line verdict.

PROJECT FILE TREE:
${fileTree()}

SOURCE BUNDLE:
${bundle()}`;

async function main() {
  console.error(`Reviewing with model: ${MODEL} ...`);

  // Try the Responses API first (GPT-5.x); fall back to Chat Completions.
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
      // If the model/endpoint is wrong, try the next endpoint.
      continue;
    }
    const text = ep.extract(data);
    if (text) {
      console.log('\n' + '='.repeat(60));
      console.log(`OpenAI review (${MODEL})`);
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
