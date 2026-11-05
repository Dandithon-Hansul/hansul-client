import { describe, expect, it } from 'vitest'
import { districtsOf, findRegionByCode, findRegionByText, formatRegion } from './regions'

describe('regions', () => {
  it('기존 온보딩 목록 개수 그대로 (대구 9, 경북 22)', () => {
    expect(districtsOf('대구광역시')).toHaveLength(9)
    expect(districtsOf('경상북도')).toHaveLength(22)
  })

  it('코드·문자열로 지역을 찾는다', () => {
    expect(findRegionByCode('47170')).toEqual({ code: '47170', sido: '경상북도', sigungu: '안동시' })
    expect(findRegionByText('대구광역시 · 달서구')?.code).toBe('27290') // "서구"로 잘못 찾지 않음
    expect(findRegionByText('대구광역시 · 서구')?.code).toBe('27170')
    expect(findRegionByText('')).toBeUndefined()
  })

  it('목업 형식으로 표시한다', () => {
    expect(formatRegion({ sido: '경상북도', sigungu: '안동시' })).toBe('경상북도 · 안동시')
    expect(formatRegion(null)).toBe('지역 미설정')
  })
})
