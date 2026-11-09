import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeRecipe, createRecipe, generateStepImages, getRecipe, getRecipes, sttAudioPath, vectorizeSensoryProfile } from './recipes'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('./client', async (importOriginal) => ({ ...(await importOriginal<typeof import('./client')>()), apiFetch }))
vi.mock('../env', async (importOriginal) => ({ ...(await importOriginal<typeof import('../env')>()), IS_MOCK: false }))

beforeEach(() => apiFetch.mockReset())

describe('레시피 발행 API 계약', () => {
  it('확정한 한마디를 공백을 제거해 transmitter_quote로 보낸다', async () => {
    apiFetch.mockResolvedValue({ recipe_id: 'r-1', status: 'published', transmitter_quote: '간은 조금씩', voice_message_url: null })
    const result = await createRecipe('r-1', '  간은 조금씩  ')
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/recipes', {
      method: 'POST',
      json: { recipe_id: 'r-1', transmitter_quote: '간은 조금씩' },
    })
    expect(result.transmitter_quote).toBe('간은 조금씩')
    expect(result.voice_message_url).toBeNull()
  })

  it('한마디를 건너뛰거나 빈 문장을 입력하면 필드를 생략한다', async () => {
    apiFetch.mockResolvedValue({ recipe_id: 'r-1', status: 'published', transmitter_quote: null, voice_message_url: null })
    await createRecipe('r-1')
    await createRecipe('r-1', '   ')
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/recipes', { method: 'POST', json: { recipe_id: 'r-1' } })
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/recipes', { method: 'POST', json: { recipe_id: 'r-1' } })
  })

  it('상세 응답에 한마디가 없어도 null을 유지한다', async () => {
    apiFetch.mockResolvedValue({ recipe_id: 'r-1', transmitter_id: 'u-1', transmitter_quote: null, voice_message_url: null })
    const recipe = await getRecipe('r-1')
    expect(recipe.transmitter_quote).toBeNull()
    expect(recipe.transmitter_id).toBe('u-1')
  })
})

describe('인기 목록과 조리 이미지 API 계약', () => {
  it('TOP 6에 인기순과 limit 6을 전송한다', async () => {
    apiFetch.mockResolvedValue({ recipes: [], next_cursor: null })
    await getRecipes('', 6, undefined, 'popular')
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/recipes?cursor=&limit=6&sort=popular')
  })

  it('단계 이미지 일괄 생성은 레시피 ID를 보내고 실패 단계 목록을 보존한다', async () => {
    apiFetch.mockResolvedValue({ generated: [{ order: 4, image_url: 'https://images.test/step4.png', prompt_used: '완성 음식' }], failed_orders: [2] })
    const response = await generateStepImages('r-1')
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/steps/images', { method: 'POST', json: { recipe_id: 'r-1' } })
    expect(response.generated[0].order).toBe(4)
    expect(response.failed_orders).toEqual([2])
  })
})

describe('손맛 분석 및 벡터화 API 계약', () => {
  it('분석 질문과 자동 적용 감각어는 서버 응답을 그대로 전달한다', async () => {
    apiFetch.mockResolvedValue({
      structured: { ingredients: [], steps: [], context: {} },
      questions: [{ expression: '적당히', question: '얼마나?', options: ['한 숟갈'], already_known: false }],
      auto_applied: [{ expression: '조금', applied_value: 1 }],
    })
    const result = await analyzeRecipe('r-1')
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/analyze', { method: 'POST', json: { recipe_id: 'r-1' } })
    expect(result.questions).toHaveLength(1)
    expect(result.auto_applied).toHaveLength(1)
  })

  it('벡터화는 명세대로 빈 JSON 본문을 전송한다', async () => {
    apiFetch.mockResolvedValue({ vector_updated: true })
    await vectorizeSensoryProfile()
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/sensory/vectorize', { method: 'POST', json: {} })
  })
})

describe('녹음 STT 업로드 경로 계약', () => {
  it('서명 업로드 경로에 bucket 이름을 붙여 STT로 전달한다', () => {
    const signed = { bucket: 'uploads', path: 'owner-id/stt_audio/file.webm', token: 'unused' }
    expect(sttAudioPath(signed)).toBe('uploads/owner-id/stt_audio/file.webm')
  })
})
