import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import './App.css'
import { isFeaturePage, pathOf, type Destination } from './app/paths'
import Splash from './app/Splash'
import { useSplash } from './app/useSplash'
import LoginPage from './features/auth/LoginPage'
import HomeScreen from './features/home/HomeScreen'
import OnboardingFlow from './features/onboarding/OnboardingFlow'
import PostOnboardingScreens from './features/screens/PostOnboardingScreens'

type OnboardingData = { name: string; region: string; favoriteFoods: string[] }
const ONBOARDING_KEY = 'hansul.onboarding'

/** 새로고침해도 이름·지역이 남도록 기존에 저장하던 값을 다시 읽어옴 (API 연결 전 임시) */
function loadOnboarding(): OnboardingData {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ONBOARDING_KEY) ?? 'null') as Partial<OnboardingData> | null
    return { name: saved?.name ?? '', region: saved?.region ?? '', favoriteFoods: saved?.favoriteFoods ?? [] }
  } catch {
    return { name: '', region: '', favoriteFoods: [] }
  }
}

type OnboardingRouteProps = Omit<Parameters<typeof OnboardingFlow>[0], 'step' | 'setStep'>

/** 온보딩에 들어올 때마다 1단계부터 시작하도록 step 은 여기서 관리 */
function OnboardingRoute(props: OnboardingRouteProps) {
  const [step, setStep] = useState(0)
  return <OnboardingFlow {...props} step={step} setStep={setStep} />
}

type FeatureRouteProps = Omit<Parameters<typeof PostOnboardingScreens>[0], 'page'>

/** /record, /chat, /profile … 를 기존 PostOnboardingScreens 의 page 로 넘김 */
function FeatureRoute(props: FeatureRouteProps) {
  const { page } = useParams()
  if (!isFeaturePage(page)) return <Navigate to="/" replace />
  return <PostOnboardingScreens {...props} page={page} />
}

function App({ splashMs }: { splashMs?: number }) {
  const navigate = useNavigate()
  const showSplash = useSplash(splashMs)
  const [initial] = useState(loadOnboarding)
  const [name, setName] = useState(initial.name)
  const [region, setRegion] = useState(initial.region)
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>(initial.favoriteFoods)

  const go = (destination: Destination) => navigate(pathOf(destination))

  function completeOnboarding() {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ name, region, favoriteFoods }))
    navigate('/')
  }

  if (showSplash) return <main className="app-shell"><Splash /></main>

  return (
    <main className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={<OnboardingRoute name={name} setName={setName} region={region} setRegion={setRegion} favoriteFoods={favoriteFoods} setFavoriteFoods={setFavoriteFoods} onComplete={completeOnboarding} onExit={() => navigate('/login')} />}
        />
        <Route path="/" element={<HomeScreen name={name} onNavigate={go} />} />
        {/* :page 하나로 받아야 record → chat 이동 때 대화 state 가 기존처럼 유지됨 */}
        <Route path="/:page" element={<FeatureRoute name={name} region={region} favoriteFoods={favoriteFoods} onNavigate={go} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

export default App
