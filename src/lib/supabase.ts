import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

let client: SupabaseClient | null = null

/**
 * Supabase 클라이언트 (실제 모드에서만 사용).
 * 세션은 supabase-js 가 localStorage 에 저장하고 토큰도 자동으로 갱신합니다.
 */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없어요. .env.local 을 채우거나 VITE_USE_MOCK=true 로 실행하세요.',
    )
  }
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}
