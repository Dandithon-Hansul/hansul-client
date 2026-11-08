// 지도 공용 값 — 색(Figma 지도 화면 기준), 이름표, 경계 파일 주소 (SVG·카카오맵 둘 다 사용)

export const DAEGU_CODE = '27000'

/** 경상북도 시·군 — 연두 */
export const GB_FILL = '#c4dcad'
/** 대구광역시 — 살구 */
export const DAEGU_FILL = '#f8c9b7'
/** 대구·경북 바깥 테두리 — 진한 초록 */
export const OUTLINE = '#24571d'
/** 대구 테두리 — 갈색 */
export const DAEGU_BORDER = '#9f6044'
/** 시·군 사이, 대구 구·군 사이 경계선 */
export const INNER_LINE = '#ffffff'
/** 선택한 지역 표시 — 빨간 핀만 */
export const PIN = '#c4453b'
export const LABEL = '#2b2b2b'

export const fillOf = (code: string) => (code === DAEGU_CODE ? DAEGU_FILL : GB_FILL)

/** 지도 위 이름 그대로 ('대구광역시', '안동시') */
export function mapLabel(region: { name: string }): string {
  return region.name
}

/** 시트 제목용 짧은 이름: '안동시' → '안동', '울릉군' → '울릉', '대구광역시' → '대구' */
export function shortName(name: string): string {
  if (name === '대구광역시') return '대구'
  return name.length > 2 ? name.replace(/[시군]$/, '') : name
}

/** 공공데이터(통계청 SGIS 행정동 경계)를 대구 1개 + 경북 22개 시·군으로 합친 정적 파일 */
export const GEO_URL = '/geo/daegu-gyeongbuk.geojson'

/** 지도 출처 표시 (공공누리 제1유형·CC BY 4.0 출처표시 의무) */
export const GEO_ATTRIBUTION = '경계: 통계청 SGIS · admdongkor'
