'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Text guard rail for destructive migration statements. It does not parse SQL:
 * it strips comments, splits on `;`, and matches statement shapes, so it errs
 * toward false positives. A reviewed allowlist entry (with a reason) resolves
 * a false positive or approves an intentional destructive change.
 */
const DESTRUCTIVE = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i,
];

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));
}

function scanMigrationSql(sql) {
  const clean = stripComments(sql);
  const findings = [];
  let offset = 0;
  for (const raw of clean.split(';')) {
    const statement = raw.trim();
    if (statement && DESTRUCTIVE.some((re) => re.test(statement))) {
      const start = offset + raw.indexOf(statement);
      const line = clean.slice(0, start).split('\n').length;
      findings.push({ statement: statement.replace(/\s+/g, ' '), line });
    }
    offset += raw.length + 1;
  }
  return findings;
}

function scanMigrationDirectory(migrationsDir, allowlist) {
  const findings = [];
  for (const entry of fs.readdirSync(migrationsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(migrationsDir, entry.name, 'migration.sql');
    if (!fs.existsSync(file)) continue;
    const allowed = allowlist[entry.name];
    if (allowed && typeof allowed.reason === 'string' && allowed.reason.trim()) {
      continue;
    }
    for (const finding of scanMigrationSql(fs.readFileSync(file, 'utf8'))) {
      findings.push({ migration: entry.name, ...finding });
    }
  }
  return findings;
}

function loadAllowlist() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'destructive-allowlist.json'), 'utf8'),
  );
}

module.exports = { scanMigrationSql, scanMigrationDirectory, loadAllowlist };
