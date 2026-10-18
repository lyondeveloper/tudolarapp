import type { CursorPage } from '../../../../common/pagination/cursor-pagination';
import type { Conversation, Message } from '../../../domain/conversation';

/**
 * The HTTP shapes of a conversation and its messages. The message collection
 * uses the one shared cursor-page shape; timestamps travel as ISO strings.
 */
export interface ConversationDto {
  id: string;
  offerId: string;
  marketId: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export type MessageListDto = CursorPage<MessageDto>;

/** Maps the domain conversation to its transport shape. */
export function toConversationDto(conversation: Conversation): ConversationDto {
  return {
    id: conversation.id,
    offerId: conversation.offerId,
    marketId: conversation.marketId,
  };
}

/** Maps the domain message to its transport shape. */
export function toMessageDto(message: Message): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}
