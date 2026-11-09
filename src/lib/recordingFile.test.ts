import { describe, expect, it } from 'vitest'
import { createRecordingFile } from './recordingFile'

describe('브라우저 녹음 업로드 형식', () => {
  it('WebM 코덱 지정 MIME을 백엔드 허용 audio/webm으로 정규화한다', () => {
    const file = createRecordingFile([new Blob(['voice'], { type: 'audio/webm;codecs=opus' })], 'audio/webm;codecs=opus', 'recording')
    expect(file.type).toBe('audio/webm')
    expect(file.name).toBe('recording.webm')
    expect(file.size).toBe(5)
  })
  it('Safari MP4 녹음은 실제 mp4 확장자와 MIME을 유지한다', () => {
    const file = createRecordingFile([new Blob(['m4a'], { type: 'audio/mp4' })], 'audio/mp4;codecs=mp4a.40.2', 'chat-recording')
    expect(file.name).toBe('chat-recording.mp4')
    expect(file.type).toBe('audio/mp4')
  })
  it('MediaRecorder MIME이 비어 있어도 청크 타입을 사용한다', () => {
    const file = createRecordingFile([new Blob(['voice'], { type: 'audio/mp4' })], '', 'recording')
    expect(file.type).toBe('audio/mp4')
  })
  it('알 수 없는 녹음 컨테이너를 WebM으로 거짓 표기하지 않는다', () => {
    expect(() => createRecordingFile([new Blob(['x'])], 'audio/ogg', 'recording')).toThrow(/Unsupported audio container/)
  })
})
