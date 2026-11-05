import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from './auth-context'
import './auth.css'

/**
 * [로그인] Figma 최종 디자인 기준
 * 성공하면 화면 이동은 PublicOnly 가드가 맡음 (프로필 없으면 온보딩, 있으면 원래 가려던 곳)
 * 로그인 버튼 아래 '회원가입' 글자 링크 (Figma 최종)
 */
function LoginPage() {
  const { signIn } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function startLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }
    setSubmitting(true)
    const result = await signIn(loginId, password)
    // 성공하면 곧 다른 화면으로 넘어가므로 버튼은 "로그인 중" 상태로 둠
    if (!result.ok) {
      setError(result.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand">
        <img className="login-mark" src="/images/hansul-mark-alt.png" alt="" />
        <span>한술</span>
      </div>
      <p className="login-tagline">당신의 한 술이 우리 지역의 맛을 이어갑니다.</p>

      <form className="login-form" onSubmit={startLogin} noValidate>
        <input className="auth-input" aria-label="아이디" type="text" autoComplete="username" autoCapitalize="none" placeholder="아이디 입력" value={loginId} onChange={(event) => setLoginId(event.target.value)} aria-invalid={Boolean(error)} />
        <input className="auth-input" aria-label="비밀번호" type="password" autoComplete="current-password" placeholder="비밀번호 입력" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} />
        <p className="auth-error" role="alert">{error}</p>
        <button className="auth-submit" type="submit" aria-busy={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <Link className="login-signup" to="/signup">회원가입</Link>
    </main>
  )
}

export default LoginPage
