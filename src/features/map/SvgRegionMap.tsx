import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { BORDER, fillFor, mapLabel, SELECTED_FILL, SELECTED_STROKE } from './mapStyle'
import { DOKDO_LABEL, MAP_SHAPES, MAP_SIZE, ULLEUNG_INSET, type MapShape } from './mapShapes'
import type { RegionMapProps } from './regionMapProps'

type ViewBox = { x: number; y: number; w: number; h: number }

const FULL: ViewBox = { x: 0, y: 0, w: MAP_SIZE.width, h: MAP_SIZE.height }
const ASPECT = MAP_SIZE.width / MAP_SIZE.height
const MIN_W = 160 // 최대 확대 (약 6.5배)
const MAX_W = MAP_SIZE.width * 1.15
const LABEL_SIZE = 26 // 전체 보기 기준 글자 크기 (SVG 단위)
const DRAG_THRESHOLD = 6 // px — 이보다 많이 움직이면 '탭'이 아니라 '끌기'
const ULLEUNG_CODE = '47940'

/** 선택한 지역이 이웃 지역과 함께 보이도록 감싸는 화면 범위 */
function viewFor(shape: MapShape): ViewBox {
  const [bx, by, bw, bh] = shape.box
  const w = Math.min(MAX_W, Math.max(bw * 2, bh * 2 * ASPECT, 340))
  const h = w / ASPECT
  return clamp({ x: bx + bw / 2 - w / 2, y: by + bh / 2 - h / 2, w, h })
}

