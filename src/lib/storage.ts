import { authService } from './auth/authService'
import { IS_MOCK } from './env'
import { blobToDataUrl, resizeImage } from './image'
import { getSupabase } from './supabase'

export const AVATAR_BUCKET = 'avatars'

/**
 * 프로필 사진 업로드 → 사진 주소(URL) 반환
 * PATCH /api/profiles/me 는 avatar_url(문자열)만 받기 때문에,
 * 파일은 프론트가 Supabase Storage 에 직접 올리고 받은 주소를 PATCH 로 보냄.
 * 경로: avatars/{user_id}/{시간}.jpg  ⚠️ 백엔드에 avatars 버킷·정책 생성 요청 필요
 */
export async function uploadAvatar(file: File): Promise<string> {
  const image = await resizeImage(file)

  // mock: 서버 대신 브라우저 저장소에 data URL 로 보관 (512px 로 줄였으니 수십 KB)
  if (IS_MOCK) return blobToDataUrl(image)

  const session = await authService.getSession()
  if (!session) throw new Error('로그인이 필요해요.')

  const path = `${session.userId}/${Date.now()}.jpg`
  const storage = getSupabase().storage.from(AVATAR_BUCKET)
  const { error } = await storage.upload(path, image, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
  if (error) throw new Error('사진을 올리지 못했어요. 다시 시도해주세요.')
  return storage.getPublicUrl(path).data.publicUrl
}
