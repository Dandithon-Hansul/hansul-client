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
