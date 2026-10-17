'use strict';

const path = require('node:path');
const { URL } = require('node:url');

const { worktreeDatabaseName } = require('./worktree-database.cjs');

/**
 * Shared resolution of the disposable test database, so the runner, the seeder,
 * and the teardown all agree on which database belongs to this worktree.
 */

const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(apiRoot, '..', '..');

// DATABASE_URL normally lives in `.env`. dotenv does not override a value that
// is already exported, so an explicit environment still wins.
require('dotenv').config({ path: path.join(apiRoot, '.env'), quiet: true });

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const DEFAULT_DATABASE_URL = 'postgresql://tudolar:tudolar@127.0.0.1:5433/tudolar';
// CREATE DATABASE cannot be parameterized, so the name is checked against this
// allowlist before it is ever interpolated.
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function validateLocalDisposable(url, source) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${source} must be a valid PostgreSQL URL`);
  }

  const name = decodeURIComponent(parsed.pathname.slice(1));
  if (!LOCAL_HOSTS.includes(parsed.hostname) || !name.endsWith('_test')) {
    throw new Error(`${source} must target a local database ending in _test`);
  }

  return { parsed, name };
}

/**
 * An explicit TUDOLAR_TEST_DATABASE_URL is honoured exactly as before. When it
 * is absent, the worktree gets its own database so that worktrees running in
 * parallel cannot observe each other's rows.
 */
function resolveTestDatabase() {
  const explicit = process.env.TUDOLAR_TEST_DATABASE_URL;
  if (explicit) {
    validateLocalDisposable(explicit, 'TUDOLAR_TEST_DATABASE_URL');
    return { url: explicit, derived: false };
  }

  const template = new URL(process.env.DATABASE_URL || DEFAULT_DATABASE_URL);
  const adminUrl = template.toString();
  template.pathname = `/${worktreeDatabaseName(repoRoot)}`;
  const url = template.toString();
  validateLocalDisposable(url, 'the derived worktree database');

  return { url, derived: true, adminUrl };
}

function databaseNameOf(url) {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

module.exports = {
  apiRoot,
  repoRoot,
  LOCAL_HOSTS,
  DEFAULT_DATABASE_URL,
  SAFE_IDENTIFIER,
  validateLocalDisposable,
  resolveTestDatabase,
  databaseNameOf,
};
