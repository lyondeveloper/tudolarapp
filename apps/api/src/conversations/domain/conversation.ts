/**
 * Conversations and messages — pure domain, no infrastructure imports.
 *
 * This module owns conversations and messages (design.md, module table). A
 * conversation inherits its market context from the offer (`AGENTS.md`,
 * "Product context"): it carries `marketId` rather than resolving a market of its
 * own.
 */

/** A conversation, scoped to the offer and the market it belongs to. */
export interface Conversation {
  readonly id: string;
  readonly offerId: string;
  readonly marketId: string;
  readonly participantIds: readonly string[];
}

/** One message in a conversation. */
export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly body: string;
  readonly createdAt: Date;
}
