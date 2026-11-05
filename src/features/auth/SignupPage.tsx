import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { PASSWORD_MIN, validateSignup, type SignupErrors } from '../../lib/auth/validation'
import { useAuth } from './auth-context'
import './auth.css'

/**
 * [회원가입] 목업이 없어서 온보딩 화면과 같은 톤으로 구성
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      <button className="signup-back" type="button" onClick={() => navigate('/login')} aria-label="로그인으로 돌아가기">‹</button>
      <h1>한술에 오신 것을<br />환영해요</h1>
      <p className="signup-subtitle">로그인에 사용할 아이디와 비밀번호를 정해주세요.</p>

      <form className="signup-form" onSubmit={submit} noValidate>
        <label htmlFor="signup-id">아이디</label>
        <input id="signup-id" className="signup-input" autoComplete="username" autoCapitalize="none" placeholder="영문 소문자·숫자 4~20자" value={loginId} onChange={(event) => setLoginId(event.target.value)} aria-invalid={Boolean(errors.loginId)} />
        {errors.loginId && <p className="auth-error">{errors.loginId}</p>}

        <label htmlFor="signup-password">비밀번호</label>
        <input id="signup-password" className="signup-input" type="password" autoComplete="new-password" placeholder={`${PASSWORD_MIN}자 이상`} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} />
        {errors.password && <p className="auth-error">{errors.password}</p>}
        <input className="signup-input" type="password" autoComplete="new-password" placeholder="비밀번호 확인" aria-label="비밀번호 확인" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} aria-invalid={Boolean(errors.passwordConfirm)} />
        {errors.passwordConfirm && <p className="auth-error">{errors.passwordConfirm}</p>}

        <div className="signup-bottom">
          {serverError && <p className="auth-error center" role="alert">{serverError}</p>}
          {info && <p className="auth-notice">{info}</p>}
          <button type="submit" disabled={submitting}>{submitting ? '가입 중…' : '가입하기'}</button>
          <p className="signup-login">이미 계정이 있나요? <Link to="/login">로그인</Link></p>
        </div>
      </form>
    </main>
  )
}

export default SignupPage
