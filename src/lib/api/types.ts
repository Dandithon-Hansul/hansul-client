// API 명세서 v0.1 기준 타입 (필요한 것부터 추가)

export type Role = 'transmitter' | 'learner'

export type Region = {
  code: string
  sido: string
  sigungu: string
  dong?: string | null
}

/** GET /api/profiles/me */
export type MyProfile = {
  id: string
  role: Role
  display_name: string
  avatar_url: string | null
  region: Region | null
  food_preferences: string[]
  stats: {
    transmitted_recipes: number
    saved_recipes: number
    likes_received: number
  }
}

/** 공통 에러 응답 { code, message, details } */
export type ApiErrorBody = {
  code: string
  message: string
  details?: Record<string, unknown>
}

/** PATCH /api/profiles/me — 바뀐 필드만 보냄 */
export type ProfileUpdateBody = {
  display_name?: string
  region_code?: string
  food_preferences?: string[]
  avatar_url?: string | null
}

/** 프로필 그리드 한 칸에 필요한 최소 정보 */
export type RecipeThumb = {
  recipe_id: string
  title: string
  hero_image_url: string | null
}

/** GET /api/profiles/me/recipes 항목 */
export type MyRecipeItem = RecipeThumb & {
  like_count: number
  save_count: number
  created_at: string
}

/** GET /api/profiles/me/saved 항목 */
export type SavedRecipeItem = RecipeThumb & {
  transmitter_name: string
  saved_at: string
}

/** cursor 페이지네이션 결과 (응답의 recipes/items 차이는 profile.ts 에서 맞춤) */
export type CursorPage<T> = {
  items: T[]
  nextCursor: string | null
}

/**
 * 다른 사용자(전승자) 프로필
 * ⚠️ API 명세서에 아직 없음 — GET /api/profiles/:id 로 가정. bio(소개글)도 DB 컬럼 추가 필요
 */
export type PublicProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  region: Region | null
  bio: string | null
  stats: {
    transmitted_recipes: number
    likes_received: number
  }
}
