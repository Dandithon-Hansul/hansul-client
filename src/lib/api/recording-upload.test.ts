import { beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadSignedFile } from './recipes'

const { apiFetch, uploadToSignedUrl } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}))

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiFetch,
}))
vi.mock('../env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../env')>()),
  IS_MOCK: false,
}))
vi.mock('../supabase', () => ({
  getSupabase: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }),
}))

beforeEach(() => {
  apiFetch.mockReset()
  uploadToSignedUrl.mockReset()
  apiFetch.mockResolvedValue({
    bucket: 'uploads',
    path: 'user/stt_audio/file.webm',
    token: 'test-signed-token',
  })
  uploadToSignedUrl.mockResolvedValue({ data: {}, error: null })
})

describe('운영 STT 업로드 415 방지', () => {
  it('MediaRecorder 코덱 파라미터를 제외한 Content-Type으로 업로드 서명을 요청한다', async () => {
    const file = new File([new Blob(['sound'])], 'recording.webm', { type: 'audio/webm;codecs=opus' })
    await uploadSignedFile(file, 'stt_audio')

    expect(apiFetch).toHaveBeenCalledWith('/api/uploads/sign', {
      method: 'POST',
      json: {
        purpose: 'stt_audio',
        content_type: 'audio/webm',
        size_bytes: file.size,
      },
    })
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      'user/stt_audio/file.webm',
      'test-signed-token',
      file,
      { contentType: 'audio/webm' },
    )
  })
})
