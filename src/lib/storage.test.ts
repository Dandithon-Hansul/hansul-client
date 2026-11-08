// 실제 백엔드 모드의 프로필 사진 업로드 — sign → uploadToSignedUrl → path 반환
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api/client'
import { uploadAvatar } from './storage'

const { apiFetch, from, uploadToSignedUrl } = vi.hoisted(() => {
  const uploadToSignedUrl = vi.fn()
  return { apiFetch: vi.fn(), uploadToSignedUrl, from: vi.fn(() => ({ uploadToSignedUrl })) }
})
vi.mock('./api/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('./api/client')>()), apiFetch }))
vi.mock('./env', async (importOriginal) => ({ ...(await importOriginal<typeof import('./env')>()), IS_MOCK: false }))
vi.mock('./supabase', () => ({ getSupabase: () => ({ storage: { from } }) }))
// jsdom 에는 canvas 가 없어서 줄이는 단계는 512px JPEG 결과를 흉내냄
const resized = new Blob(['jpeg-bytes'], { type: 'image/jpeg' })
vi.mock('./image', async (importOriginal) => ({ ...(await importOriginal<typeof import('./image')>()), resizeImage: vi.fn(async () => resized) }))

const photo = new File(['original'], 'me.png', { type: 'image/png' })

beforeEach(() => {
  apiFetch.mockReset()
  from.mockClear()
  uploadToSignedUrl.mockReset()
})

describe('프로필 사진 업로드 (실제 백엔드 모드)', () => {
  it('업로드 허가를 받고, 받은 경로·토큰으로 올린 뒤 경로를 돌려준다', async () => {
    apiFetch.mockResolvedValue({ bucket: 'uploads', path: 'user-1/avatar/abc.jpg', token: 'tok' })
    uploadToSignedUrl.mockResolvedValue({ data: { path: 'user-1/avatar/abc.jpg' }, error: null })

    await expect(uploadAvatar(photo)).resolves.toBe('user-1/avatar/abc.jpg')
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/uploads/sign', {
      method: 'POST',
      json: { purpose: 'avatar', content_type: 'image/jpeg', size_bytes: resized.size },
    })
    expect(from).toHaveBeenCalledWith('uploads')
    expect(uploadToSignedUrl).toHaveBeenCalledWith('user-1/avatar/abc.jpg', 'tok', resized, { contentType: 'image/jpeg' })
  })

  it('허가 단계에서 거절되면(예: 5MB 초과 413) 서버 에러를 그대로 알린다', async () => {
    apiFetch.mockRejectedValue(new ApiError(413, 'FILE_TOO_LARGE', '파일 크기가 너무 큽니다.'))
    await expect(uploadAvatar(photo)).rejects.toMatchObject({ status: 413 })
    expect(uploadToSignedUrl).not.toHaveBeenCalled()
  })

  it('업로드가 실패하면 다시 시도하라는 안내를 낸다', async () => {
    apiFetch.mockResolvedValue({ bucket: 'uploads', path: 'user-1/avatar/abc.jpg', token: 'tok' })
    uploadToSignedUrl.mockResolvedValue({ data: null, error: new Error('boom') })
    await expect(uploadAvatar(photo)).rejects.toThrow('사진을 올리지 못했어요. 다시 시도해주세요.')
  })
})
