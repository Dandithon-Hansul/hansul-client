/** 지도를 가리는 화면 위·아래 영역(px) — 뒤로가기 줄, 하단 메뉴·시트. 지도는 그 사이에 맞춰 보여줌 */
export type MapInsets = { top: number; bottom: number }

/** SVG 지도와 카카오 지도가 같은 모양으로 받는 값 */
export type RegionMapProps = {
  /** 지역 코드 → 레시피 수 (화면 낭독기 안내용) */
  counts: ReadonlyMap<string, number>
  /** 선택한 지역 코드 */
  selected: string | null
  onSelect: (code: string) => void
  insets: MapInsets
}
