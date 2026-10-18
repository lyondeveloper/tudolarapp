import type {
  CursorPage,
  PageQuery,
} from '../../common/pagination/cursor-pagination';
import type { Conversation, Message } from '../domain/conversation';

/**
 * The port the conversations module owns. It imports the shared pagination
 * contract rather than redeclaring a page shape.
 *
 * The concrete adapter lands with T12; this change freezes the port only.
 */
export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface ConversationRepositoryPort {
  findById(conversationId: string): Promise<Conversation | null>;
  /** Messages are paginated with the one shared cursor-page shape. */
  listMessages(
    conversationId: string,
    page: PageQuery,
  ): Promise<CursorPage<Message>>;
}
