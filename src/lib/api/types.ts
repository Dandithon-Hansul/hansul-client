// API 명세서 v0.1 기준 타입 (필요한 것부터 추가)

export type Region = {
  code: string
  sido: string
  sigungu: string
  dong?: string | null
}

/** GET /api/profiles/me */
export type MyProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  region: Region | null
  /** 소개 한 줄 (⚠️ 백엔드 GET /api/profiles/me 응답에 아직 없음 → 없으면 null) */
  bio: string | null
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
  /** 소개 — 비우면 null (⚠️ 백엔드 PATCH 스키마에 bio 추가 요청 중) */
  bio?: string | null
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

/** GET /api/profiles/:id 응답 그대로 (백엔드 hansul-server develop 기준 — 명세서 목록엔 아직 없음) */
export type RawPublicProfile = {
  profile_id: string
  display_name: string
  avatar_url: string | null
  /** 지역 이름 글자 ("안동시") */
  region: string | null
  bio: string | null
  recipe_count: number
  received_like_count: number
  recipes: RecipeThumb[]
  /** 저장한 맛 — 백엔드 ADR-006 (저장 목록 기본 공개, 게시·공개 레시피만, 저장 시각 역순) */
  saved_recipe_count?: number
  saved_recipes?: Array<RecipeThumb & { transmitter_name?: string | null }>
}

/** 다른 사용자(전승자) 프로필 — 화면에서 쓰기 좋게 정리한 형태 */
export type PublicProfile = {
  id: string
  display_name: string
  avatar_url: string | null
  region: Region | null
  /** 지역 코드로 못 찾았을 때 그대로 보여줄 글자 */
  region_text: string | null
  bio: string | null
  stats: {
    transmitted_recipes: number
    saved_recipes: number
    likes_received: number
  }
  recipes: RecipeThumb[]
  saved_recipes: RecipeThumb[]
}

/**
 * POST /api/profiles/setup — 온보딩 마지막 "한술 시작하기" (명세서: 역할 선택 없음)
 * region_code: 필수 — 지역이 없으면 발행한 레시피가 지도에 안 나와서 온보딩에서 건너뛰기를 막음 (백엔드와 합의)
 */
export type ProfileSetupBody = {
  display_name: string
  region_code: string
  food_preferences: string[]
}

export type ProfileSetupResponse = {
  profile_id: string
  start_route: string
}
