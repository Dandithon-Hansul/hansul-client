import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyTopRecipes } from './home'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiFetch,
}))
vi.mock('../env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../env')>()),
  IS_MOCK: false,
}))

beforeEach(() => apiFetch.mockReset())

describe('이달의 TOP 6 API 계약', () => {
  it('누적 sort=popular 대신 홈의 월간 top_recipes를 사용하고 서버 순위대로 유지한다', async () => {
    apiFetch.mockResolvedValue({
      greeting_name: null,
      top_recipes: [
        { recipe_id: 'monthly-first', title: '이번 달 1위', hero_image_url: null, rank: 1 },
        { recipe_id: 'monthly-second', title: '이번 달 2위', hero_image_url: null, rank: 2 },
      ],
      recommended: [{ recipe_id: 'lifetime-first', title: '누적 1위', hero_image_url: null }],
      next_cursor: null,
    })
    const result = await getMonthlyTopRecipes()
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/home?limit=6')
    expect(result.map((item) => item.recipe_id)).toEqual(['monthly-first', 'monthly-second'])
    expect(result.map((item) => item.rank)).toEqual([1, 2])
  })

  it('응답에 목록이 여섯 개보다 많더라도 TOP 6까지만 표시한다', async () => {
    apiFetch.mockResolvedValue({
      top_recipes: Array.from({ length: 7 }, (_, index) => ({
        recipe_id: `r-${index + 1}`,
        title: `레시피 ${index + 1}`,
        hero_image_url: null,
        rank: index + 1,
      })),
    })
    expect(await getMonthlyTopRecipes()).toHaveLength(6)
  })
})
