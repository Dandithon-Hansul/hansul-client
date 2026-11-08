// 지도 공용 값 — 색, 이름표, 경계 파일 주소 (SVG·카카오맵 둘 다 사용)

/** 레시피가 많은 지역일수록 진한 초록 */
export const LEVELS = [
  { min: 0, label: '0', fill: '#f1eee6' },
  { min: 1, label: '1–2', fill: '#dce5d3' },
  { min: 3, label: '3–4', fill: '#b5c6a8' },
  { min: 5, label: '5+', fill: '#8aa07f' },
] as const

/** 선택한 지역은 테라코타 (명세: 마커 + 색 구분) */
export const SELECTED_FILL = '#efc2b4'
export const SELECTED_STROKE = '#b94830'
export const BORDER = '#ffffff'

export function fillFor(count: number | undefined): string {
  const n = count ?? 0
  let fill: string = LEVELS[0].fill
  for (const level of LEVELS) if (n >= level.min) fill = level.fill
  return fill
}

/** 지도 위 짧은 이름 ('대구광역시' → '대구') */
export function mapLabel(region: { name: string }): string {
  return region.name === '대구광역시' ? '대구' : region.name
}

/** 공공데이터(통계청 SGIS 행정동 경계)를 대구 1개 + 경북 22개 시·군으로 합친 정적 파일 */
export const GEO_URL = '/geo/daegu-gyeongbuk.geojson'

/** 지도 아래 출처 표시 (공공누리 제1유형·CC BY 4.0 출처표시 의무) */
export const GEO_ATTRIBUTION = '경계: 통계청 SGIS · admdongkor'
