import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readMockDb } from '../../lib/mock/mockDb'
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
    // 서버 저장이 끝난 뒤 홈으로 이동
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent(/^\/$/)
    expect(readMockDb().profiles['mock-user-newbie']?.region?.code).toBe('47170')
  })

  it('가입 → 온보딩 완료 후 마이페이지에 들어가면 다시 온보딩으로 가지 않는다 (버그 수정 확인)', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), 'newcook')
    await user.type(screen.getByLabelText('비밀번호'), 'hansul123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'hansul123')
    await user.click(screen.getByRole('button', { name: '가입하고 시작하기' }))

    await user.type(await screen.findByLabelText('어떤 이름을 사용하실 건가요?'), '새요리사')
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '건너뛰기' }))
    await user.click(screen.getByRole('button', { name: '찜·조림' }))
    await user.click(screen.getByRole('button', { name: '한술 시작하기' }))

    // 서버(mock)에 프로필이 저장됨 — 지역은 건너뛰어서 null
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
    const saved = readMockDb().profiles['mock-user-newcook']
    expect(saved).toMatchObject({ display_name: '새요리사', region: null, food_preferences: ['찜·조림'], role: 'transmitter' })

    // 홈 → 프로필: 온보딩이 아니라 마이페이지가 나와야 함
    await user.click(screen.getByRole('button', { name: '프로필' }))
    expect(await screen.findByText('새요리사')).toBeInTheDocument()
    expect(screen.getByText('지역 미설정')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/profile')
  })
})

