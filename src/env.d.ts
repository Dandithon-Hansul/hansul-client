/// <reference types="vite/client" />

// .env 에서 읽는 값들의 타입 (VITE_ 로 시작해야 브라우저 코드에서 보임)
interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_AUTH_EMAIL_DOMAIN?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
