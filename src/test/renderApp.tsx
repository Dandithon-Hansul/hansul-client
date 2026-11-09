import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App'
import AuthProvider from '../features/auth/AuthProvider'
import { readMockDb, writeMockDb } from '../lib/mock/mockDb'
import CurrentPath from './CurrentPath'

/** 실제 앱과 똑같이 조립하되 시작 주소를 정하고 스플래시는 끔 (테스트는 항상 mock 모드) */
export function renderApp(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App splashMs={0} />
        <CurrentPath />
      </AuthProvider>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

export const currentPath = () => screen.getByTestId('path')

/** 데모 계정(프로필 있음)으로 로그인된 상태를 미리 만들어 둠 */
export function loginAsDemo() {
  const db = readMockDb()
  const account = db.accounts[0]
  db.session = { userId: account.userId, loginId: account.loginId, accessToken: 'mock-token' }
  writeMockDb(db)
}

/** 프로필이 없는 새 계정으로 로그인된 상태 */
export function loginAsNewUser(withProfile = false) {
  const db = readMockDb()
  const userId = 'mock-user-newbie'
  db.accounts.push({ userId, loginId: 'newbie', password: 'secret123' })
  db.session = { userId, loginId: 'newbie', accessToken: 'mock-token-newbie' }
  if (withProfile) {
    db.profiles[userId] = {
      id: userId,
      display_name: '새내기',
      avatar_url: null,
      region: null, // 건너뛰기를 막기 전에 가입한 계정 (지역 없음)
      bio: null,
      food_preferences: [],
      stats: { transmitted_recipes: 0, saved_recipes: 0, likes_received: 0 },
    }
  }
  writeMockDb(db)
}
