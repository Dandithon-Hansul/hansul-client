import { IS_MOCK } from '../env'
import { readMockDb } from '../mock/mockDb'
import { getSupabase } from '../supabase'

/** API 요청에 붙일 access token. 로그인 안 했으면 null */
export async function getAccessToken(): Promise<string | null> {
  if (IS_MOCK) return readMockDb().session?.accessToken ?? null
  const { data } = await getSupabase().auth.getSession()
  return data.session?.access_token ?? null
}
