import { describe, expect, it } from 'vitest'
import { districtColumnsOf, districtsOf, findRegionByCode, findRegionByText, formatRegion } from './regions'

describe('regions', () => {
  it('기존 온보딩 목록 개수 그대로 (대구 9, 경북 22)', () => {
    expect(districtsOf('대구광역시')).toHaveLength(9)
    expect(districtsOf('경상북도')).toHaveLength(22)
  })

  it('시트용 두 열은 Figma 처럼 가나다순 "시 / 군" (대구는 "구 / 군")', () => {
    const [si, gun] = districtColumnsOf('경상북도')
    expect(si.label).toBe('시')
    expect(si.items.map((region) => region.sigungu)).toEqual(['경산시', '경주시', '구미시', '김천시', '문경시', '상주시', '안동시', '영주시', '영천시', '포항시'])
    expect(gun.items.map((region) => region.sigungu)).toEqual(['고령군', '봉화군', '성주군', '영덕군', '영양군', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군'])
    const [gu, daeguGun] = districtColumnsOf('대구광역시')
    expect(gu.label).toBe('구')
    expect(gu.items).toHaveLength(7)
    expect(daeguGun.items.map((region) => region.sigungu)).toEqual(['군위군', '달성군'])
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
