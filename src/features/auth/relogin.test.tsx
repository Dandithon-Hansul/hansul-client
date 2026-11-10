import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { getMyProfile } from '../../lib/api/profile'
import { DEMO_ACCOUNT } from '../../lib/mock/mockDb'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

// 첫 프로필 확인만 실패시켜서 '내 정보를 불러오지 못했어요' 화면의 로그아웃을 누르게 함
vi.mock('../../lib/api/profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/profile')>()
  return { ...actual, getMyProfile: vi.fn(actual.getMyProfile) }
})

describe('직접 로그아웃 → 다시 로그인', () => {
  it('로그아웃한 화면으로 돌아가지 않고 홈으로 간다 (돌아갈 곳은 세션이 끊겼을 때만 기억)', async () => {
    vi.mocked(getMyProfile).mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', '프로필 요청을 처리하지 못했습니다.'))
    loginAsDemo()
    const user = renderApp('/profile')

    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '로그아웃' }))
    expect(await screen.findByPlaceholderText('아이디 입력')).toBeInTheDocument()

    await user.type(screen.getByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), DEMO_ACCOUNT.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent(/^\/$/)
  })

  it('로그인 안 한 채 주소로 들어온 경우는 그 주소를 기억해 로그인 뒤 돌아간다 (기존 동작 유지)', async () => {
    const user = renderApp('/profile')
    await user.type(await screen.findByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), DEMO_ACCOUNT.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByRole('heading', { name: '마이페이지' })).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/profile')
  })
})
