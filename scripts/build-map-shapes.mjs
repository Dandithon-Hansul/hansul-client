// public/geo/daegu-gyeongbuk.geojson → src/features/map/mapShapes.ts
// 경계 파일(위도·경도)을 SVG 지도용 좌표로 미리 바꿔 둡니다. 경계 파일을 바꿨을 때만 다시 실행하세요.
//   npm run map:shapes
//
// 경계 파일 만드는 법 (한 번만):
//   1. https://github.com/vuski/admdongkor 의 HangJeongDong_ver20261001.geojson (행정동 경계) 받기
//   2. 대구(sido 27)는 하나로, 경북(sido 47)은 시·군(sgg)별로 code 를 붙인 뒤 (포항 남·북구 47111·47113 → 47110)
//   3. mapshaper -dissolve code copy-fields=name,sido -simplify 5% keep-shapes -o precision=0.0001
//   4. 단순화하면서 사라지는 독도·죽도·관음도는 원본 조각을 다시 붙임
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = new URL('../public/geo/daegu-gyeongbuk.geojson', import.meta.url)
const OUT = new URL('../src/features/map/mapShapes.ts', import.meta.url)
const ULLEUNG = '47940'
const DOKDO_LON = 131.5 // 이보다 동쪽 조각 = 독도
const WIDTH = 1000 // 본토 폭 (SVG 단위)
const PAD = 24

const geo = JSON.parse(readFileSync(SRC, 'utf8'))
const polygonsOf = (feature) => feature.geometry.coordinates // MultiPolygon: [polygon][ring][point]

// ---- 투영: 본토(울릉군 제외) 기준 등장방형 + 위도 보정 ----
const mainland = geo.features.filter((f) => f.properties.code !== ULLEUNG)
const points = mainland.flatMap((f) => polygonsOf(f).flatMap((polygon) => polygon[0]))
const minLon = Math.min(...points.map((p) => p[0]))
const maxLon = Math.max(...points.map((p) => p[0]))
const minLat = Math.min(...points.map((p) => p[1]))
const maxLat = Math.max(...points.map((p) => p[1]))
const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
const K = WIDTH / ((maxLon - minLon) * kx)
const project = ([lon, lat]) => [PAD + (lon - minLon) * kx * K, PAD + (maxLat - lat) * K]
const unproject = ([x, y]) => [minLon + (x - PAD) / (kx * K), maxLat - (y - PAD) / K]
const size = { width: Math.round(WIDTH + PAD * 2), height: Math.round((maxLat - minLat) * K + PAD * 2) }

// ---- 울릉도·독도: 실제 위치는 너무 멀어서 왼쪽 위 빈 곳에 작은 상자로 당겨 그림 ----
const ulleung = geo.features.find((f) => f.properties.code === ULLEUNG)
const isDokdo = (polygon) => polygon[0].every((p) => p[0] > DOKDO_LON)
const bboxOf = (pts) => {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}
const islandPts = polygonsOf(ulleung).filter((p) => !isDokdo(p)).flatMap((p) => p[0].map(project))
const dokdoPts = polygonsOf(ulleung).filter(isDokdo).flatMap((p) => p[0].map(project))
const ib = bboxOf(islandPts)
const db = bboxOf(dokdoPts)
const DOKDO_SCALE = 5 // 실제 크기로는 점 하나라 크게 그림
const inset = { x: PAD, y: PAD, width: 0, height: 0 }
const islandAt = { x: inset.x + 24, y: inset.y + 20 }
const islandShift = ([x, y]) => [x - ib.x0 + islandAt.x, y - ib.y0 + islandAt.y]
const dokdoW = (db.x1 - db.x0) * DOKDO_SCALE
const dokdoH = (db.y1 - db.y0) * DOKDO_SCALE
const dokdoAt = { x: islandAt.x + (ib.x1 - ib.x0) + 46, y: islandAt.y + (ib.y1 - ib.y0) * 0.55 - dokdoH / 2 }
const dokdoShift = ([x, y]) => [(x - db.x0) * DOKDO_SCALE + dokdoAt.x, (y - db.y0) * DOKDO_SCALE + dokdoAt.y]
inset.width = Math.round(dokdoAt.x + dokdoW + 30 - inset.x)
inset.height = Math.round(islandAt.y + (ib.y1 - ib.y0) + 52 - inset.y)

