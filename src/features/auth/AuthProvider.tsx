import { useEffect, useMemo, useState, type ReactNode } from 'react'
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

  useEffect(() => {
    let alive = true
    service
      .getSession()
      .then((current) => {
        if (alive) setSession(current)
      })
      .catch(() => {
        /* 설정 오류 등 → 비로그인으로 취급 */
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    const unsubscribe = service.onChange((next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [service])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: loading ? 'loading' : session ? 'authenticated' : 'anonymous',
      session,
      signIn: service.signIn,
      signUp: service.signUp,
      signOut: service.signOut,
    }),
    [loading, session, service],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
