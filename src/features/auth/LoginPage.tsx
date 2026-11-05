import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from './auth-context'
import './auth.css'

/**
 * [로그인] 아이디·비밀번호 → Supabase 로그인
 * 성공하면 화면 이동은 PublicOnly 가드가 맡음 (프로필 없으면 온보딩, 있으면 홈)
 */
function LoginPage() {
  const { signIn } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function startLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setSubmitting(true)
    const result = await signIn(loginId, password)
    // 성공하면 곧 다른 화면으로 넘어가므로 버튼은 계속 "로그인 중" 상태로 둠
    if (!result.ok) {
      setError(result.message)
      setSubmitting(false)
    }
  }

  return (
    <section className="flow-screen">
      <div className="flow-card login-card">
        <div className="login-brand">
          <img className="login-mark" src="/images/hansul-mark-alt.png" alt="" />
          <span>한술</span>
        </div>
        <p className="login-tagline">당신의 한술이 우리 지역의 맛을 이어갑니다.</p>
        <form onSubmit={startLogin} noValidate>
          <input aria-label="아이디" type="text" autoComplete="username" autoCapitalize="none" placeholder="아이디 입력" value={loginId} onChange={(event) => setLoginId(event.target.value)} aria-invalid={Boolean(error)} />
          <input aria-label="비밀번호" type="password" autoComplete="current-password" placeholder="비밀번호 입력" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} />
          <p className="auth-error" role="alert">{error}</p>
          <button className="primary-button login-button" type="submit" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <nav className="auth-links" aria-label="계정">
          <button type="button" onClick={() => setNotice('아이디 찾기는 준비 중이에요.')}>아이디 찾기</button>
          <span aria-hidden="true" />
          <button type="button" onClick={() => setNotice('비밀번호 찾기는 준비 중이에요.')}>비밀번호 찾기</button>
          <span aria-hidden="true" />
          <Link to="/signup">회원가입</Link>
        </nav>
        {notice && <p className="auth-notice">{notice}</p>}
      </div>
    </section>
  )
}

export default LoginPage
