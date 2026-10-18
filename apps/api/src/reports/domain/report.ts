/**
 * Reports and blocks — pure domain, no infrastructure imports.
 *
 * This module owns reports, blocks, and moderation (design.md, module table).
 * It consumes the `sellers` eligibility contract: a moderation decision can
 * change a seller's eligibility state, and evidence retention is part of group
 * **G** (the legal review), which stays open.
 *
 * SP07 leaves the blocking semantics open (one-way, mutual, or scoped) and
 * whether an appeal exists, so this change records the shapes without deciding
 * those semantics.
 */

/** Why a report was filed. */
export type ReportReason =
  'fraud' | 'safety' | 'harassment' | 'misleading_inventory' | 'other';

/** A report filed by one user against another. */
export interface Report {
  readonly id: string;
  readonly reporterId: string;
  readonly reportedUserId: string;
  readonly reason: ReportReason;
  readonly details: string | null;
  readonly createdAt: Date;
}

/**
 * A block. The semantics (one-way, mutual, or offer-scoped) are open (SP07 G),
 * so only the two parties are recorded here.
 */
export interface Block {
  readonly blockerId: string;
  readonly blockedId: string;
  readonly createdAt: Date;
}
