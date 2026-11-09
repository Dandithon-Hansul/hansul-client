// 프로필 관련 API — 화면은 fetch 대신 여기 함수만 부름 (mock 전환·응답 모양 보정을 한 곳에서)
import { IS_MOCK, MOCK_DELAY_MS } from '../env'
import { readMockDb, writeMockDb } from '../mock/mockDb'
import { DEMO_MY_RECIPES, DEMO_SAVED, MOCK_PUBLIC_PROFILES } from '../mock/mockRecipes'
import { findRegionByCode, findRegionByText } from '../regions'
import { ApiError, apiFetch } from './client'
import type { CursorPage, MyProfile, MyRecipeItem, ProfileSetupBody, ProfileSetupResponse, ProfileUpdateBody, PublicProfile, RawPublicProfile, Region, SavedRecipeItem } from './types'

export const PAGE_SIZE = 18 // 3열 × 6줄

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** API 명세서는 region 을 객체로, ERD 는 TEXT 로 정의 → 둘 다 받아들임 */
export function normalizeRegion(raw: unknown): Region | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    const hit = findRegionByCode(raw) ?? findRegionByText(raw)
    return hit ? { ...hit, dong: null } : null
  }
  const region = raw as Partial<Region>
  if (region.sido && region.sigungu) return { code: region.code ?? '', sido: region.sido, sigungu: region.sigungu, dong: region.dong ?? null }
  const hit = findRegionByCode(region.code)
  return hit ? { ...hit, dong: region.dong ?? null } : null
}

/** 목록 응답: 명세서 본문은 { recipes }, 공통 규약은 { items } → 둘 다 허용 */
type RawPage<T> = { recipes?: T[]; items?: T[]; next_cursor?: string | null }
const toPage = <T,>(raw: RawPage<T>): CursorPage<T> => ({ items: raw.recipes ?? raw.items ?? [], nextCursor: raw.next_cursor ?? null })

function pageQuery(cursor: string | null) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
  if (cursor) params.set('cursor', cursor)
  return `?${params}`
}

function paginate<T>(items: T[], cursor: string | null): CursorPage<T> {
  const start = cursor ? Number(cursor) : 0
  const end = start + PAGE_SIZE
  return { items: items.slice(start, end), nextCursor: end < items.length ? String(end) : null }
}

/** mock: 로그인한 사용자 id (없으면 401) */
function mockUserId() {
  const session = readMockDb().session
  if (!session) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요해요.')
  return session.userId
}
const isDemo = (userId: string) => userId === 'mock-user-demo'

// ───────────── 내 프로필 ─────────────

/** GET /api/profiles/me — 프로필이 없으면(온보딩 전) 404 PROFILE_NOT_FOUND */
export async function getMyProfile(): Promise<MyProfile> {
  let raw: MyProfile
  if (IS_MOCK) {
    await wait(MOCK_DELAY_MS)
    const profile = readMockDb().profiles[mockUserId()]
    if (!profile) throw new ApiError(404, 'PROFILE_NOT_FOUND', '프로필이 없어요.')
    raw = profile
  } else {
    raw = await apiFetch<MyProfile>('/api/profiles/me')
  }
  return {
    ...raw,
    avatar_url: raw.avatar_url ?? null,
    region: normalizeRegion(raw.region),
    bio: raw.bio ?? null,
    food_preferences: raw.food_preferences ?? [],
    stats: {
      transmitted_recipes: raw.stats?.transmitted_recipes ?? 0,
      saved_recipes: raw.stats?.saved_recipes ?? 0,
      likes_received: raw.stats?.likes_received ?? 0,
    },
  }
}

/**
 * POST /api/profiles/setup — 온보딩 결과를 서버에 저장 (이게 있어야 GET /api/profiles/me 가 404 가 아님)
 * 응답의 start_route 는 쓰지 않고 화면에서 홈으로 보냄 (기능 명세서·Figma 기준)
 */
