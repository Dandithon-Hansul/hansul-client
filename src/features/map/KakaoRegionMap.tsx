import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps, type KakaoLatLngBounds, type KakaoMap, type KakaoMaps, type KakaoOverlay, type KakaoPolygon } from './kakaoLoader'
import { BORDER, fillFor, GEO_URL, mapLabel, SELECTED_FILL, SELECTED_STROKE } from './mapStyle'
import { MAP_SHAPES } from './mapShapes'
import type { RegionMapProps } from './regionMapProps'

const ULLEUNG = '47940'

type GeoJson = {
  features: Array<{ properties: { code: string; name: string }; geometry: { type: 'MultiPolygon'; coordinates: number[][][][] } }>
}

type Ready = {
  maps: KakaoMaps
  map: KakaoMap
  regions: Map<string, { polygons: KakaoPolygon[]; bounds: KakaoLatLngBounds }>
  mainland: KakaoLatLngBounds
  marker: KakaoOverlay
}

type Props = RegionMapProps & {
  appKey: string
  /** SDK·경계 파일을 못 불러오면 호출 → 부모가 SVG 지도로 바꿈 */
  onFail: (error: Error) => void
}

/**
 * 카카오맵 위에 시·군 경계(폴리곤)를 겹쳐 그리는 지도 (API 명세서 10: Kakao Maps + GeoJSON 오버레이)
 * VITE_KAKAO_MAP_KEY 가 있을 때만 사용. 실패하면 onFail 로 SVG 지도에 넘김
 */
function KakaoRegionMap({ counts, selected, onSelect, appKey, onFail }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState<Ready | null>(null)
  const onSelectRef = useRef(onSelect)
  const onFailRef = useRef(onFail)
  useEffect(() => {
    onSelectRef.current = onSelect
    onFailRef.current = onFail
  })

  // 1) SDK + 경계 파일 불러와서 지도·폴리곤·이름표 만들기
  useEffect(() => {
    const request = { alive: true }
    const geo = fetch(GEO_URL).then((response) => {
      if (!response.ok) throw new Error(`경계 파일을 불러오지 못했어요. (${response.status})`)
      return response.json() as Promise<GeoJson>
    })
    Promise.all([loadKakaoMaps(appKey), geo])
      .then(([maps, data]) => {
        if (!request.alive || !container.current) return
        const map = new maps.Map(container.current, { center: new maps.LatLng(36.3, 128.7), level: 11 })
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT)
        const mainland = new maps.LatLngBounds()
        const regions: Ready['regions'] = new Map()

        for (const feature of data.features) {
          const { code } = feature.properties
          const bounds = new maps.LatLngBounds()
          const polygons = feature.geometry.coordinates.map((polygon) => {
            const path = polygon.map((ring) => ring.map(([lng, lat]) => {
              const point = new maps.LatLng(lat, lng)
              bounds.extend(point)
              if (code !== ULLEUNG) mainland.extend(point)
              return point
            }))
            const shape = new maps.Polygon({ path: path.length === 1 ? path[0] : path, strokeWeight: 1, strokeColor: BORDER, strokeOpacity: 1, fillColor: fillFor(0), fillOpacity: 0.8 })
            shape.setMap(map)
            maps.event.addListener(shape, 'click', () => onSelectRef.current(code))
            return shape
          })
          regions.set(code, { polygons, bounds })

          const info = MAP_SHAPES.find((shape) => shape.code === code)
          if (info) {
            const label = document.createElement('span')
            label.className = 'kakao-region-label'
            label.textContent = mapLabel(info)
            new maps.CustomOverlay({ position: new maps.LatLng(info.center[0], info.center[1]), content: label, yAnchor: 0.5, clickable: false }).setMap(map)
          }
        }

        const pin = document.createElement('div')
        pin.className = 'kakao-region-pin'
        pin.innerHTML = '<svg viewBox="0 0 28 36" aria-hidden="true"><path d="M14 36C5 24 0 17 0 12a14 14 0 1 1 28 0c0 5-5 12-14 24Z"/><circle cx="14" cy="12" r="5"/></svg>'
        const marker = new maps.CustomOverlay({ position: new maps.LatLng(36.3, 128.7), content: pin, yAnchor: 1, zIndex: 3 })

        map.setBounds(mainland)
        setReady({ maps, map, regions, mainland, marker })
      })
      .catch((error: unknown) => {
        if (request.alive) onFailRef.current(error instanceof Error ? error : new Error(String(error)))
      })
    return () => {
      request.alive = false
    }
  }, [appKey])

  // 2) 레시피 수에 따른 색 + 선택한 지역 강조·확대·마커
  useEffect(() => {
    if (!ready) return
    for (const [code, region] of ready.regions) {
      const isSelected = code === selected
      for (const polygon of region.polygons) {
        polygon.setOptions({
          fillColor: isSelected ? SELECTED_FILL : fillFor(counts.get(code)),
          strokeColor: isSelected ? SELECTED_STROKE : BORDER,
          strokeWeight: isSelected ? 3 : 1,
          zIndex: isSelected ? 2 : 1,
        })
      }
    }
    const region = selected ? ready.regions.get(selected) : undefined
    const info = MAP_SHAPES.find((shape) => shape.code === selected)
    if (region && info) {
      ready.map.setBounds(region.bounds, 40, 40, 40, 40)
      ready.marker.setPosition(new ready.maps.LatLng(info.center[0], info.center[1]))
      ready.marker.setMap(ready.map)
    } else {
      ready.marker.setMap(null)
      ready.map.setBounds(ready.mainland)
    }
  }, [ready, counts, selected])

  // 3) 화면 크기가 바뀌면 지도 다시 맞추기
  useEffect(() => {
    if (!ready) return
    const relayout = () => ready.map.relayout()
    window.addEventListener('resize', relayout)
    return () => window.removeEventListener('resize', relayout)
  }, [ready])

  return (
    <div className="region-map">
      <div ref={container} className="region-map-kakao" role="application" aria-label="대구·경북 지역 지도 (카카오맵)" />
      {!ready && <p className="region-map-loading">지도를 불러오는 중…</p>}
    </div>
  )
}

export default KakaoRegionMap
