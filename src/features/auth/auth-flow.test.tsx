import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { DEMO_ACCOUNT, readMockDb, writeMockDb } from '../../lib/mock/mockDb'
import AuthProvider from './AuthProvider'

/** 현재 주소를 화면에 찍어서 "어디로 이동했는지" 검사 */
function CurrentPath() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname}</output>
}

/** 실제 앱과 똑같이 조립하되, 주소를 마음대로 정하고 스플래시는 끔 (mock 모드) */
function renderApp(path: string) {
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

const path = () => screen.getByTestId('path')

/** 데모 계정으로 로그인된 상태를 미리 만들어 둠 */
function loginAsDemo() {
  const db = readMockDb()
  const account = db.accounts[0]
  db.session = { userId: account.userId, loginId: account.loginId, accessToken: 'mock-token' }
  writeMockDb(db)
}

describe('로그인 가드', () => {
  it('로그인 안 하고 /profile 에 가면 로그인 화면으로 보낸다', async () => {
    renderApp('/profile')
    expect(await screen.findByPlaceholderText('아이디 입력')).toBeInTheDocument()
    expect(path()).toHaveTextContent('/login')
  })

  it('이미 로그인했으면 /login 에 와도 홈으로 보낸다', async () => {
    loginAsDemo()
    renderApp('/login')
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
    expect(path()).toHaveTextContent(/^\/$/)
  })
})

describe('로그인', () => {
  it('빈 칸으로 누르면 안내 문구를 보여준다', async () => {
    const user = renderApp('/login')
    await user.click(await screen.findByRole('button', { name: '로그인' }))
    expect(screen.getByRole('alert')).toHaveTextContent('아이디와 비밀번호를 입력해주세요.')
  })

  it('비밀번호가 틀리면 에러를 보여주고 로그인 화면에 남는다', async () => {
    const user = renderApp('/login')
    await user.type(await screen.findByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('아이디 또는 비밀번호가 올바르지 않아요.')).toBeInTheDocument()
    expect(path()).toHaveTextContent('/login')
  })

  it('프로필이 있는 계정은 로그인하면 홈으로 간다', async () => {
    const user = renderApp('/login')
    await user.type(await screen.findByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), DEMO_ACCOUNT.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
  })

  it('로그인 전에 가려던 주소(/profile)로 돌아간다', async () => {
    const user = renderApp('/profile')
    await user.type(await screen.findByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), DEMO_ACCOUNT.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByRole('heading', { name: '마이페이지' })).toBeInTheDocument()
    expect(path()).toHaveTextContent('/profile')
  })

  it('로그아웃하면 다시 로그인 화면으로 간다', async () => {
    loginAsDemo()
    const user = renderApp('/profile')
    await user.click(await screen.findByRole('button', { name: '로그아웃' }))
    expect(await screen.findByPlaceholderText('아이디 입력')).toBeInTheDocument()
    expect(readMockDb().session).toBeNull()
  })
})

describe('회원가입', () => {
  it('규칙에 안 맞으면 칸마다 안내 문구를 보여준다', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), 'ab')
    await user.type(screen.getByLabelText('비밀번호'), '123')
    await user.type(screen.getByLabelText('비밀번호 확인'), '999')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(screen.getByText('영문 소문자·숫자·밑줄(_) 4~20자로 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호는 6자 이상이어야 해요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument()
  })

  it('가입하면 바로 로그인되고 (프로필이 없으니) 온보딩으로 간다', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), 'newcook')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('어떤 이름을 사용하실 건가요?')).toBeInTheDocument()
    expect(path()).toHaveTextContent('/onboarding')
  })

  it('이미 있는 아이디면 가입을 막는다', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 아이디예요.')
    expect(path()).toHaveTextContent('/signup')
  })
})
