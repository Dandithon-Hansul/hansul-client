import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { getUserProfile } from '../../lib/api/profile'
import { loginAsDemo, renderApp } from '../../test/renderApp'

// 다른 사용자 프로필 요청만 원하는 실패로 바꿔서 실제 서버 응답을 흉내 냄
vi.mock('../../lib/api/profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/profile')>()
  return { ...actual, getUserProfile: vi.fn(actual.getUserProfile) }
})

describe('다른 사용자 프로필을 못 불러올 때', () => {
  it('ID 형식 오류(400)는 찾을 수 없다고 안내하고, 로딩 모양·다시 시도 버튼은 숨긴다', async () => {
    vi.mocked(getUserProfile).mockRejectedValueOnce(new ApiError(400, 'INVALID_PROFILE_ID', '프로필 ID 형식이 올바르지 않습니다.'))
    loginAsDemo()
    renderApp('/users/not-a-uuid')

    expect(await screen.findByText('프로필을 찾을 수 없어요.')).toBeInTheDocument()
    expect(screen.queryByText('프로필 ID 형식이 올바르지 않습니다.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 불러오기' })).not.toBeInTheDocument()
    expect(document.body.querySelector('.is-skeleton')).toBeNull()
  })

  it('서버 오류처럼 다시 시도하면 될 수 있는 실패는 다시 불러오기를 보여준다', async () => {
    vi.mocked(getUserProfile).mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', '전승자 정보를 불러오지 못했습니다.'))
    loginAsDemo()
    renderApp('/users/u-kim-hansul')

    expect(await screen.findByRole('button', { name: '다시 불러오기' })).toBeInTheDocument()
    expect(document.body.querySelector('.is-skeleton')).toBeNull()
  })
})
