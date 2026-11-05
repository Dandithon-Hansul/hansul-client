import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../lib/api/client'
import { getMyProfile } from '../../lib/api/profile'
import { useAuth } from './auth-context'

type FromState = { from?: string } | null

/** 로그인 후 돌아갈 주소 (외부 주소·로그인 화면 자체는 제외) */
function readFrom(state: unknown): string | null {
  const from = (state as FromState)?.from
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/login') || from.startsWith('/signup')) return null
  return from
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
 * 로그인 상태가 되는 순간 어디로 갈지 정함 (API 명세: 프로필 없으면 404 PROFILE_NOT_FOUND)
 * - 프로필 있음 → 원래 가려던 곳 또는 홈
 * - 404 → 온보딩
 * - 백엔드 미연결 등 그 밖의 에러 → 로그인은 막지 않고 홈
 */
function ResolveLanding() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let alive = true
    const target = readFrom(location.state) ?? '/'
    getMyProfile()
      .then(() => {
        if (alive) navigate(target, { replace: true })
      })
      .catch((error: unknown) => {
        if (!alive) return
        if (error instanceof ApiError && error.status === 404) navigate('/onboarding', { replace: true })
        else navigate(target, { replace: true })
      })
    return () => {
      alive = false
    }
  }, [navigate, location.state])

  return null
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
