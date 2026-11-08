import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { DAEGU_DISTRICTS, DAEGU_INNER_D, DOKDO_LABEL, INNER_D, MAINLAND_BOX, MAP_SHAPES, MAP_SIZE, OUTLINE_D, PROVINCE_LABEL, ULLEUNG_INSET, type MapShape } from './mapShapes'
import { DAEGU_BORDER, DAEGU_CODE, fillOf, INNER_LINE, LABEL, mapLabel, OUTLINE, PIN, SELECTED_STROKE } from './mapStyle'
import type { MapInsets, RegionMapProps } from './regionMapProps'

/** 카메라: 화면 왼쪽 위에 오는 지도 좌표(x, y) + 배율 s (화면 px / 지도 단위) */
type Camera = { x: number; y: number; s: number }
type Size = { w: number; h: number }
type Box = readonly [number, number, number, number]

const ULLEUNG_CODE = '47940'
const DEFAULT_SIZE: Size = { w: 402, h: 874 } // 크기를 재기 전(테스트 환경 등) 기본값 — Figma 화면 크기
const SIDE_PAD = -12 // Figma 처럼 처음 화면 양옆을 살짝 잘라 지도를 크게 (울릉도 상자는 안쪽에 있어 안 잘림)
const MIN_ZOOM = 0.8
const MAX_ZOOM = 7
const LABEL_GROW = 1.5 // 확대하면 글자도 커지되 이 배율까지만
const DRAG_THRESHOLD = 6 // px — 이보다 많이 움직이면 '탭'이 아니라 '끌기'
const DISTRICT_LABEL_ZOOM = 2.2 // 대구 구·군 이름은 이만큼 확대했을 때만 (실제 크기에선 대구 시내가 작아 겹침)
const JUNG_GU_ZOOM = 4 // 중구는 아주 작고 대구를 고르면 핀 자리라서 더 확대했을 때만

// 글자 크기 (확대 1배일 때 화면 px)
const FONT = { region: 11, province: 19, daegu: 13, district: 9.5, dokdo: 9 }

/** box 를 화면의 가려지지 않은 영역(insets 사이) 가운데에 맞추는 카메라 */
function fit(box: Box, size: Size, insets: MapInsets, padX: number, padY: number): Camera {
  const [bx, by, bw, bh] = box
  const freeH = Math.max(80, size.h - insets.top - insets.bottom)
  const s = Math.min((size.w - 2 * padX) / bw, (freeH - 2 * padY) / bh)
  return { x: bx + bw / 2 - size.w / 2 / s, y: by + bh / 2 - (insets.top + freeH / 2) / s, s }
}

const mainlandFit = (size: Size, insets: MapInsets) => fit(MAINLAND_BOX, size, insets, SIDE_PAD, 12)

/** 선택한 지역 + 이웃이 함께 보이는 범위 (지역이 화면 폭의 절반쯤 차지) */
function regionBox(shape: MapShape): Box {
  if (shape.code === ULLEUNG_CODE) return [ULLEUNG_INSET.x - 20, ULLEUNG_INSET.y - 20, ULLEUNG_INSET.width + 40, ULLEUNG_INSET.height + 40]
  const [, , bw, bh] = shape.box
  // 대구는 군위군까지 세로로 길어서 시내 중심으로 (구 이름이 보이도록 조금 더 확대)
  const side = shape.code === DAEGU_CODE ? 260 : Math.min(700, Math.max(300, Math.max(bw, bh) * 1.8))
  const [cx, cy] = shape.label
  return [cx - side / 2, cy - side / 2, side, side]
}

