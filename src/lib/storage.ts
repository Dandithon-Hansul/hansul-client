import { apiFetch } from './api/client'
import { IS_MOCK } from './env'
import { blobToDataUrl, resizeImage } from './image'
import { getSupabase } from './supabase'

/** POST /api/uploads/sign 응답 — 비공개 버킷에 한 번 올릴 수 있는 토큰 */
type SignedUpload = { bucket: string; path: string; token: string }

/**
 * 프로필 사진 업로드 → PATCH /api/profiles/me 의 avatar_url 로 보낼 값 반환
 * 백엔드 방식 (API 명세서 0-3 · BE 업데이트):
 *   1. POST /api/uploads/sign { purpose: "avatar", content_type, size_bytes } → { bucket, path, token }
 *   2. Supabase uploadToSignedUrl(path, token, file) 로 직접 업로드
 *   3. PATCH /api/profiles/me { avatar_url: path } — 이 함수는 path 를 돌려줌
 *   4. GET /api/profiles/me 의 avatar_url 은 서버가 서명 URL 로 바꿔서 줌
 * 사진은 512px JPEG 로 줄여서 올림 (avatar 제한: 5MB, jpeg/png/webp)
 */
export async function uploadAvatar(file: File): Promise<string> {
  const image = await resizeImage(file)

  // mock: 서버 대신 브라우저 저장소에 data URL 로 보관 (512px 로 줄였으니 수십 KB)
  if (IS_MOCK) return blobToDataUrl(image)

  const contentType = image.type || 'image/jpeg'
  const signed = await apiFetch<SignedUpload>('/api/uploads/sign', {
    method: 'POST',
    json: { purpose: 'avatar', content_type: contentType, size_bytes: image.size },
  })
  const { error } = await getSupabase().storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, image, { contentType })
  if (error) throw new Error('사진을 올리지 못했어요. 다시 시도해주세요.')
  return signed.path
}
