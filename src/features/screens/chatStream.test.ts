import { describe, expect, it } from 'vitest'
import { appendChatStreamChunk, CHAT_PENDING_TEXT, type ChatMessage } from './chatStream'

describe('AI 채팅 SSE 말풍선', () => {
  it('세 번 나뉘어 도착한 청크를 같은 말풍선 하나에 합친다', () => {
    let messages: ChatMessage[] = [
      { from: 'user', text: '간장은 얼마나 넣어요?' },
      { from: 'ai', text: CHAT_PENDING_TEXT, responseId: 'reply-1' },
    ]

    for (const chunk of ['간장은', ' 두 큰술', ' 넣으세요.']) {
      messages = appendChatStreamChunk(messages, 'reply-1', chunk)
      expect(messages).toHaveLength(2)
      expect(messages.filter((message) => message.from === 'ai')).toHaveLength(1)
    }
    expect(messages.at(-1)?.text).toBe('간장은 두 큰술 넣으세요.')
    expect(messages[0].text).toBe('간장은 얼마나 넣어요?')
  })

  it('다른 AI 답변은 수정하지 않는다', () => {
    const initial: ChatMessage[] = [
      { from: 'ai', text: '첫 질문입니다.' },
      { from: 'user', text: '답변' },
      { from: 'ai', text: '기존 답변', responseId: 'reply-old' },
      { from: 'ai', text: CHAT_PENDING_TEXT, responseId: 'reply-new' },
    ]
    const next = appendChatStreamChunk(initial, 'reply-new', '새 답변')
    expect(next.map((message) => message.text)).toEqual(['첫 질문입니다.', '답변', '기존 답변', '새 답변'])
    expect(initial[3].text).toBe(CHAT_PENDING_TEXT)
  })

  it('빈 청크는 대기 중인 말풍선을 변경하지 않는다', () => {
    const initial: ChatMessage[] = [{ from: 'ai', text: CHAT_PENDING_TEXT, responseId: 'reply-1' }]
    expect(appendChatStreamChunk(initial, 'reply-1', '')).toEqual(initial)
  })
})
