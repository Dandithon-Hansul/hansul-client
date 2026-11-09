import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import './App.css'
import { isFeaturePage, pathOf, recipePath, type Destination } from './app/paths'
import Splash from './app/Splash'
import { useSplash } from './app/useSplash'
import { setupProfile } from './lib/api/profile'
import { markProfileReady } from './lib/api/profileStatus'
import { findRegionByCode, findRegionByText, formatRegion } from './lib/regions'
import { useAuth } from './features/auth/auth-context'
import LoginPage from './features/auth/LoginPage'
import { PublicOnly, RequireAuth, RequireProfile } from './features/auth/RouteGuards'
import SignupPage from './features/auth/SignupPage'
import MapPage from './features/map/MapPage'
import HomeScreen from './features/home/HomeScreen'
import ProfileEditPage from './features/profile/ProfileEditPage'
import ProfilePage from './features/profile/ProfilePage'
import UserProfilePage from './features/profile/UserProfilePage'
import OnboardingFlow from './features/onboarding/OnboardingFlow'
import PostOnboardingScreens from './features/screens/PostOnboardingScreens'

type OnboardingData = { name: string; regionCode: string; favoriteFoods: string[] }
const ONBOARDING_KEY = 'hansul.onboarding'

/** 새로고침해도 이름·지역이 남도록 저장해 둔 값을 다시 읽어옴 (온보딩 API 연결 전 임시) */
function loadOnboarding(): OnboardingData {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ONBOARDING_KEY) ?? 'null') as (Partial<OnboardingData> & { region?: string }) | null
    // 예전에는 "대구광역시 · 수성구" 문자열로 저장했음 → 코드로 바꿔 읽기
    const regionCode = saved?.regionCode ?? findRegionByText(saved?.region)?.code ?? ''
    return { name: saved?.name ?? '', regionCode, favoriteFoods: saved?.favoriteFoods ?? [] }
  } catch {
    return { name: '', regionCode: '', favoriteFoods: [] }
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
  const { status, session } = useAuth()
  const showSplash = useSplash(splashMs)
  const [initial] = useState(loadOnboarding)
  const [name, setName] = useState(initial.name)
  const [regionCode, setRegionCode] = useState(initial.regionCode)
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>(initial.favoriteFoods)

  const go = (destination: Destination) => navigate(pathOf(destination))

  /** "한술 시작하기": 서버에 프로필 저장 → 홈. 실패하면 에러를 던져 온보딩 화면에서 안내 */
  async function completeOnboarding() {
    await setupProfile({
      display_name: name.trim(),
      region_code: regionCode || null, // 지역 건너뛰면 null
      food_preferences: favoriteFoods,
    })
    markProfileReady(session?.userId) // 이제 프로필이 있으니 홈 등에 들어갈 수 있음
    // 홈 화면이 아직 API 대신 이 값으로 이름을 보여줘서 함께 저장 (홈 API 연결 후 제거)
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ name, regionCode, favoriteFoods }))
    navigate('/', { replace: true })
  }

  // 스플래시가 끝나도 저장된 로그인 세션을 읽는 중이면 계속 스플래시
  if (showSplash || status === 'loading') return <main className="app-shell"><Splash /></main>

  return (
    <main className="app-shell">
      <Routes>
        {/* 로그인 전 화면: 이미 로그인했으면 홈/온보딩으로 */}
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* 로그인해야 들어갈 수 있는 화면 */}
        <Route element={<RequireAuth />}>
          <Route
            path="/onboarding"
            element={<OnboardingRoute name={name} setName={setName} regionCode={regionCode} setRegionCode={setRegionCode} favoriteFoods={favoriteFoods} setFavoriteFoods={setFavoriteFoods} onComplete={completeOnboarding} />}
          />
          {/* 온보딩을 끝내서 서버에 프로필이 있어야 들어갈 수 있는 화면 */}
          <Route element={<RequireProfile />}>
            <Route path="/" element={<HomeScreen name={name} onNavigate={go} onRecipeSelect={(recipeId) => navigate(recipePath(recipeId))} />} />
            {/* 프로필: 기존 PostOnboardingScreens 의 'profile' 화면 대신 목업 기준 새 화면 */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/users/:id" element={<UserProfilePage />} />
            {/* 지도: 기존 PostOnboardingScreens 의 'map' 임시 화면 대신 [S-07] 지역 지도 */}
            <Route path="/map" element={<MapPage />} />
            {/* :page 하나로 받아야 record → chat 이동 때 대화 state 가 기존처럼 유지됨 */}
            <Route path="/:page" element={<FeatureRoute name={name} region={regionCode ? formatRegion(findRegionByCode(regionCode)) : ''} favoriteFoods={favoriteFoods} onNavigate={go} />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

export default App
