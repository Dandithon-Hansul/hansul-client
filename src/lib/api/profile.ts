import { IS_MOCK, MOCK_DELAY_MS } from '../env'
import { readMockDb } from '../mock/mockDb'
import { ApiError, apiFetch } from './client'
import type { MyProfile } from './types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * GET /api/profiles/me
 * 프로필이 없으면(온보딩 전) 404 PROFILE_NOT_FOUND → 화면에서 온보딩으로 보냄
 */
export async function getMyProfile(): Promise<MyProfile> {
  if (IS_MOCK) {
    await wait(MOCK_DELAY_MS)
    const db = readMockDb()
    if (!db.session) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요해요.')
    const profile = db.profiles[db.session.userId]
    if (!profile) throw new ApiError(404, 'PROFILE_NOT_FOUND', '프로필이 없어요.')
    return profile
  }
  return apiFetch<MyProfile>('/api/profiles/me')
}
