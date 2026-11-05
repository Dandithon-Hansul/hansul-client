import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import HomeScreen from './features/home/HomeScreen'
import PostOnboardingScreens, { type FeaturePage } from './features/screens/PostOnboardingScreens'
import OnboardingFlow from './features/onboarding/OnboardingFlow'

type Screen = 'splash' | 'login' | 'onboarding' | 'home' | FeaturePage

function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([])
  const [onboardingStep, setOnboardingStep] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setScreen('login'), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  function startLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim() && password.trim()) setScreen('home')
  }

  function navigate(destination: 'home' | FeaturePage) {
    setScreen(destination)
  }

  function completeOnboarding() {
    window.localStorage.setItem('hansul.onboarding', JSON.stringify({ name, region, favoriteFoods }))
    setScreen('home')
  }

  return (
    <main className="app-shell">
      {screen === 'splash' && (
        <section className="splash" aria-label="한술 시작 화면">
          <div className="splash-brand">
            <span className="splash-mark-frame"><img className="splash-mark" src="/logo.svg" alt="" /></span>
            <span>한술</span>
          </div>
        </section>
      )}

      {screen === 'login' && (
        <section className="flow-screen">
          <div className="flow-card login-card">
            <div className="login-brand">
              <img className="login-mark" src="/images/hansul-mark-alt.png" alt="" />
              <span>한술</span>
            </div>
            <p className="login-tagline">당신의 한술이 우리 지역의 맛을 이어갑니다.</p>
            <form onSubmit={startLogin}>
              <input aria-label="아이디" type="text" autoComplete="username" placeholder="아이디 입력" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <input aria-label="비밀번호" type="password" autoComplete="current-password" placeholder="비밀번호 입력" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button className="primary-button login-button" type="submit">로그인</button>
            </form>
            <button className="signup-link" type="button" onClick={() => { setOnboardingStep(0); setScreen('onboarding') }}>회원가입</button>
          </div>
        </section>
      )}

      {screen === 'onboarding' && <OnboardingFlow name={name} setName={setName} region={region} setRegion={setRegion} favoriteFoods={favoriteFoods} setFavoriteFoods={setFavoriteFoods} step={onboardingStep} setStep={setOnboardingStep} onComplete={completeOnboarding} onExit={() => setScreen('login')} />}

      {screen === 'home' && <HomeScreen name={name} onNavigate={navigate} />}
      {screen !== 'splash' && screen !== 'login' && screen !== 'onboarding' && screen !== 'home' && <PostOnboardingScreens page={screen} name={name} region={region} favoriteFoods={favoriteFoods} onNavigate={navigate} />}
    </main>
  )
}

export default App
