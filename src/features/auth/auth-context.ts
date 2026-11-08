import { createContext, useContext } from 'react'
import type { AuthResult, AuthSession } from '../../lib/auth/authService'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  session: AuthSession | null
  signIn: (loginId: string, password: string) => Promise<AuthResult>
  signUp: (loginId: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** 어느 화면에서든 로그인 상태·로그인 함수를 꺼내 쓰는 훅 */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 는 <AuthProvider> 안에서만 쓸 수 있어요.')
  return value
}