/** 지도 밖으로 너무 멀리 끌려가지 않게 */
function clamp(vb: ViewBox): ViewBox {
  const w = Math.min(MAX_W, Math.max(MIN_W, vb.w))
  const h = w / ASPECT
  const cx = Math.min(FULL.w, Math.max(0, vb.x + vb.w / 2))
  const cy = Math.min(FULL.h, Math.max(0, vb.y + vb.h / 2))
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 카카오 키 없이도 동작하는 SVG 지도.
 * 탭 → 지역 선택 / 끌기 → 이동 / 두 손가락·휠·버튼 → 확대·축소
 */
function SvgRegionMap({ counts, selected, onSelect }: RegionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const selectedShape = MAP_SHAPES.find((shape) => shape.code === selected) ?? null
  const [vb, setVb] = useState<ViewBox>(() => (selectedShape ? viewFor(selectedShape) : FULL))
  const vbRef = useRef(vb)
  const frame = useRef(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pinchDistance = useRef(0)

  const apply = useCallback((next: ViewBox) => {
    vbRef.current = next
    setVb(next)
  }, [])

  /** 부드럽게 이동 (움직임 줄이기 설정이면 바로) */
  const animateTo = useCallback((target: ViewBox) => {
    cancelAnimationFrame(frame.current)
    const from = vbRef.current
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') return apply(target)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 320)
      const e = 1 - (1 - t) ** 3
      apply({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e })
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [apply])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  // 지역을 고르면 그 지역으로 확대 (명세: 선택한 지역 중심으로 확대)
  const lastSelected = useRef(selected)
  useEffect(() => {
    if (lastSelected.current === selected) return
    lastSelected.current = selected
    const shape = MAP_SHAPES.find((item) => item.code === selected)
    animateTo(shape ? viewFor(shape) : FULL)
  }, [selected, animateTo])

  /** 화면 좌표(px) → SVG 좌표 */
  const toSvg = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const current = vbRef.current
    if (!rect || rect.width === 0) return { x: current.x + current.w / 2, y: current.y + current.h / 2, unit: 1 }
    const scale = Math.min(rect.width / current.w, rect.height / current.h)
    const offsetX = (rect.width - current.w * scale) / 2
    const offsetY = (rect.height - current.h * scale) / 2
    return { x: current.x + (clientX - rect.left - offsetX) / scale, y: current.y + (clientY - rect.top - offsetY) / scale, unit: 1 / scale }
  }, [])

  const zoomAt = useCallback((factor: number, px: number, py: number, animate = false) => {
    const current = vbRef.current
    const w = Math.min(MAX_W, Math.max(MIN_W, current.w * factor))
    const ratio = w / current.w
    const next = clamp({ x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio, w, h: w / ASPECT })
    if (animate) animateTo(next)
    else apply(next)
  }, [animateTo, apply])

  const zoomButton = (factor: number) => {
    const current = vbRef.current
    zoomAt(factor, current.x + current.w / 2, current.y + current.h / 2, true)
  }

  // 휠 확대 (passive 가 아니어야 페이지 스크롤을 막을 수 있어서 직접 등록)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      cancelAnimationFrame(frame.current)
      const p = toSvg(event.clientX, event.clientY)
      zoomAt(event.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [toSvg, zoomAt])

  // ---- 끌어서 이동 · 두 손가락 확대 ----
  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    cancelAnimationFrame(frame.current)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 1) moved.current = 0
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const prev = pointers.current.get(event.pointerId)
    if (!prev) return
    const next = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, next)
    if (pointers.current.size === 1) {
      const dx = next.x - prev.x
      const dy = next.y - prev.y
      moved.current += Math.abs(dx) + Math.abs(dy)
      if (moved.current < DRAG_THRESHOLD) return
      const { unit } = toSvg(next.x, next.y)
      const current = vbRef.current
      apply(clamp({ ...current, x: current.x - dx * unit, y: current.y - dy * unit }))
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      moved.current = DRAG_THRESHOLD // 두 손가락이면 탭으로 보지 않음
      if (pinchDistance.current > 0 && distance > 0) {
        const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2)
        zoomAt(pinchDistance.current / distance, mid.x, mid.y)
      }
      pinchDistance.current = distance
    }
  }

  function onPointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId)
    pinchDistance.current = 0
  }

  function choose(code: string) {
    if (moved.current >= DRAG_THRESHOLD) return // 끌다가 놓은 건 선택 아님
    onSelect(code)
  }

  function onKey(event: KeyboardEvent<SVGGElement>, code: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(code)
  }

  const k = vb.w / FULL.w // 확대해도 글자·마커가 화면에서 같은 크기로 보이게
  const fontSize = LABEL_SIZE * k

  return (
    <div className="region-map">
      <svg
        ref={svgRef}
        className="region-map-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="대구·경북 지역 지도"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        {MAP_SHAPES.map((shape) => {
          const count = counts.get(shape.code) ?? 0
          const isSelected = shape.code === selected
          return (
            <g
              key={shape.code}
              className={`region-shape${isSelected ? ' is-selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${shape.name}, 레시피 ${count}개`}
              onClick={() => choose(shape.code)}
              onKeyDown={(event) => onKey(event, shape.code)}
            >
              {/* 울릉도·독도는 작아서 상자 전체를 눌러도 선택되게 */}
              {shape.code === ULLEUNG_CODE && <rect className="region-map-inset" x={ULLEUNG_INSET.x} y={ULLEUNG_INSET.y} width={ULLEUNG_INSET.width} height={ULLEUNG_INSET.height} rx={10} vectorEffect="non-scaling-stroke" />}
              <path d={shape.d} fill={isSelected ? SELECTED_FILL : fillFor(count)} stroke={isSelected ? SELECTED_STROKE : BORDER} strokeWidth={isSelected ? 2.2 : 1.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          )
        })}
        {/* 선택한 지역 테두리를 이웃 테두리 위에 한 번 더 */}
        {selectedShape && <path className="region-map-outline" d={selectedShape.d} vectorEffect="non-scaling-stroke" />}

        <g className="region-map-labels" aria-hidden="true" fontSize={fontSize} strokeWidth={fontSize * 0.22}>
          {MAP_SHAPES.map((shape) => (shape.code === selected ? null : (
            <text key={shape.code} x={shape.label[0]} y={shape.label[1] + fontSize * 0.35}>{mapLabel(shape)}</text>
          )))}
          <text className="region-map-dokdo" x={DOKDO_LABEL[0]} y={DOKDO_LABEL[1]} fontSize={fontSize * 0.75}>독도</text>
        </g>

        {selectedShape && (
          <g className="region-map-marker" aria-hidden="true" transform={`translate(${selectedShape.label[0]} ${selectedShape.label[1]}) scale(${k * 1.6})`}>
            <path d="M0 0c-9-12-14-19-14-26a14 14 0 1 1 28 0c0 7-5 14-14 26Z" transform="translate(0 -4)" />
            <circle cx="0" cy="-30" r="5" />
            <text y="24" fontSize={LABEL_SIZE / 1.6} strokeWidth={(LABEL_SIZE / 1.6) * 0.22}>{mapLabel(selectedShape)}</text>
          </g>
        )}
      </svg>

      <div className="region-map-zoom">
        <button type="button" aria-label="확대" onClick={() => zoomButton(1 / 1.6)}>+</button>
        <button type="button" aria-label="축소" onClick={() => zoomButton(1.6)}>−</button>
        <button type="button" aria-label="전체 지도 보기" onClick={() => animateTo(FULL)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  )
}

export default SvgRegionMap
