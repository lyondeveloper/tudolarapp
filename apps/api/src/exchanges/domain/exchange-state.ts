/**
 * The agreement aggregate and its status — pure domain, no infrastructure
 * imports.
 *
 * This module owns agreements, incidents, and the state machine (design.md,
 * module table). ADR-0004 makes SP04's status enum authoritative; the states
 * below are that enum. ADR-0004 leaves the exact final enum and how the
 * incident state is represented open (D25), so this change records the states
 * without inventing transitions.
 *
 * An agreement references the immutable terms version it was confirmed against
 * (ADR-0001): it stores `termsVersionId`, never a copy of the terms.
 */

/** The agreement states (ADR-0004). */
export type AgreementState =
  | 'awaiting_confirmation'
  | 'confirmed_by_both'
  | 'completed'
  | 'cancelled'
  | 'incident_open'
  | 'expired';

/** An agreement, scoped to the offer and market it inherits from. */
export interface Agreement {
  readonly id: string;
  readonly offerId: string;
  readonly termsVersionId: string;
  readonly marketId: string;
  readonly state: AgreementState;
}
