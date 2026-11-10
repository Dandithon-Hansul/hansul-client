import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService, type AuthService, type AuthSession } from '../../lib/auth/authService'
import { AuthContext, type AuthContextValue } from './auth-context'

/**
 * 앱 전체에 로그인 상태를 나눠주는 Provider (main.tsx 에서 App 을 감쌈)
 * - 처음 열 때 저장된 세션을 읽어 옴 (status: loading → authenticated / anonymous)
 * - 로그인·로그아웃이 일어나면 onChange 로 알림을 받아 상태 갱신 → 가드가 알아서 화면 이동
 */
function AuthProvider({ children, service = authService }: { children: ReactNode; service?: AuthService }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedOutByUser, setSignedOutByUser] = useState(false)

  useEffect(() => {
    let alive = true
    service
      .getSession()
      .then((current) => {
        if (alive) setSession(current)
      })
      .catch((error: unknown) => {
        // .env 설정 오류 등 → 비로그인으로 취급하고 콘솔에 원인 표시
        console.error('[auth] 세션을 읽지 못했어요:', error)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    const unsubscribe = service.onChange((next) => {
      setSession(next)
      setLoading(false)
      if (next) setSignedOutByUser(false) // 다시 로그인하면 표시 지움
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [service])

  // 직접 로그아웃 표시를 먼저 남기고 로그아웃 — 로그아웃 알림이 오는 순간 가드(RequireAuth)가 이 표시를 보고
  // '돌아갈 곳'을 기억하지 않음 (실제 Supabase 에선 화면 쪽 navigate 보다 알림이 먼저 와서 편집 화면이 기억됐음)
  const signOut = useCallback(async () => {
    setSignedOutByUser(true)
    try {
      await service.signOut()
    } catch (error) {
      setSignedOutByUser(false) // 로그아웃 실패면 표시를 남기지 않음
      throw error
    }
  }, [service])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: loading ? 'loading' : session ? 'authenticated' : 'anonymous',
      session,
      signIn: service.signIn,
      signUp: service.signUp,
      signOut,
      signedOutByUser,
    }),
    [loading, session, service, signOut, signedOutByUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
