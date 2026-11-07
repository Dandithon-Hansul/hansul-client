import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../lib/api/client'
import { getMyProfile } from '../../lib/api/profile'
import type { MyProfile } from '../../lib/api/types'
import { useAuth } from '../auth/auth-context'

/**
 * 내 프로필 불러오기 + 공통 에러 처리
 * - 404 PROFILE_NOT_FOUND (온보딩 전) → 온보딩으로
 * - 401 (토큰 만료) → 로그아웃 → 가드가 로그인 화면으로
 */
export function useMyProfile() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    getMyProfile()
      .then((loaded) => {
        if (alive) setProfile(loaded)
      })
      .catch(async (caught: unknown) => {
        if (!alive) return
        if (caught instanceof ApiError && caught.status === 404) navigate('/onboarding', { replace: true })
        else if (caught instanceof ApiError && caught.status === 401) await signOut()
        else setError(caught)
      })
    return () => {
      alive = false
    }
  }, [navigate, signOut, attempt])

  const reload = useCallback(() => {
    setError(null)
    setAttempt((count) => count + 1)
  }, [])

  return { profile, error, loading: !profile && !error, reload }
}

/** 화면에 띄울 에러 문구 */
export function errorText(error: unknown) {
  if (error instanceof ApiError && error.status !== 0) return error.message
  return '정보를 불러오지 못했어요. 네트워크 상태를 확인해주세요.'
}
