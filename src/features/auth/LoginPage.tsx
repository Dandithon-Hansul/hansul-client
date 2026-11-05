import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

/** 기존 App.tsx 의 로그인 화면을 그대로 분리 (아직 실제 인증 없음) */
function LoginPage() {
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')

  function startLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loginId.trim() && password.trim()) navigate('/')
  }

  return (
    <section className="flow-screen">
      <div className="flow-card login-card">
        <div className="login-brand">
          <img className="login-mark" src="/images/hansul-mark-alt.png" alt="" />
          <span>한술</span>
        </div>
        <p className="login-tagline">당신의 한술이 우리 지역의 맛을 이어갑니다.</p>
        <form onSubmit={startLogin}>
          <input aria-label="아이디" type="text" autoComplete="username" placeholder="아이디 입력" value={loginId} onChange={(event) => setLoginId(event.target.value)} required />
          <input aria-label="비밀번호" type="password" autoComplete="current-password" placeholder="비밀번호 입력" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="primary-button login-button" type="submit">로그인</button>
        </form>
        <button className="signup-link" type="button" onClick={() => navigate('/onboarding')}>회원가입</button>
      </div>
    </section>
  )
}

export default LoginPage
