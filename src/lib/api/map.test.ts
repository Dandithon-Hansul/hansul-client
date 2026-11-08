// 실제 백엔드 모드의 지도 API — 서버 응답은 hansul-server develop 의 실제 형식을 흉내냄
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { DAEGU_DISTRICT_CODES, getRegionRecipes, resetMapApiState, type MapRecipe } from './map'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('./client', async (importOriginal) => ({ ...(await importOriginal<typeof import('./client')>()), apiFetch }))
vi.mock('../env', async (importOriginal) => ({ ...(await importOriginal<typeof import('../env')>()), IS_MOCK: false }))

const recipe = (id: string, likes: number): MapRecipe => ({
  recipe_id: id,
  title: `레시피 ${id}`,
  hero_image_url: null,
  transmitter_name: '박순자',
  like_count: likes,
  save_count: 0,
})

/** 백엔드 응답: { region_code, region, sido, recipes } */
const regionResponse = (code: string, region: string, recipes: MapRecipe[]) => ({ region_code: code, region, sido: '대구', recipes })
const notFound = () => new ApiError(404, 'REGION_NOT_FOUND', '지원하는 지역을 찾을 수 없습니다.')
const codeOf = (path: string) => path.match(/regions\/(\d+)\/recipes/)?.[1]

beforeEach(() => {
  apiFetch.mockReset()
  resetMapApiState()
})

describe('지역 인기 레시피 (실제 백엔드 모드)', () => {
  it('일반 지역은 코드로 한 번 요청해서 그대로 쓴다', async () => {
    apiFetch.mockResolvedValue({ region_code: '47170', region: '안동시', sido: '경북', recipes: [recipe('a', 3)] })
    const result = await getRegionRecipes('47170')
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/api/map/regions/47170/recipes?limit=10')
    expect(result.recipes.map((item) => item.recipe_id)).toEqual(['a'])
  })

  it('백엔드가 27000(대구 전체)을 받으면 한 번만 요청한다', async () => {
    apiFetch.mockResolvedValue(regionResponse('27000', '대구광역시', [recipe('d', 9)]))
    const result = await getRegionRecipes('27000')
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(result.recipes).toHaveLength(1)
  })

  it('27000 이 404 면 구·군 9개로 나눠 불러 좋아요 순으로 합치고, 다음부터는 바로 나눠 요청한다', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      const code = codeOf(path)
      if (code === '27000') throw notFound()
      if (code === '27110') return regionResponse('27110', '중구', [recipe('jung-1', 5), recipe('jung-2', 1)])
      if (code === '27260') return regionResponse('27260', '수성구', [recipe('suseong-1', 8)])
      return regionResponse(code ?? '', '', [])
    })

    const result = await getRegionRecipes('27000', 2)
    expect(result.region).toBe('대구광역시')
    expect(result.recipes.map((item) => item.recipe_id)).toEqual(['suseong-1', 'jung-1']) // 좋아요 순, limit 2
    const calledCodes = apiFetch.mock.calls.map(([path]) => codeOf(path as string))
    expect(calledCodes).toEqual(['27000', ...DAEGU_DISTRICT_CODES])

    apiFetch.mockClear()
    await getRegionRecipes('27000', 2)
    expect(apiFetch.mock.calls.map(([path]) => codeOf(path as string))).toEqual([...DAEGU_DISTRICT_CODES])
  })

  it('일부 구·군만 실패하면 나머지로 보여준다', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      const code = codeOf(path)
      if (code === '27000' || code === '27720') throw notFound()
      if (code === '27140') throw new ApiError(500, 'INTERNAL_ERROR', '지역 레시피를 불러오지 못했습니다.')
      return regionResponse(code ?? '', '', code === '27290' ? [recipe('dalseo', 2)] : [])
    })
    const result = await getRegionRecipes('27000')
    expect(result.recipes.map((item) => item.recipe_id)).toEqual(['dalseo'])
  })

  it('구·군 요청이 전부 실패하면 에러를 그대로 알린다', async () => {
    apiFetch.mockRejectedValue(notFound())
    await expect(getRegionRecipes('27000')).rejects.toMatchObject({ status: 404 })
  })

  it('27000 요청이 404 가 아닌 에러(서버 오류)면 나눠 요청하지 않고 에러를 알린다', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', '지역 레시피를 불러오지 못했습니다.'))
    await expect(getRegionRecipes('27000')).rejects.toMatchObject({ status: 500 })
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
