import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { BackIcon } from '../../components/icons'
import { PASSWORD_RULE, validateSignup, type SignupErrors } from '../../lib/auth/validation'
import { useAuth } from './auth-context'
import './auth.css'

/**
 * [회원가입] Figma 최종 디자인 기준 — 아이디·비밀번호만 받고 이름은 온보딩에서 (팀 결정: 닉네임 제외)
 * 가입하면 바로 로그인 상태가 되고 → PublicOnly 가드가 온보딩으로 보냄 (아직 프로필이 없으므로)
 */
function SignupPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState<SignupErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 세 칸이 다 채워져야 버튼 활성화 (온보딩 버튼과 같은 방식)
  const filled = loginId.trim() !== '' && password !== '' && passwordConfirm !== ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!filled || submitting) return
    setServerError(null)
    setInfo(null)
    const nextErrors = validateSignup(loginId, password, passwordConfirm)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await signUp(loginId, password)
    if (!result.ok) {
      setServerError(result.message)
      setSubmitting(false)
      return
    }
    if (result.needsEmailConfirm) {
      setInfo('가입은 됐지만 로그인 세션이 만들어지지 않았어요. Supabase 의 "Confirm email" 설정을 꺼주세요.')
      setSubmitting(false)
    }
  }

  return (
    <main className="signup-page">
      <header className="signup-header">
        <button className="page-back" type="button" onClick={() => navigate('/login')} aria-label="로그인으로 돌아가기"><BackIcon /></button>
        <h1>회원가입</h1>
      </header>

      <form className="signup-form" onSubmit={submit} noValidate>
        <div className="signup-field">
          <label htmlFor="signup-id">아이디</label>
          <input id="signup-id" className="auth-input" autoComplete="username" autoCapitalize="none" placeholder="아이디 입력" value={loginId} onChange={(event) => setLoginId(event.target.value)} aria-invalid={Boolean(errors.loginId)} />
          {errors.loginId && <p className="auth-error">{errors.loginId}</p>}
        </div>

        <div className="signup-field">
          <label htmlFor="signup-password">비밀번호</label>
          <input id="signup-password" className="auth-input" type="password" autoComplete="new-password" placeholder="비밀번호 입력" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby="signup-password-hint" />
          {errors.password ? <p className="auth-error" id="signup-password-hint">{errors.password}</p> : <p className="signup-hint" id="signup-password-hint">{PASSWORD_RULE}</p>}
        </div>

        <div className="signup-field">
          <label htmlFor="signup-password-confirm">비밀번호 확인</label>
          <input id="signup-password-confirm" className="auth-input" type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} aria-invalid={Boolean(errors.passwordConfirm)} />
          {errors.passwordConfirm && <p className="auth-error">{errors.passwordConfirm}</p>}
        </div>

        <div className="signup-bottom">
          {serverError && <p className="auth-error center" role="alert">{serverError}</p>}
          {info && <p className="auth-notice">{info}</p>}
          <button className="auth-submit" type="submit" disabled={!filled} aria-busy={submitting}>{submitting ? '가입 중…' : '가입하고 시작하기'}</button>
        </div>
      </form>
    </main>
  )
}

export default SignupPage