export async function setupProfile(body: ProfileSetupBody): Promise<ProfileSetupResponse> {
  if (!IS_MOCK) return apiFetch<ProfileSetupResponse>('/api/profiles/setup', { method: 'POST', json: body })

  await wait(MOCK_DELAY_MS)
  const db = readMockDb()
  const userId = mockUserId()
  const region = findRegionByCode(body.region_code)
  if (!region) throw new ApiError(422, 'INVALID_REGION', '지역 코드가 올바르지 않아요.')
  const previous = db.profiles[userId]
  db.profiles[userId] = {
    id: userId,
    display_name: body.display_name,
    avatar_url: previous?.avatar_url ?? null,
    region: { ...region, dong: null },
    bio: previous?.bio ?? null,
    food_preferences: body.food_preferences,
    stats: previous?.stats ?? { transmitted_recipes: 0, saved_recipes: 0, likes_received: 0 },
  }
  writeMockDb(db)
  return { profile_id: userId, start_route: '/' }
}

/** PATCH /api/profiles/me — 프로필 편집 */
export async function updateMyProfile(body: ProfileUpdateBody): Promise<void> {
  if (!IS_MOCK) {
    await apiFetch('/api/profiles/me', { method: 'PATCH', json: body })
    return
  }
  await wait(MOCK_DELAY_MS)
  const db = readMockDb()
  const profile = db.profiles[mockUserId()]
  if (!profile) throw new ApiError(404, 'PROFILE_NOT_FOUND', '프로필이 없어요.')
  if (body.display_name !== undefined) profile.display_name = body.display_name
  if (body.avatar_url !== undefined) profile.avatar_url = body.avatar_url
  if (body.bio !== undefined) profile.bio = body.bio
  if (body.food_preferences !== undefined) profile.food_preferences = body.food_preferences
  if (body.region_code !== undefined) {
    const region = findRegionByCode(body.region_code)
    if (!region) throw new ApiError(422, 'INVALID_REGION', '지역 코드가 올바르지 않아요.')
    profile.region = { ...region, dong: null }
  }
  writeMockDb(db)
}

/** GET /api/profiles/me/recipes — 나의 레시피 탭 */
export async function getMyRecipes(cursor: string | null): Promise<CursorPage<MyRecipeItem>> {
  if (!IS_MOCK) return toPage(await apiFetch<RawPage<MyRecipeItem>>(`/api/profiles/me/recipes${pageQuery(cursor)}`))
  await wait(MOCK_DELAY_MS)
  return paginate(isDemo(mockUserId()) ? DEMO_MY_RECIPES : [], cursor)
}

/** GET /api/profiles/me/saved — 저장한 맛 탭 */
export async function getMySaved(cursor: string | null): Promise<CursorPage<SavedRecipeItem>> {
  if (!IS_MOCK) return toPage(await apiFetch<RawPage<SavedRecipeItem>>(`/api/profiles/me/saved${pageQuery(cursor)}`))
  await wait(MOCK_DELAY_MS)
  return paginate(isDemo(mockUserId()) ? DEMO_SAVED : [], cursor)
}

// ───────────── 다른 사용자 (전승자) ─────────────

/** 화면에 바로 쓸 수 있는 이미지 주소만 통과 (백엔드가 저장 경로를 그대로 주면 기본 사진으로) */
export function displayableImage(url: string | null | undefined): string | null {
  if (!url) return null
  return /^(https?:|data:|blob:|\/)/.test(url) ? url : null
}

/**
 * GET /api/profiles/:id — 프로필·숫자·전승한 레시피를 한 번에 받음 (백엔드 develop 기준, 명세서 목록엔 아직 없음)
 * 저장한 레시피 수·목록은 내 프로필에서만 제공 (명세서: 저장 목록은 본인만)
 */
export async function getUserProfile(id: string): Promise<PublicProfile> {
  let raw: RawPublicProfile
  if (IS_MOCK) {
    await wait(MOCK_DELAY_MS)
    const hit = MOCK_PUBLIC_PROFILES[id]
    if (!hit) throw new ApiError(404, 'PROFILE_NOT_FOUND', '전승자를 찾을 수 없습니다.')
    raw = hit
  } else {
    raw = await apiFetch<RawPublicProfile>(`/api/profiles/${encodeURIComponent(id)}`)
  }
  return {
    id: raw.profile_id ?? id,
    display_name: raw.display_name,
    avatar_url: displayableImage(raw.avatar_url),
    region: normalizeRegion(raw.region),
    region_text: raw.region ?? null,
    bio: raw.bio ?? null,
    stats: { transmitted_recipes: raw.recipe_count ?? 0, likes_received: raw.received_like_count ?? 0 },
    recipes: raw.recipes ?? [],
  }
}
