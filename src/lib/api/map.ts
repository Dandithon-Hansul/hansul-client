// 지역 레시피 지도 API (API 명세서 10. 지역 지도)
import { IS_MOCK } from '../env'
import { mockDelay, MOCK_MAP_RECIPES } from '../mock/mockMap'
import { apiFetch } from './client'

export type MapRegionSummary = {
  /** 행정표준 시·군·구 코드 5자리 (대구광역시는 27000 하나) */
  region_code: string
  region: string
  recipe_count: number
}

export type MapRegionsResponse = { regions: MapRegionSummary[] }

export type MapRecipe = {
  recipe_id: string
  title: string
  hero_image_url: string | null
  transmitter_name: string
  like_count: number
  save_count: number
}

export type RegionRecipesResponse = { region: string; recipes: MapRecipe[] }

/** 지역 이름 (mock 용 — 실제로는 서버 응답의 region 사용) */
const MOCK_REGION_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(MOCK_MAP_RECIPES).map(([code, entry]) => [code, entry.region]),
)

/** GET /api/map/regions — 지역별 공개 레시피 수 */
export async function getMapRegions(): Promise<MapRegionsResponse> {
  if (IS_MOCK) {
    await mockDelay()
    return {
      regions: Object.entries(MOCK_MAP_RECIPES).map(([region_code, entry]) => ({
        region_code,
        region: entry.region,
        recipe_count: entry.recipes.length,
      })),
    }
  }
  return apiFetch<MapRegionsResponse>('/api/map/regions')
}

/** GET /api/map/regions/:region_code/recipes — 선택 지역 인기 레시피 (좋아요+저장 많은 순) */
export async function getRegionRecipes(regionCode: string, limit = 10): Promise<RegionRecipesResponse> {
  if (IS_MOCK) {
    await mockDelay()
    const entry = MOCK_MAP_RECIPES[regionCode]
    const recipes = [...(entry?.recipes ?? [])]
      .sort((a, b) => b.like_count + b.save_count - (a.like_count + a.save_count))
      .slice(0, limit)
    return { region: MOCK_REGION_NAMES[regionCode] ?? '', recipes }
  }
  const params = new URLSearchParams({ limit: String(limit) })
  return apiFetch<RegionRecipesResponse>(`/api/map/regions/${encodeURIComponent(regionCode)}/recipes?${params}`)
}
