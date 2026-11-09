import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../lib/api/client'
import { getMyProfile } from '../../lib/api/profile'
import { isProfileConfirmed, markProfileReady } from '../../lib/api/profileStatus'
import { useAuth } from './auth-context'
import './auth.css'

type FromState = { from?: string } | null

/** 로그인 후 돌아갈 주소 (외부 주소·로그인 화면 자체는 제외) */
function readFrom(state: unknown): string | null {
  const from = (state as FromState)?.from
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/login') || from.startsWith('/signup')) return null
  return from
}

/**
 * 프로필 확인(GET /api/profiles/me)이 404 가 아닌 이유로 실패했을 때 보여주는 화면.
 * 예전엔 백엔드가 없어도 써 볼 수 있게 조용히 홈으로 보냈는데, 그러면 가입 직후 온보딩을 건너뛰고
 * 원인(서버 주소·CORS·토큰 문제)도 안 보여서 이유를 화면에 띄우고 다시 시도하게 함
 */
function ProfileCheckError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { signOut } = useAuth()
  const message = error instanceof ApiError ? error.message : '프로필을 확인하지 못했어요.'
  const code = error instanceof ApiError ? (error.status ? `${error.code} · ${error.status}` : error.code) : null
  return (
    <div className="profile-check-error" role="alertdialog" aria-labelledby="profile-check-error-title">
      <h2 id="profile-check-error-title">내 정보를 불러오지 못했어요</h2>
      <p>{message}</p>
      {code && <small>{code}</small>}
      <button type="button" className="auth-submit" onClick={onRetry}>다시 시도</button>
      <button type="button" className="profile-check-logout" onClick={() => void signOut()}>로그아웃</button>
    </div>
  )
}

/**
 * 로그인해야 들어갈 수 있는 화면들을 감쌈.
 * 비로그인이면 /login 으로 보내면서 원래 가려던 주소를 state.from 에 기억
 */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return null
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/**
 * 로그인은 했지만 서버에 프로필이 없는 사람(온보딩을 안 끝낸 사람)은 온보딩으로.
 * 홈·마이페이지 등 온보딩 이후 화면을 감쌈. 한 번 확인되면 기억해서 다시 묻지 않음.
 * 예) 가입 후 온보딩 도중 앱을 껐다가 다시 열면 → 로그인은 유지돼 있지만 프로필이 없음 → 온보딩으로
 */
export function RequireProfile() {
  const { session } = useAuth()
  const userId = session?.userId
  const [state, setState] = useState<'checking' | 'ready' | 'missing' | 'error'>(() => (isProfileConfirmed(userId) ? 'ready' : 'checking'))
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (state !== 'checking') return
    let alive = true
    getMyProfile()
      .then(() => {
        markProfileReady(userId)
        if (alive) setState('ready')
      })
      .catch((caught: unknown) => {
        if (!alive) return
        // 404 → 온보딩. 그 밖의 에러는 홈으로 넘기지 않고 이유를 보여줌
        if (caught instanceof ApiError && caught.status === 404) return setState('missing')
        setError(caught)
        setState('error')
      })
    return () => {
      alive = false
    }
  }, [state, userId])

  if (state === 'checking') return null
  if (state === 'missing') return <Navigate to="/onboarding" replace />
  if (state === 'error') return <ProfileCheckError error={error} onRetry={() => setState('checking')} />
  return <Outlet />
}

/**
 * 로그인 상태가 되는 순간 어디로 갈지 정함 (API 명세: 프로필 없으면 404 PROFILE_NOT_FOUND)
 * - 프로필 있음 → 원래 가려던 곳 또는 홈
 * - 404 → 온보딩
 * - 그 밖의 에러(서버 연결·주소·토큰 문제) → 홈으로 넘기지 않고 이유와 다시 시도 버튼 (가입 직후 온보딩을 건너뛰지 않게)
 */
function ResolveLanding() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const userId = session?.userId
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    const target = readFrom(location.state) ?? '/'
    getMyProfile()
      .then(() => {
        markProfileReady(userId)
        if (alive) navigate(target, { replace: true })
      })
      .catch((caught: unknown) => {
        if (!alive) return
        if (caught instanceof ApiError && caught.status === 404) navigate('/onboarding', { replace: true })
        else setError(caught)
      })
    return () => {
      alive = false
    }
  }, [navigate, location.state, userId, attempt])

  if (!error) return null
  return (
    <ProfileCheckError
      error={error}
      onRetry={() => {
        setError(null)
        setAttempt((count) => count + 1)
      }}
    />
  )
}

/** 로그인·회원가입 화면 전용. 이미 로그인했으면 화면은 그대로 두고 갈 곳을 정해서 이동 */
export function PublicOnly() {
  const { status } = useAuth()
  if (status === 'loading') return null
  return (
    <>
      <Outlet />
      {status === 'authenticated' && <ResolveLanding />}
    </>
  )
}
