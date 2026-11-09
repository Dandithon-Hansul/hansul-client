// 환경 변수는 여기서만 읽고, 나머지 코드는 이 값을 import 해서 씁니다.
const env = import.meta.env

/** true 면 Supabase·백엔드 없이 브라우저 안의 가짜 데이터로 동작 */
export const IS_MOCK = env.VITE_USE_MOCK === 'true'

/**
 * 배포 화면(Vercel 등)에 값을 붙여 넣을 때 따라 들어오기 쉬운 앞뒤 공백·줄바꿈·따옴표를 걷어냄.
 * ("sb_publishable_..." 처럼 따옴표째 넣으면 Supabase 가 키를 거부해 로그인이 안 됨)
 */
export function cleanEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').trim()
}

export const SUPABASE_URL = cleanEnvValue(env.VITE_SUPABASE_URL).replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = cleanEnvValue(env.VITE_SUPABASE_ANON_KEY)

/** 아이디를 Supabase 이메일로 바꿀 때 붙이는 가짜 도메인 (hansol → hansol@hansul.app) */
export const AUTH_EMAIL_DOMAIN = cleanEnvValue(env.VITE_AUTH_EMAIL_DOMAIN) || 'hansul.app'

/** 백엔드 주소. 비우면 같은 주소의 /api 로 요청 (개발 중엔 vite 프록시, 배포에선 vercel.json 이 넘겨줌) */
export const API_BASE_URL = cleanEnvValue(env.VITE_API_BASE_URL).replace(/\/$/, '')

/** 테스트에서는 mock 지연 없이 바로 응답 */
export const MOCK_DELAY_MS = env.MODE === 'test' ? 0 : 300

/** 카카오맵 JavaScript 키. 비우면 키 없이 동작하는 SVG 지도를 씀 */
export const KAKAO_MAP_KEY = env.VITE_KAKAO_MAP_KEY ?? ''
