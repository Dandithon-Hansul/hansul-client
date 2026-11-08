// 환경 변수는 여기서만 읽고, 나머지 코드는 이 값을 import 해서 씁니다.
const env = import.meta.env

/** true 면 Supabase·백엔드 없이 브라우저 안의 가짜 데이터로 동작 */
export const IS_MOCK = env.VITE_USE_MOCK === 'true'

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? ''

/** 아이디를 Supabase 이메일로 바꿀 때 붙이는 가짜 도메인 (hansol → hansol@hansul.app) */
export const AUTH_EMAIL_DOMAIN = env.VITE_AUTH_EMAIL_DOMAIN || 'hansul.app'

/** 백엔드 주소. 비우면 같은 주소의 /api 로 요청 (개발 중엔 vite 프록시가 넘겨줌) */
export const API_BASE_URL = (env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

/** 테스트에서는 mock 지연 없이 바로 응답 */
export const MOCK_DELAY_MS = env.MODE === 'test' ? 0 : 300