function targetFor(selected: string | null, size: Size, insets: MapInsets): Camera {
  const shape = MAP_SHAPES.find((item) => item.code === selected)
  return shape ? fit(regionBox(shape), size, insets, 12, 12) : mainlandFit(size, insets)
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Figma 스타일 지도 (카카오 키 없이 동작)
 * 연두 경북 + 살구 대구, 진한 초록 바깥 테두리, 흰 경계선 / 선택: 회색 테두리 + 빨간 핀
 * 탭 → 지역 선택 / 끌기 → 이동 / 두 손가락·휠 → 확대·축소
 */
function SvgRegionMap({ counts, selected, onSelect, insets }: RegionMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState<Size>(DEFAULT_SIZE)
  const [camera, setCamera] = useState<Camera>(() => targetFor(selected, DEFAULT_SIZE, insets))
  const cameraRef = useRef(camera)
  const frame = useRef(0)
  const measured = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pinchDistance = useRef(0)

  const apply = useCallback((next: Camera) => {
    cameraRef.current = next
    setCamera(next)
  }, [])

  // 확대 한계·이동 범위 (지도 밖으로 너무 멀리 못 가게)
  const clamp = useCallback((next: Camera, view: Size = size): Camera => {
    const base = mainlandFit(view, { top: 0, bottom: 0 }).s
    const s = Math.min(base * MAX_ZOOM, Math.max(base * MIN_ZOOM, next.s))
    const cx = Math.min(MAP_SIZE.width, Math.max(0, next.x + view.w / 2 / s))
    const cy = Math.min(MAP_SIZE.height, Math.max(0, next.y + view.h / 2 / s))
    return { x: cx - view.w / 2 / s, y: cy - view.h / 2 / s, s }
  }, [size])

  /** 부드럽게 이동 (움직임 줄이기 설정이면 바로) */
  const animateTo = useCallback((target: Camera) => {
    cancelAnimationFrame(frame.current)
    const from = cameraRef.current
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') return apply(target)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 340)
      const e = 1 - (1 - t) ** 3
      apply({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, s: from.s + (target.s - from.s) * e })
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [apply])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  // 화면 크기 재기 (회전·창 크기 변경 포함). 테스트 환경처럼 ResizeObserver 가 없으면 기본 크기 사용
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }))
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  // 선택 지역·화면 크기·가림 영역이 바뀌면 그에 맞게 이동 (처음 크기를 잰 직후엔 애니메이션 없이)
  const { top, bottom } = insets
  useEffect(() => {
    const target = targetFor(selected, size, { top, bottom })
    if (!measured.current && size !== DEFAULT_SIZE) {
      measured.current = true
      apply(target)
      return
    }
    animateTo(target)
  }, [selected, size, top, bottom, animateTo, apply])

  /** 화면 좌표(px) → 지도 좌표 */
  const toMap = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const cam = cameraRef.current
    const px = rect && rect.width > 0 ? clientX - rect.left : size.w / 2
    const py = rect && rect.height > 0 ? clientY - rect.top : size.h / 2
    return { px, py, x: cam.x + px / cam.s, y: cam.y + py / cam.s }
  }, [size])

  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    const { px, py, x, y } = toMap(clientX, clientY)
    const s = cameraRef.current.s / factor
    apply(clamp({ x: x - px / s, y: y - py / s, s }))
  }, [apply, clamp, toMap])

  // 휠 확대 (passive 가 아니어야 페이지 스크롤을 막을 수 있어서 직접 등록)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      cancelAnimationFrame(frame.current)
      zoomAt(event.deltaY > 0 ? 1.15 : 1 / 1.15, event.clientX, event.clientY)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [zoomAt])

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
      const cam = cameraRef.current
      apply(clamp({ ...cam, x: cam.x - dx / cam.s, y: cam.y - dy / cam.s }))
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      moved.current = DRAG_THRESHOLD // 두 손가락이면 탭으로 보지 않음
      if (pinchDistance.current > 0 && distance > 0) zoomAt(pinchDistance.current / distance, (a.x + b.x) / 2, (a.y + b.y) / 2)
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

  // 글자는 확대할수록 조금 커지다가(최대 1.5배) 멈춤 → 화면 px 를 지도 단위로 바꿈
  const zoom = camera.s / mainlandFit(size, { top: 0, bottom: 0 }).s
  const grow = Math.min(Math.max(zoom, 1), LABEL_GROW)
  const unit = (px: number) => (px * grow) / camera.s
  const selectedShape = MAP_SHAPES.find((shape) => shape.code === selected) ?? null
  const showDistricts = zoom >= DISTRICT_LABEL_ZOOM
  // 핀 위치: 이름표 바로 위. 대구를 확대해 구 이름이 보일 땐 북구 이름을 가리지 않게 시청이 있는 중구에 꽂음
  const jungGu = DAEGU_DISTRICTS.find((district) => district.code === '27110')
  const pinAt = selectedShape?.code === DAEGU_CODE && showDistricts && jungGu
    ? jungGu.label
    : selectedShape && ([selectedShape.label[0], selectedShape.label[1] - unit(FONT.region) * 0.9] as const)

  return (
    <div className="region-map">
      <svg
        ref={svgRef}
        className="region-map-svg"
        viewBox={`${camera.x} ${camera.y} ${size.w / camera.s} ${size.h / camera.s}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="대구·경북 지역 지도"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        {/* 1) 지역 면 — 누르는 영역 */}
        {MAP_SHAPES.map((shape) => {
          const count = counts.get(shape.code) ?? 0
          const isUlleung = shape.code === ULLEUNG_CODE
          return (
            <g
              key={shape.code}
              className="region-shape"
              role="button"
              tabIndex={0}
              aria-pressed={shape.code === selected}
              aria-label={`${shape.name}, 레시피 ${count}개`}
              onClick={() => choose(shape.code)}
              onKeyDown={(event) => onKey(event, shape.code)}
            >
              {/* 울릉도·독도는 작아서 상자 전체를 눌러도 선택되게 */}
              {isUlleung && <rect className="region-map-inset" x={ULLEUNG_INSET.x} y={ULLEUNG_INSET.y} width={ULLEUNG_INSET.width} height={ULLEUNG_INSET.height} rx={10} vectorEffect="non-scaling-stroke" />}
              <path
                d={shape.d}
                fill={fillOf(shape.code)}
                stroke={isUlleung ? OUTLINE : 'none'}
                strokeWidth={isUlleung ? 1.6 : 0}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}

        {/* 2) 경계선 — 누르기를 방해하지 않게 pointer-events 없음 */}
        <g className="region-map-lines" fill="none" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          <path d={INNER_D} stroke={INNER_LINE} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
          <path d={DAEGU_INNER_D} stroke={INNER_LINE} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
          <path d={OUTLINE_D} stroke={OUTLINE} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <path d={MAP_SHAPES.find((shape) => shape.code === DAEGU_CODE)?.d} stroke={DAEGU_BORDER} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
          {selectedShape && <path className="region-map-selected" d={selectedShape.d} stroke={SELECTED_STROKE} strokeWidth={2.6} vectorEffect="non-scaling-stroke" />}
        </g>

        {/* 3) 이름표 */}
        <g className="region-map-labels" fill={LABEL} aria-hidden="true">
          {MAP_SHAPES.map((shape) => {
            const isDaegu = shape.code === DAEGU_CODE
            if (isDaegu && showDistricts) return null // 확대하면 대구는 구·군 이름으로
            const fontSize = unit(isDaegu ? FONT.daegu : FONT.region)
            return (
              <text key={shape.code} className={isDaegu ? 'is-daegu' : undefined} x={shape.label[0]} y={shape.label[1] + fontSize * 0.35} fontSize={fontSize}>{mapLabel(shape)}</text>
            )
          })}
          <text className="is-province" x={PROVINCE_LABEL[0]} y={PROVINCE_LABEL[1] + unit(FONT.province) * 0.35} fontSize={unit(FONT.province)}>경상북도</text>
          {showDistricts && DAEGU_DISTRICTS.map((district) => (district.code === '27110' && zoom < JUNG_GU_ZOOM ? null : (
            <text key={district.code} className="is-district" x={district.label[0]} y={district.label[1] + unit(FONT.district) * 0.35} fontSize={unit(FONT.district)}>{district.name}</text>
          )))}
          <text className="is-dokdo" x={DOKDO_LABEL[0]} y={DOKDO_LABEL[1]} fontSize={unit(FONT.dokdo)}>독도</text>
        </g>

        {/* 4) 선택 핀 — 이름표 바로 위 */}
        {pinAt && (
          <g className="region-map-pin" aria-hidden="true" transform={`translate(${pinAt[0]} ${pinAt[1]}) scale(${unit(1)})`}>
            <path d="M0 0C-7-9-11-14.5-11-19.5a11 11 0 1 1 22 0C11-14.5 7-9 0 0Z" fill={PIN} />
            <circle cx="0" cy="-19.5" r="4" fill="#ffffff" />
          </g>
        )}
      </svg>
    </div>
  )
}

export default SvgRegionMap
