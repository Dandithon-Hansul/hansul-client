import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loginAsDemo, renderApp } from '../../test/renderApp'

describe('녹음 → 음식 이야기 진행 디자인', () => {
  it('녹음 전에는 첫 번째 진행 표시가 활성화된다', async () => {
    loginAsDemo()
    renderApp('/record')
    const stages = await screen.findByRole('navigation', { name: '음식 이야기 진행 단계' })
    expect(stages.closest('main')).toHaveClass('record-page')
    expect(stages.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
    expect(stages.querySelector('[aria-current="step"]')).toHaveTextContent('녹음 준비')
    expect(screen.queryByText('음성 전사')).not.toBeInTheDocument()
  })
  it('채팅에서 마지막 표시가 활성화되고 임시 개발 버튼·문구를 보이지 않는다', async () => {
    loginAsDemo()
    renderApp('/chat')
    const stages = await screen.findByRole('navigation', { name: '음식 이야기 진행 단계' })
    expect(stages.closest('main')).toHaveClass('chat-page')
    expect(stages.querySelector('[aria-current="step"]')).toHaveTextContent('음식 이야기')
    expect(stages.closest('main')?.querySelector('.chat-bot-avatar img')).toHaveAttribute('src', '/images/hansul-logo-mark.png')
    expect(screen.getByText('한술봇')).toBeInTheDocument()
    expect(screen.queryByText('AI 음성 기록')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '손맛 프로파일 업데이트' })).not.toBeInTheDocument()
  })
})
