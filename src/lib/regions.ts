// 거주 지역 선택지 (온보딩·프로필 편집 공용)
// code 는 행정표준 시·군·구 코드 5자리 — API 명세서의 region_code (예: 안동시 47170)

export type RegionOption = { code: string; sido: string; sigungu: string }

export const SIDO_NAMES = ['대구광역시', '경상북도'] as const
export type SidoName = (typeof SIDO_NAMES)[number]

// 순서는 기존 OnboardingFlow 목록 그대로
const DISTRICTS: Record<SidoName, Array<[name: string, code: string]>> = {
  대구광역시: [
    ['중구', '27110'], ['동구', '27140'], ['서구', '27170'], ['남구', '27200'], ['북구', '27230'],
    ['수성구', '27260'], ['달서구', '27290'], ['달성군', '27710'], ['군위군', '27720'],
  ],
  경상북도: [
    ['포항시', '47110'], ['경주시', '47130'], ['김천시', '47150'], ['안동시', '47170'], ['구미시', '47190'],
    ['영주시', '47210'], ['영천시', '47230'], ['상주시', '47250'], ['문경시', '47280'], ['경산시', '47290'],
    ['의성군', '47730'], ['청송군', '47750'], ['영양군', '47760'], ['영덕군', '47770'], ['청도군', '47820'],
    ['고령군', '47830'], ['성주군', '47840'], ['칠곡군', '47850'], ['예천군', '47900'], ['봉화군', '47920'],
    ['울진군', '47930'], ['울릉군', '47940'],
  ],
}

export function districtsOf(sido: SidoName): RegionOption[] {
  return DISTRICTS[sido].map(([sigungu, code]) => ({ code, sido, sigungu }))
}

/**
 * 지역 시트의 두 열 (Figma: "시 / 군", 가나다순). 대구는 "구 / 군"
 */
export function districtColumnsOf(sido: SidoName): Array<{ label: string; items: RegionOption[] }> {
  const sorted = districtsOf(sido).sort((a, b) => a.sigungu.localeCompare(b.sigungu, 'ko'))
  const first = sido === '대구광역시' ? '구' : '시'
  return [
    { label: first, items: sorted.filter((region) => region.sigungu.endsWith(first)) },
    { label: '군', items: sorted.filter((region) => region.sigungu.endsWith('군')) },
  ]
}

const ALL: RegionOption[] = SIDO_NAMES.flatMap(districtsOf)

export function findRegionByCode(code: string | null | undefined): RegionOption | undefined {
  return ALL.find((region) => region.code === code)
}

/** "대구광역시 · 수성구" 같은 문자열에서 찾기 ("달서구"가 "서구"보다 먼저 맞도록 긴 이름부터) */
export function findRegionByText(text: string | null | undefined): RegionOption | undefined {
  if (!text) return undefined
  const candidates = ALL.filter((region) => text.includes(region.sigungu)).sort((a, b) => b.sigungu.length - a.sigungu.length)
  return candidates.find((region) => text.includes(region.sido)) ?? candidates[0]
}

/** 화면 표시용 "경상북도 · 안동시" (목업 형식) */
export function formatRegion(region: Pick<RegionOption, 'sido' | 'sigungu'> | null | undefined): string {
  return region ? `${region.sido} · ${region.sigungu}` : '지역 미설정'
}
