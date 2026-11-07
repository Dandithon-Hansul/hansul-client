import { describe, expect, it } from 'vitest'
import { DAEGU, districtColumnsOf, findRegionByCode, findRegionByText, formatRegion, regionLabel } from './regions'

describe('regions', () => {
  it('경북은 Figma 처럼 가나다순 "시 / 군" 두 열 (시 10, 군 12)', () => {
    const [si, gun] = districtColumnsOf('경상북도')
    expect(si.label).toBe('시')
    expect(si.items.map((region) => region.sigungu)).toEqual(['경산시', '경주시', '구미시', '김천시', '문경시', '상주시', '안동시', '영주시', '영천시', '포항시'])
    expect(gun.items.map((region) => region.sigungu)).toEqual(['고령군', '봉화군', '성주군', '영덕군', '영양군', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군'])
  })

  it('대구는 구·군 없이 대구광역시 한 줄 (Figma)', () => {
    expect(districtColumnsOf('대구광역시')).toEqual([{ label: null, items: [DAEGU] }])
    expect(regionLabel(DAEGU)).toBe('대구광역시')
  })

  it('코드·문자열로 지역을 찾는다', () => {
    expect(findRegionByCode('47170')).toEqual({ code: '47170', sido: '경상북도', sigungu: '안동시' })
    expect(findRegionByCode('27000')).toBe(DAEGU)
    expect(findRegionByCode('27260')).toBe(DAEGU) // 예전 대구 구 코드도 대구로
    expect(findRegionByText('경상북도 · 안동시')?.code).toBe('47170')
    expect(findRegionByText('대구광역시 · 수성구')).toBe(DAEGU)
    expect(findRegionByText('')).toBeUndefined()
  })

  it('목업 형식으로 표시한다', () => {
    expect(formatRegion({ sido: '경상북도', sigungu: '안동시' })).toBe('경상북도 · 안동시')
    expect(formatRegion(DAEGU)).toBe('대구광역시')
    expect(formatRegion(null)).toBe('지역 미설정')
  })
})
