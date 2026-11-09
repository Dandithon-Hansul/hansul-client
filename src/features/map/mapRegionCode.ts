import { findRegionByCode } from '../../lib/regions'
import { MAP_SHAPES } from './mapShapes'

const MAP_CODES = new Set(MAP_SHAPES.map((shape) => shape.code))

/**
 * 서버·주소에서 받은 지역 코드를 지도 코드로 맞춤
 * - 대구 구·군 코드(27110 등)는 대구 하나(27000)로 합침 (온보딩과 같은 규칙)
 * - 지도에 없는 코드는 null
 */
export function toMapCode(code: string | null | undefined): string | null {
  if (!code) return null
  const normalized = findRegionByCode(code)?.code ?? code
  return MAP_CODES.has(normalized) ? normalized : null
}
