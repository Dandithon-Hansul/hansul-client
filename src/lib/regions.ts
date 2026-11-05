// 거주 지역 선택지 (온보딩·프로필 편집 공용)
// code 는 행정표준 시·군·구 코드 5자리 — API 명세서의 region_code (예: 안동시 47170)

export type RegionOption = { code: string; sido: string; sigungu: string }

export const SIDO_NAMES = ['대구광역시', '경상북도'] as const
export type SidoName = (typeof SIDO_NAMES)[number]

/**
 * 대구는 구·군으로 나누지 않고 '대구광역시' 하나로 선택 (Figma 최종 디자인)
 * 시·도 단위라 시·군·구 이름(sigungu)은 비워 두고, 코드는 시·도 코드 27 + 000
 */
export const DAEGU: RegionOption = { code: '27000', sido: '대구광역시', sigungu: '' }

const GYEONGBUK: Array<[name: string, code: string]> = [
  ['포항시', '47110'], ['경주시', '47130'], ['김천시', '47150'], ['안동시', '47170'], ['구미시', '47190'],
  ['영주시', '47210'], ['영천시', '47230'], ['상주시', '47250'], ['문경시', '47280'], ['경산시', '47290'],
  ['의성군', '47730'], ['청송군', '47750'], ['영양군', '47760'], ['영덕군', '47770'], ['청도군', '47820'],
  ['고령군', '47830'], ['성주군', '47840'], ['칠곡군', '47850'], ['예천군', '47900'], ['봉화군', '47920'],
  ['울진군', '47930'], ['울릉군', '47940'],
]

export function districtsOf(sido: SidoName): RegionOption[] {
  if (sido === '대구광역시') return [DAEGU]
  return GYEONGBUK.map(([sigungu, code]) => ({ code, sido, sigungu }))
}

/**
 * 지역 시트 목록 (Figma)
 * - 경상북도: "시 / 군" 두 열, 가나다순
 * - 대구광역시: 제목 없이 '대구광역시' 한 줄
 */
export function districtColumnsOf(sido: SidoName): Array<{ label: string | null; items: RegionOption[] }> {
  if (sido === '대구광역시') return [{ label: null, items: [DAEGU] }]
  const sorted = districtsOf(sido).sort((a, b) => a.sigungu.localeCompare(b.sigungu, 'ko'))
  return [
    { label: '시', items: sorted.filter((region) => region.sigungu.endsWith('시')) },
    { label: '군', items: sorted.filter((region) => region.sigungu.endsWith('군')) },
  ]
}

const ALL: RegionOption[] = SIDO_NAMES.flatMap(districtsOf)

export function findRegionByCode(code: string | null | undefined): RegionOption | undefined {
  if (!code) return undefined
  // 예전에 저장된 대구 구 코드(27110 등)도 '대구광역시'로 취급
  if (code.startsWith('27')) return DAEGU
  return ALL.find((region) => region.code === code)
}

/** "경상북도 · 안동시", "대구광역시" 같은 문자열에서 찾기 */
export function findRegionByText(text: string | null | undefined): RegionOption | undefined {
  if (!text) return undefined
  const hit = ALL.filter((region) => region.sigungu && text.includes(region.sigungu)).sort((a, b) => b.sigungu.length - a.sigungu.length)[0]
  if (hit) return hit
  return text.includes('대구') ? DAEGU : undefined
}

/** 짧은 이름: 온보딩 입력칸·시트 목록용 ('안동시', '대구광역시') */
export function regionLabel(region: Pick<RegionOption, 'sido' | 'sigungu'>): string {
  return region.sigungu || region.sido
}

/** 프로필 표시용: "경상북도 · 안동시" / 대구는 "대구광역시" (목업 형식) */
export function formatRegion(region: Pick<RegionOption, 'sido' | 'sigungu'> | null | undefined): string {
  if (!region) return '지역 미설정'
  return region.sigungu ? `${region.sido} · ${region.sigungu}` : region.sido
}
