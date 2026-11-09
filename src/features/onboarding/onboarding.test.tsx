import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readMockDb } from '../../lib/mock/mockDb'
import { currentPath, loginAsNewUser, renderApp } from '../../test/renderApp'

type User = ReturnType<typeof renderApp>

/** 2단계에서 지역 시트를 열어 고르고 '다음'까지 누름 */
async function pickRegion(user: User, sido: '대구광역시' | '경상북도', district: string) {
  await user.click(screen.getByRole('button', { name: /지역을 설정해주세요/ }))
  const sheet = screen.getByRole('dialog')
  await user.click(within(sheet).getByRole('tab', { name: sido }))
  await user.click(within(sheet).getByRole('button', { name: district }))
  await user.click(within(sheet).getByRole('button', { name: '선택완료' }))
  await user.click(screen.getByRole('button', { name: '다음' }))
}

describe('온보딩 (Figma 최종 디자인)', () => {
  it('이름 → 지역(필수) → 음식(최대 2개) 순서로 진행한다', async () => {
    loginAsNewUser(false)
    const user = renderApp('/onboarding')

    // 1단계: 뒤로가기 없음, 이름을 넣어야 다음
    expect(await screen.findByText('어떤 이름을 사용하실 건가요?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '이전' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    await user.type(screen.getByLabelText('어떤 이름을 사용하실 건가요?'), '김한술')
    await user.click(screen.getByRole('button', { name: '다음' }))

    // 2단계: 지역을 골라야 "다음" (건너뛰기 없음 — 지역이 없으면 레시피가 지도에 안 나옴)
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '건너뛰기' })).not.toBeInTheDocument()
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
    await pickRegion(user, '대구광역시', '대구광역시')
    await user.click(screen.getByRole('button', { name: '찜·조림' }))
    await user.click(screen.getByRole('button', { name: '한술 시작하기' }))

    // 서버(mock)에 프로필이 저장됨 — 대구는 군위 포함 하나(27000)
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
    const saved = readMockDb().profiles['mock-user-newcook']
    expect(saved).toMatchObject({ display_name: '새요리사', region: { code: '27000' }, food_preferences: ['찜·조림'] })
    expect(saved).not.toHaveProperty('role') // 명세서: 역할 선택 없음

    // 홈 → 프로필: 온보딩이 아니라 마이페이지가 나와야 함
    await user.click(screen.getByRole('button', { name: '프로필' }))
    expect(await screen.findByText('새요리사')).toBeInTheDocument()
    expect(screen.getByText('대구광역시')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/profile')
  })

  it('로그인은 유지돼 있는데 서버에 프로필이 없으면 홈 대신 온보딩으로 (예전 버전에서 만든 계정)', async () => {
    loginAsNewUser(false)
    // 예전 버전은 온보딩 결과를 브라우저에만 저장했음 → 홈에는 '1님'이 보이지만 서버에는 프로필이 없음
    window.localStorage.setItem('hansul.onboarding', JSON.stringify({ name: '1', regionCode: '', favoriteFoods: [] }))
    const user = renderApp('/')
    const nameInput = await screen.findByLabelText('어떤 이름을 사용하실 건가요?')
    expect(nameInput).toHaveValue('1') // 예전에 입력한 값은 채워 둠
    expect(currentPath()).toHaveTextContent('/onboarding')

    // 온보딩을 끝내면 그다음부터는 홈·프로필이 정상
    await user.click(screen.getByRole('button', { name: '다음' }))
    await pickRegion(user, '경상북도', '경주시')
    await user.click(screen.getByRole('button', { name: '구이' }))
    await user.click(screen.getByRole('button', { name: '한술 시작하기' }))
    await user.click(await screen.findByRole('button', { name: '프로필' }))
    expect(await screen.findByRole('link', { name: '프로필 편집' })).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/profile')
  })
})
