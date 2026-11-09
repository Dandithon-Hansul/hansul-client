// 지역 레시피 지도 API (API 명세서 10. 지역 지도)
import { IS_MOCK } from '../env'
import { mockDelay, MOCK_MAP_RECIPES } from '../mock/mockMap'
import { ApiError, apiFetch } from './client'

export type MapRegionSummary = {
  /** 행정표준 시·군·구 코드 5자리. 백엔드는 대구를 구·군 9개 코드로 보냄 → 지도에서 27000 하나로 합침 */
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

/** 지도·온보딩에서 대구는 하나(27000) */
const DAEGU_CODE = '27000'
/** 백엔드 지역 목록(hansul-server src/lib/map/regions.ts)의 대구 구·군 — 중구~달성군 + 2023년 편입된 군위군 */
export const DAEGU_DISTRICT_CODES = ['27110', '27140', '27170', '27200', '27230', '27260', '27290', '27710', '27720'] as const

/** 지역 이름 (mock 용 — 실제로는 서버 응답의 region 사용) */
const MOCK_REGION_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(MOCK_MAP_RECIPES).map(([code, entry]) => [code, entry.region]),
)

/** 백엔드와 같은 인기순: 좋아요 많은 순 (같으면 원래 순서 유지) */
const byPopularity = (a: MapRecipe, b: MapRecipe) => b.like_count - a.like_count

/** GET /api/map/regions — 지역별 공개 레시피 수 (0개 지역 포함) */
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

function fetchRegionRecipes(regionCode: string, limit: number) {
  const params = new URLSearchParams({ limit: String(limit) })
  return apiFetch<RegionRecipesResponse>(`/api/map/regions/${encodeURIComponent(regionCode)}/recipes?${params}`)
}

/** 백엔드가 27000(대구 전체)을 모르는지 — 한 번 404 를 받으면 다음부터 바로 구·군별로 요청 */
let daeguNeedsDistricts = false

/** 테스트용: 위 기억 지우기 */
export function resetMapApiState() {
  daeguNeedsDistricts = false
}

/**
 * 대구 인기 레시피.
 * 백엔드가 27000 을 받으면 그대로 쓰고, 404(REGION_NOT_FOUND)면 구·군 9개를 나눠 불러 인기순으로 합침.
 * 일부 구·군만 실패하면 나머지로 보여주고, 전부 실패하면 첫 에러를 던짐
 */
async function getDaeguRecipes(limit: number): Promise<RegionRecipesResponse> {
  if (!daeguNeedsDistricts) {
    try {
      return await fetchRegionRecipes(DAEGU_CODE, limit)
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
      daeguNeedsDistricts = true
    }
  }
  const results = await Promise.allSettled(DAEGU_DISTRICT_CODES.map((code) => fetchRegionRecipes(code, limit)))
  const ok = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  if (ok.length === 0) {
    const failed = results.find((result) => result.status === 'rejected')
    throw failed?.reason ?? new ApiError(0, 'NETWORK_ERROR', '대구 레시피를 불러오지 못했어요.')
  }
  const recipes = ok.flatMap((response) => response.recipes).sort(byPopularity).slice(0, limit)
  return { region: '대구광역시', recipes }
}

/** GET /api/map/regions/:region_code/recipes — 선택 지역 인기 레시피 (좋아요 많은 순) */
export async function getRegionRecipes(regionCode: string, limit = 10): Promise<RegionRecipesResponse> {
  if (IS_MOCK) {
    await mockDelay()
    const entry = MOCK_MAP_RECIPES[regionCode]
    const recipes = [...(entry?.recipes ?? [])].sort(byPopularity).slice(0, limit)
    return { region: MOCK_REGION_NAMES[regionCode] ?? '', recipes }
  }
  if (regionCode === DAEGU_CODE) return getDaeguRecipes(limit)
  return fetchRegionRecipes(regionCode, limit)
}
