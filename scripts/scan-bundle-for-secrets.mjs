#!/usr/bin/env node
// Static scan of the production frontend bundle for patterns that look like leaked
// secrets (Supabase service-role keys, OAuth client secrets, private key material,
// generic long tokens assigned to suspicious names). Addresses RISK-V3-002 /
// releases/v3.0-platform/VALIDATION.md "browser bundle secret scan PASS".
//
// This is a pattern-based static check, not a guarantee — it catches accidental
// hardcoding, not every possible leak shape. Run after `npm run build` against the
// `app/dist` output.
//
// Usage: node scripts/scan-bundle-for-secrets.mjs [dist-dir]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const distDir = process.argv[2] || join(process.cwd(), 'app', 'dist');

const SCANNABLE_EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.map', '.json']);

// [label, regex] — each pattern targets a specific known secret shape rather than a
// broad heuristic, to keep false positives low enough that a real PASS is meaningful.
const PATTERNS = [
  ['Supabase secret/service-role key (sb_secret_...)', /sb_secret_[A-Za-z0-9_-]{10,}/g],
  ['Legacy Supabase service-role JWT (role":"service_role")', /"role"\s*:\s*"service_role"/g],
  ['Generic JWT that decodes with a service_role claim', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*service_role[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{10,}/g],
  ['Google OAuth client secret (GOCSPX-...)', /GOCSPX-[A-Za-z0-9_-]{10,}/g],
  ['PEM private key block', /-----BEGIN (RSA |EC |)PRIVATE KEY-----/g],
  ['AWS-style access key id', /AKIA[0-9A-Z]{16}/g],
  ['Generic .env-style SERVICE_ROLE/SECRET assignment baked into a string', /(service[_-]?role|client[_-]?secret|db[_-]?password|database[_-]?url)["'`]?\s*[:=]\s*["'`][^"'`\s]{12,}["'`]/gi],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (SCANNABLE_EXT.has(extname(entry))) files.push(full);
  }
  return files;
}

let distStat;
try {
  distStat = statSync(distDir);
} catch {
  console.error(`Bundle secret scan: dist directory not found at ${distDir}. Run "npm run build" in app/ first.`);
  process.exit(2);
}
if (!distStat.isDirectory()) {
  console.error(`Bundle secret scan: ${distDir} is not a directory.`);
  process.exit(2);
}

const files = walk(distDir);
let findings = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const [label, pattern] of PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      findings += matches.length;
      console.error(`FOUND: ${label} — ${matches.length} match(es) in ${file}`);
    }
  }
}

if (findings > 0) {
  console.error(`\nBundle secret scan: FAIL — ${findings} potential secret pattern(s) found in ${distDir}.`);
  process.exit(1);
}

console.log(`Bundle secret scan: PASS — scanned ${files.length} file(s) in ${distDir}, no known secret patterns found.`);
