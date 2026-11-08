/** SVG 지도와 카카오 지도가 같은 모양으로 받는 값 */
export type RegionMapProps = {
  /** 지역 코드 → 레시피 수 (색 구분용) */
  counts: ReadonlyMap<string, number>
  /** 선택한 지역 코드 */
  selected: string | null
  onSelect: (code: string) => void
}
