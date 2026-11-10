import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { analyzeRecipe, transcribe, uploadSignedFile } from '../../lib/api/recipes'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/recipes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/recipes')>()
  return {
    ...actual,
    uploadSignedFile: vi.fn(),
    transcribe: vi.fn(),
    analyzeRecipe: vi.fn(),
  }
})

class FakeMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  constructor(_stream: MediaStream) {}

  start() { this.state = 'recording' }
  pause() { this.state = 'paused' }
  resume() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['recorded voice'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

const analysis = {
  structured: { ingredients: [], steps: [], context: {} },
  questions: [{
    expression: '자작하게',
    question: '국물이 자작하다는 것은 어느 정도인가요?',
    options: ['재료 절반까지', '냄비 바닥에만'],
    already_known: false,
  }],
  auto_applied: [],
} as Awaited<ReturnType<typeof analyzeRecipe>>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }) },
  })
  vi.mocked(uploadSignedFile).mockReset()
  vi.mocked(transcribe).mockReset()
  vi.mocked(analyzeRecipe).mockReset()
  vi.mocked(analyzeRecipe).mockResolvedValue(analysis)
  vi.mocked(uploadSignedFile).mockResolvedValue({ bucket: 'uploads', path: 'owner/stt_audio/test.webm', token: 'signed' })
  vi.mocked(transcribe).mockResolvedValue({
    transcript: '국물을 자작하게 졸여요',
    recipe_id: 'a2332e02-bd86-4120-aa60-cc3fc01c99de',
    status: 'draft',
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
})

describe('녹음 직후 AI 분석 실패 복구', () => {
  it('분석에 실패하면 일반 채팅으로 넘기지 않고 저장한 음성을 분석 재시도한다', async () => {
    vi.mocked(analyzeRecipe)
      .mockRejectedValueOnce(new ApiError(502, 'AI_RESPONSE_INVALID', 'invalid analysis'))
      .mockResolvedValueOnce(analysis)

    loginAsDemo()
    const user = renderApp('/record')

    await user.click(await screen.findByRole('button', { name: '녹음 시작' }))
    await act(async () => { vi.advanceTimersByTime(6000) })
    await user.click(screen.getByRole('button', { name: '기록 마무리 하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('녹음은 저장됐어요')
    expect(currentPath()).toHaveTextContent('/record')
    expect(vi.mocked(transcribe)).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'AI 분석 다시 시도하기' }))
    expect(await screen.findByText('국물이 자작하다는 것은 어느 정도인가요?')).toBeInTheDocument()
    await waitFor(() => expect(currentPath()).toHaveTextContent('/chat'))
    expect(vi.mocked(analyzeRecipe)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(transcribe)).toHaveBeenCalledTimes(1)
  })
  it('채팅 마이크 전사는 최초 초안의 recipe_id를 전달하지 않는다', async () => {
    loginAsDemo()
    const user = renderApp('/record')

    await user.click(await screen.findByRole('button', { name: '녹음 시작' }))
    await act(async () => { vi.advanceTimersByTime(6000) })
    await user.click(screen.getByRole('button', { name: '기록 마무리 하기' }))
    expect(await screen.findByText('국물이 자작하다는 것은 어느 정도인가요?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '음성 입력' }))
    await user.click(screen.getByRole('button', { name: '음성 입력 마치기' }))
    await waitFor(() => expect(vi.mocked(transcribe)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(transcribe)).toHaveBeenNthCalledWith(2, {
      audio_path: 'uploads/owner/stt_audio/test.webm',
    })
    expect(vi.mocked(uploadSignedFile)).toHaveBeenNthCalledWith(2, expect.any(File), 'stt_audio')
    expect(screen.getByRole('textbox', { name: '메시지' })).toHaveValue('국물을 자작하게 졸여요')
  })

  it('녹음 중 선택한 사진도 현재 ref 값으로 업로드한다', async () => {
    loginAsDemo()
    const user = renderApp('/record')
    await user.click(await screen.findByRole('button', { name: '녹음 시작' }))
    const photo = new File(['image bytes'], 'dish.png', { type: 'image/png' })
    const input = document.querySelector('.record-photo-button input[type="file"]') as HTMLInputElement
    await user.upload(input, photo)
    expect(screen.getByText('사진이 추가됐어요')).toBeInTheDocument()

    await act(async () => { vi.advanceTimersByTime(6000) })
    await user.click(screen.getByRole('button', { name: '기록 마무리 하기' }))
    await waitFor(() => expect(vi.mocked(uploadSignedFile)).toHaveBeenCalledWith(
      photo, 'chat_image', 'a2332e02-bd86-4120-aa60-cc3fc01c99de',
    ))
    expect(await screen.findByText('국물이 자작하다는 것은 어느 정도인가요?')).toBeInTheDocument()
    expect(vi.mocked(transcribe)).toHaveBeenCalledTimes(1)
  })

  it('사진 업로드 415 실패를 오디오 형식 오류로 표시하지 않고 초안을 보존한다', async () => {
    vi.mocked(uploadSignedFile).mockResolvedValueOnce({
      bucket: 'uploads', path: 'owner/stt_audio/test.webm', token: 'signed',
    }).mockRejectedValueOnce(new ApiError(415, 'UNSUPPORTED_IMAGE', 'image content error'))

    loginAsDemo()
    const user = renderApp('/record')
    await user.click(await screen.findByRole('button', { name: '녹음 시작' }))
    const photo = new File(['image bytes'], 'dish.png', { type: 'image/png' })
    await user.upload(document.querySelector('.record-photo-button input') as HTMLInputElement, photo)
    await act(async () => { vi.advanceTimersByTime(6000) })
    await user.click(screen.getByRole('button', { name: '기록 마무리 하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('음식 사진을 올리지 못했어요')
    expect(screen.queryByText('지원하지 않는 오디오 형식이에요')).not.toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/record')
    expect(vi.mocked(transcribe)).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'AI 분석 다시 시도하기' }))
    expect(await screen.findByText('국물이 자작하다는 것은 어느 정도인가요?')).toBeInTheDocument()
    expect(vi.mocked(transcribe)).toHaveBeenCalledTimes(1)
  })
})
