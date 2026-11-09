export type ChatMessage = {
  from: 'ai' | 'user'
  text: string
  responseId?: string
}

export const CHAT_PENDING_TEXT = '답변을 작성하고 있어요…'

/**
 * Append each SSE text chunk to the same AI reply, rather than creating
 * another bubble for every chunk. Other messages remain unchanged.
 */
export function appendChatStreamChunk(
  messages: ChatMessage[],
  responseId: string,
  chunk: string,
): ChatMessage[] {
  return messages.map((message) => {
    if (message.responseId !== responseId || !chunk) return message
    return {
      ...message,
      text: (message.text === CHAT_PENDING_TEXT ? '' : message.text) + chunk,
    }
  })
}
