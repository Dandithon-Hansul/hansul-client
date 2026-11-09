import type { MyProfile } from '../api/types'

/**
 * VITE_USE_MOCK=true 일 때 백엔드·Supabase 대신 쓰는 "브라우저 안 가짜 DB".
 * localStorage 에 저장해서 새로고침해도 가입한 계정·로그인 상태가 유지됩니다.
 *
 * 처음부터 들어 있는 데모 계정: hansul / hansul123 (프로필 있음 → 로그인하면 홈)
 * 새로 가입한 계정은 프로필이 없음 → 로그인하면 온보딩
 */

export type MockAccount = { userId: string; loginId: string; password: string }
export type MockSession = { userId: string; loginId: string; accessToken: string }

type MockDb = {
  accounts: MockAccount[]
  profiles: Record<string, MyProfile>
  session: MockSession | null
}

const KEY = 'hansul.mock.db'

export const DEMO_ACCOUNT = { loginId: 'hansul', password: 'hansul123' } as const

function seed(): MockDb {
  const userId = 'mock-user-demo'
  return {
    accounts: [{ userId, loginId: DEMO_ACCOUNT.loginId, password: DEMO_ACCOUNT.password }],
    profiles: {
      [userId]: {
        id: userId,
        display_name: '김한술',
        avatar_url: null,
        region: { code: '47170', sido: '경상북도', sigungu: '안동시', dong: null },
        bio: '안녕하세요 음식 좋아합니다',
        food_preferences: ['탕·찌개', '찜·조림'],
        stats: { transmitted_recipes: 2, saved_recipes: 8, likes_received: 34 },
      },
    },
    session: null,
  }
}

export function readMockDb(): MockDb {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as MockDb
  } catch {
    /* 저장소를 못 읽으면 초기값 */
  }
  return seed()
}

export function writeMockDb(db: MockDb) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* 시크릿 모드 등에서 실패해도 동작은 계속 */
  }
}

/** 개발자 도구 콘솔에서 mock 데이터를 초기화하고 싶을 때: localStorage.removeItem('hansul.mock.db') */
export function resetMockDb() {
  writeMockDb(seed())
}
