// 실제 백엔드 모드의 다른 사용자 프로필 — GET /api/profiles/:id 응답을 화면용으로 정리
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { displayableImage, getUserProfile } from './profile'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('./client', async (importOriginal) => ({ ...(await importOriginal<typeof import('./client')>()), apiFetch }))
vi.mock('../env', async (importOriginal) => ({ ...(await importOriginal<typeof import('../env')>()), IS_MOCK: false }))

beforeEach(() => apiFetch.mockReset())

describe('다른 사용자 프로필 (실제 백엔드 모드)', () => {
  it('백엔드 형식(지역 글자, recipe_count 등)을 화면용으로 바꾼다', async () => {
    apiFetch.mockResolvedValue({
      profile_id: 'p-1',
      display_name: '김영희',
      avatar_url: 'p-1/avatar/x.jpg', // 서명 URL 이 아닌 저장 경로 → 기본 사진
      region: '안동시',
      bio: null,
      recipe_count: 3,
      received_like_count: 41,
      recipes: [{ recipe_id: 'r-1', title: '안동 찜닭', hero_image_url: 'https://cdn/x.jpg' }],
    })
    const profile = await getUserProfile('p-1')
    expect(apiFetch).toHaveBeenCalledWith('/api/profiles/p-1')
    expect(profile).toMatchObject({
      id: 'p-1',
      display_name: '김영희',
      avatar_url: null,
      region: { code: '47170', sido: '경상북도', sigungu: '안동시' },
      stats: { transmitted_recipes: 3, likes_received: 41 },
      recipes: [{ recipe_id: 'r-1', title: '안동 찜닭', hero_image_url: 'https://cdn/x.jpg' }],
    })
  })

  it('지역 글자를 목록에서 못 찾으면 글자 그대로 보여줄 수 있게 남긴다', async () => {
    apiFetch.mockResolvedValue({ profile_id: 'p-2', display_name: '박순자', avatar_url: null, region: '중구', bio: null, recipe_count: 0, received_like_count: 0, recipes: [] })
    const profile = await getUserProfile('p-2')
    expect(profile.region).toBeNull()
    expect(profile.region_text).toBe('중구')
  })
})

describe('이미지 주소 거르기', () => {
  it('화면에 바로 쓸 수 있는 주소만 통과시킨다', () => {
    expect(displayableImage('https://x/y.jpg')).toBe('https://x/y.jpg')
    expect(displayableImage('/images/a.png')).toBe('/images/a.png')
    expect(displayableImage('data:image/jpeg;base64,AA')).toBe('data:image/jpeg;base64,AA')
    expect(displayableImage('user/avatar/a.jpg')).toBeNull()
    expect(displayableImage(null)).toBeNull()
  })
})
