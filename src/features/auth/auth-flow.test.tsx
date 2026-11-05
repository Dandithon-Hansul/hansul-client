import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEMO_ACCOUNT, readMockDb } from '../../lib/mock/mockDb'
import { currentPath as path, loginAsDemo, renderApp } from '../../test/renderApp'

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

  it('로그아웃하면 다시 로그인 화면으로 간다 (프로필 편집 화면 하단)', async () => {
    loginAsDemo()
    const user = renderApp('/profile/edit')
    await user.click(await screen.findByRole('button', { name: '로그아웃' }))
    expect(await screen.findByPlaceholderText('아이디 입력')).toBeInTheDocument()
    expect(readMockDb().session).toBeNull()

    // 다시 로그인하면 편집 화면이 아니라 홈으로
    await user.type(screen.getByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), DEMO_ACCOUNT.password)
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText(/오늘은 어떤 맛의 기억을/)).toBeInTheDocument()
    expect(path()).toHaveTextContent(/^\/$/)
  })
})

describe('회원가입', () => {
  it('세 칸을 다 채우기 전에는 버튼이 비활성화되고, 비밀번호 규칙 안내가 보인다', async () => {
    const user = renderApp('/signup')
    const button = await screen.findByRole('button', { name: '가입하고 시작하기' })
    expect(button).toBeDisabled()
    expect(screen.getByText('영문과 숫자를 포함해 8자 이상')).toBeInTheDocument()
    await user.type(screen.getByLabelText('아이디'), 'newcook')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret123')
    expect(button).toBeEnabled()
  })

  it('규칙에 안 맞으면 칸마다 안내 문구를 보여준다', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), 'ab')
    await user.type(screen.getByLabelText('비밀번호'), '12345678')
    await user.type(screen.getByLabelText('비밀번호 확인'), '999')
    await user.click(screen.getByRole('button', { name: '가입하고 시작하기' }))
    expect(screen.getByText('영문 소문자·숫자·밑줄(_) 4~20자로 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호는 영문과 숫자를 포함해 8자 이상으로 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호가 일치하지 않아요.')).toBeInTheDocument()
  })

  it('가입하면 바로 로그인되고 (프로필이 없으니) 온보딩으로 간다', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), 'newcook')
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하고 시작하기' }))
    expect(await screen.findByText('어떤 이름을 사용하실 건가요?')).toBeInTheDocument()
    expect(path()).toHaveTextContent('/onboarding')
  })

  it('이미 있는 아이디면 가입을 막는다', async () => {
    const user = renderApp('/signup')
    await user.type(await screen.findByLabelText('아이디'), DEMO_ACCOUNT.loginId)
    await user.type(screen.getByLabelText('비밀번호'), 'secret123')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'secret123')
    await user.click(screen.getByRole('button', { name: '가입하고 시작하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 아이디예요.')
    expect(path()).toHaveTextContent('/signup')
  })
})
