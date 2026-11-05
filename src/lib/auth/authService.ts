import type { Session } from '@supabase/supabase-js'
import { IS_MOCK, MOCK_DELAY_MS } from '../env'
import { readMockDb, writeMockDb } from '../mock/mockDb'
import { getSupabase } from '../supabase'
import { normalizeLoginId, toAuthEmail, toKoreanAuthMessage } from './validation'

export type AuthSession = { userId: string; loginId: string }
export type AuthResult = { ok: true; needsEmailConfirm?: boolean } | { ok: false; message: string }

/** 실제(Supabase)·mock 이 똑같이 갖추는 기능. 화면은 이 모양만 알면 됨 */
export type AuthService = {
  getSession(): Promise<AuthSession | null>
  /** 로그인·로그아웃될 때마다 호출. 반환값을 부르면 구독 해제 */
  onChange(listener: (session: AuthSession | null) => void): () => void
  signIn(loginId: string, password: string): Promise<AuthResult>
  signUp(loginId: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
}

// ───────────── 실제: Supabase Auth ─────────────

function fromSupabase(session: Session | null): AuthSession | null {
  if (!session) return null
  const user = session.user
  const loginId = (user.user_metadata?.login_id as string | undefined) ?? user.email?.split('@')[0] ?? ''
  return { userId: user.id, loginId }
}

const supabaseAuth: AuthService = {
  async getSession() {
    const { data } = await getSupabase().auth.getSession()
    return fromSupabase(data.session)
  },
  onChange(listener) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => listener(fromSupabase(session)))
    return () => data.subscription.unsubscribe()
  },
  async signIn(loginId, password) {
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: toAuthEmail(loginId), password })
      return error ? { ok: false, message: toKoreanAuthMessage(error) } : { ok: true }
    } catch {
      return { ok: false, message: '서버에 연결하지 못했어요.' }
    }
  },
  async signUp(loginId, password) {
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: toAuthEmail(loginId),
        password,
        options: { data: { login_id: normalizeLoginId(loginId) } }, // 원래 아이디를 user_metadata 에 보관
      })
      if (error) return { ok: false, message: toKoreanAuthMessage(error) }
      // 이미 있는 이메일이면 에러 대신 identities 가 빈 user 를 돌려줄 때가 있음
      if (data.user && data.user.identities?.length === 0) return { ok: false, message: '이미 사용 중인 아이디예요.' }
      // Supabase 에서 "Confirm email" 이 켜져 있으면 세션이 안 생김
      return { ok: true, needsEmailConfirm: !data.session }
    } catch {
      return { ok: false, message: '서버에 연결하지 못했어요.' }
    }
  },
  async signOut() {
    await getSupabase().auth.signOut()
  },
}

// ───────────── mock: 브라우저 안 가짜 DB ─────────────

const listeners = new Set<(session: AuthSession | null) => void>()
const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

function currentMockSession(): AuthSession | null {
  const session = readMockDb().session
  return session ? { userId: session.userId, loginId: session.loginId } : null
}

function emit() {
  const session = currentMockSession()
  listeners.forEach((listener) => listener(session))
}

const mockAuth: AuthService = {
  async getSession() {
    return currentMockSession()
  },
  onChange(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  async signIn(loginId, password) {
    await wait()
    const db = readMockDb()
    const account = db.accounts.find((item) => item.loginId === normalizeLoginId(loginId) && item.password === password)
    if (!account) return { ok: false, message: '아이디 또는 비밀번호가 올바르지 않아요.' }
    db.session = { userId: account.userId, loginId: account.loginId, accessToken: `mock-token-${account.userId}` }
    writeMockDb(db)
    emit()
    return { ok: true }
  },
  async signUp(loginId, password) {
    await wait()
    const db = readMockDb()
    const id = normalizeLoginId(loginId)
    if (db.accounts.some((item) => item.loginId === id)) return { ok: false, message: '이미 사용 중인 아이디예요.' }
    const userId = `mock-user-${id}`
    db.accounts.push({ userId, loginId: id, password })
    db.session = { userId, loginId: id, accessToken: `mock-token-${userId}` } // 가입하면 바로 로그인
    writeMockDb(db)
    emit()
    return { ok: true }
  },
  async signOut() {
    const db = readMockDb()
    db.session = null
    writeMockDb(db)
    emit()
  },
}

export const authService: AuthService = IS_MOCK ? mockAuth : supabaseAuth
