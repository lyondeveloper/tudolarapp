'use strict';

const { createHash } = require('node:crypto');
const { basename } = require('node:path');

/**
 * Derives the disposable database name for a worktree.
 *
 * Parallel worktrees must not share a database, and the harness refuses any test
 * database whose name does not end in `_test`. PostgreSQL also folds an unquoted
 * identifier to lower case and truncates it at 63 bytes, so the name is built to
 * survive being used unquoted.
 *
 * The name is deterministic for a given path, so the same worktree always reuses
 * its own database, and it carries a digest of the full path so two checkouts of
 * the same branch in different directories cannot collide.
 */

const PREFIX = 'tudolar_e2e_';
const SUFFIX = '_test';
const POSTGRES_IDENTIFIER_LIMIT = 63;
const DIGEST_LENGTH = 8;

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function worktreeDatabaseName(worktreePath) {
  const slug = slugify(basename(worktreePath)) || 'worktree';
  const digest = createHash('sha256')
    .update(worktreePath)
    .digest('hex')
    .slice(0, DIGEST_LENGTH);
  const room =
    POSTGRES_IDENTIFIER_LIMIT -
    PREFIX.length -
    SUFFIX.length -
    DIGEST_LENGTH -
    1;

  return `${PREFIX}${slug.slice(0, room)}_${digest}${SUFFIX}`;
}

module.exports = { worktreeDatabaseName };