// ---- 도형 → SVG path, 라벨 위치, 확대용 상자 ----
const round = (v) => Math.round(v * 10) / 10
const ringPath = (pts) => 'M' + pts.map(([x, y]) => `${round(x)} ${round(y)}`).join('L') + 'Z'

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function distToRing([x, y], ring) {
  let best = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]
    const [bx, by] = ring[i]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
  }
  return best
}
/** 도형 안에서 가장자리와 가장 먼 점 (오목한 대구도 라벨이 안쪽에 오도록) */
function labelPoint(ring) {
  const b = bboxOf(ring)
  let best = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]
  let bestD = -1
  const N = 60
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const p = [b.x0 + ((b.x1 - b.x0) * i) / N, b.y0 + ((b.y1 - b.y0) * j) / N]
      if (!pointInRing(p, ring)) continue
      const d = distToRing(p, ring)
      if (d > bestD) {
        bestD = d
        best = p
      }
    }
  }
  return best
}
const area = (ring) => Math.abs(ring.reduce((s, [x, y], i) => {
  const [nx, ny] = ring[(i + 1) % ring.length]
  return s + x * ny - nx * y
}, 0) / 2)

const shapes = geo.features.map((feature) => {
  const { code, name, sido } = feature.properties
  const isUlleung = code === ULLEUNG
  const rings = []
  for (const polygon of polygonsOf(feature)) {
    const shift = !isUlleung ? (p) => p : isDokdo(polygon) ? dokdoShift : islandShift
    for (const ring of polygon) rings.push({ pts: ring.map((p) => shift(project(p))), dokdo: isUlleung && isDokdo(polygon), raw: ring })
  }
  const main = rings.filter((r) => !r.dokdo).sort((a, b) => area(b.pts) - area(a.pts))[0]
  const label = labelPoint(main.pts)
  const b = bboxOf(rings.flatMap((r) => r.pts))
  // 카카오맵 마커용 실제 위경도: 본토는 라벨 위치를 되돌리고, 울릉군은 울릉도 본섬 중심
  const center = isUlleung
    ? (() => { const r = bboxOf(main.raw); return [(r.y0 + r.y1) / 2, (r.x0 + r.x1) / 2] })()
    : (() => { const [lon, lat] = unproject(label); return [lat, lon] })()
  return {
    code,
    name,
    sido,
    d: rings.map((r) => ringPath(r.pts)).join(''),
    label: [round(label[0]), round(label[1])],
    box: [round(b.x0), round(b.y0), round(b.x1 - b.x0), round(b.y1 - b.y0)],
    center: [Math.round(center[0] * 10000) / 10000, Math.round(center[1] * 10000) / 10000],
  }
})

const dokdoLabel = [round(dokdoAt.x + dokdoW / 2), round(dokdoAt.y + dokdoH + 26)]

// 상자가 본토와 겹치는지 확인 (겹치면 위치 조정 필요)
for (const s of shapes) {
  if (s.code === ULLEUNG) continue
  const [x, y, w, h] = s.box
  if (x < inset.x + inset.width && y < inset.y + inset.height && x + w > inset.x && y + h > inset.y) {
    console.warn(`주의: 울릉도 상자가 ${s.name} 의 범위와 겹칠 수 있어요 — 화면으로 확인하세요`)
  }
}

const header = `// 자동 생성 파일 — 직접 고치지 말고 \`npm run map:shapes\` (scripts/build-map-shapes.mjs) 로 다시 만드세요.
// 경계 출처: ${geo.attribution}
// SVG 좌표: 본토 폭 ${WIDTH} 기준 등장방형 투영. 울릉도·독도는 왼쪽 위 상자(ULLEUNG_INSET)에 당겨 그림.

export type MapShape = {
  /** 행정표준 시·군·구 코드 5자리 (대구는 27000 하나) — regions.ts 와 같음 */
  code: string
  name: string
  sido: string
  /** SVG path */
  d: string
  /** 라벨·마커 위치 (SVG 좌표) */
  label: readonly [number, number]
  /** 확대할 때 쓰는 범위 [x, y, width, height] (SVG 좌표) */
  box: readonly [number, number, number, number]
  /** 카카오맵 마커 위치 [위도, 경도] */
  center: readonly [number, number]
}
`
const body = `
export const MAP_SIZE = ${JSON.stringify(size)} as const

export const ULLEUNG_INSET = ${JSON.stringify(inset)} as const

export const DOKDO_LABEL = ${JSON.stringify(dokdoLabel)} as const

export const MAP_SHAPES: readonly MapShape[] = [
${shapes.map((s) => '  ' + JSON.stringify(s)).join(',\n')},
]
`
writeFileSync(OUT, header + body)
console.log(`mapShapes.ts: ${shapes.length}개 지역, ${(Buffer.byteLength(header + body) / 1024).toFixed(1)}KB, 크기 ${size.width}×${size.height}, 울릉 상자 ${JSON.stringify(inset)}`)
