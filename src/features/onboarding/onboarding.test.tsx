import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { currentPath, loginAsNewUser, renderApp } from '../../test/renderApp'

describe('온보딩 (Figma 최종 디자인)', () => {
  it('이름 → 지역(건너뛰기 가능) → 음식(최대 2개) 순서로 진행한다', async () => {
    loginAsNewUser(false)
    const user = renderApp('/onboarding')

    // 1단계: 뒤로가기 없음, 이름을 넣어야 다음
    expect(await screen.findByText('어떤 이름을 사용하실 건가요?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '이전' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    await user.type(screen.getByLabelText('어떤 이름을 사용하실 건가요?'), '김한술')
    await user.click(screen.getByRole('button', { name: '다음' }))

    // 2단계: 지역 안 고르면 "건너뛰기", 고르면 시·군 이름만 표시하고 "다음"
    expect(screen.getByRole('button', { name: '건너뛰기' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /지역을 설정해주세요/ }))
    const sheet = screen.getByRole('dialog')
    await user.click(within(sheet).getByRole('tab', { name: '경상북도' }))
    expect(within(sheet).getByRole('button', { name: '선택완료' })).toBeDisabled()
    await user.click(within(sheet).getByRole('button', { name: '안동시' }))
    await user.click(within(sheet).getByRole('button', { name: '선택완료' }))
    expect(screen.getByRole('button', { name: '안동시' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다음' }))

    // 3단계: 최대 2개까지만 선택
    const start = screen.getByRole('button', { name: '한술 시작하기' })
    expect(start).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '탕·찌개·전골' }))
    await user.click(screen.getByRole('button', { name: '구이' }))
    await user.click(screen.getByRole('button', { name: '볶음' }))
    expect(screen.getByRole('button', { name: '볶음' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2)

    // 뒤로 가도 입력값 유지
    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByRole('button', { name: '안동시' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다음' }))

    await user.click(screen.getByRole('button', { name: '한술 시작하기' }))
    expect(currentPath()).toHaveTextContent(/^\/$/)
  })
})
