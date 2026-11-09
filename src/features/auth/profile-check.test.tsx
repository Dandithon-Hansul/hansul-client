import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { getMyProfile } from '../../lib/api/profile'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

// 프로필 확인(GET /api/profiles/me)만 원하는 결과로 바꿔서 실제 서버의 실패 상황을 흉내 냄
vi.mock('../../lib/api/profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/profile')>()
  return { ...actual, getMyProfile: vi.fn(actual.getMyProfile) }
})

const profileCheck = vi.mocked(getMyProfile)
const networkError = new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했어요.')
const notFound = new ApiError(404, 'PROFILE_NOT_FOUND', '온보딩을 먼저 완료해 주세요.')

describe('프로필 확인이 404 가 아닌 이유로 실패할 때', () => {
  beforeEach(() => {
    profileCheck.mockClear() // 화살표로 바로 돌려주면 vitest 가 정리 함수로 여겨 테스트 뒤에 호출함
  })
  afterEach(async () => {
    const actual = await vi.importActual<typeof import('../../lib/api/profile')>('../../lib/api/profile')
    profileCheck.mockImplementation(actual.getMyProfile)
  })

  it('가입 직후 서버에 연결하지 못하면 홈으로 넘기지 않고 이유를 보여주고, 다시 시도해서 404 면 온보딩으로', async () => {
    profileCheck.mockRejectedValueOnce(networkError).mockRejectedValueOnce(notFound)
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), 'newcook')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하고 시작하기' }))

    const dialog = await screen.findByRole('alertdialog', { name: '내 정보를 불러오지 못했어요' })
    expect(within(dialog).getByText('서버에 연결하지 못했어요.')).toBeInTheDocument()
    expect(within(dialog).getByText('NETWORK_ERROR')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/signup') // 예전 버그: 여기서 홈('/')으로 넘어갔음

    await user.click(within(dialog).getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('어떤 이름을 사용하실 건가요?')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/onboarding')
  })

  it('로그인된 채로 홈을 열 때 실패하면 이유를 보여주고, 다시 시도해서 성공하면 홈', async () => {
    loginAsDemo()
    profileCheck.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', '유효한 로그인이 필요합니다.'))
    const user = renderApp('/')
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('UNAUTHORIZED · 401')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
  })

  it('로그아웃을 누르면 로그인 화면으로 (막힌 채로 두지 않음)', async () => {
    loginAsDemo()
    profileCheck.mockRejectedValueOnce(networkError)
    const user = renderApp('/')
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '로그아웃' }))
    expect(await screen.findByPlaceholderText('아이디 입력')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/login')
  })
})
