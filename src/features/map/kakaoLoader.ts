// 카카오맵 JavaScript SDK 를 필요할 때 한 번만 불러오기
// 키 발급: Kakao Developers → 내 애플리케이션 → 앱 키의 "JavaScript 키"
// 도메인 등록: 플랫폼 → Web → http://localhost:5173, 배포 주소 (등록 안 하면 SDK 가 거부함)

export type KakaoLatLng = { getLat(): number; getLng(): number }
export type KakaoLatLngBounds = { extend(latlng: KakaoLatLng): void }

export type KakaoPolygonOptions = {
  path: KakaoLatLng[] | KakaoLatLng[][]
  strokeWeight?: number
  strokeColor?: string
  strokeOpacity?: number
  fillColor?: string
  fillOpacity?: number
  zIndex?: number
}

export type KakaoMap = {
  setBounds(bounds: KakaoLatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
  relayout(): void
  addControl(control: object, position: number): void
}

export type KakaoPolygon = { setMap(map: KakaoMap | null): void; setOptions(options: Partial<KakaoPolygonOptions>): void }

export type KakaoOverlay = { setMap(map: KakaoMap | null): void; setPosition(latlng: KakaoLatLng): void }

export type KakaoMaps = {
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => KakaoLatLng
  LatLngBounds: new () => KakaoLatLngBounds
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap
  Polygon: new (options: KakaoPolygonOptions) => KakaoPolygon
  CustomOverlay: new (options: { position: KakaoLatLng; content: HTMLElement | string; yAnchor?: number; xAnchor?: number; zIndex?: number; clickable?: boolean }) => KakaoOverlay
  ZoomControl: new () => object
  ControlPosition: { RIGHT: number }
  event: { addListener(target: object, type: string, handler: () => void): void }
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps }
  }
}

const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js'
let loading: Promise<KakaoMaps> | null = null

export function loadKakaoMaps(appKey: string, timeoutMs = 8000): Promise<KakaoMaps> {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)
  if (loading) return loading

  loading = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`
    script.async = true
    const fail = (message: string) => {
      clearTimeout(timer)
      script.remove()
      loading = null
      reject(new Error(message))
    }
    const timer = setTimeout(() => fail('카카오맵 SDK 로딩 시간이 초과됐어요.'), timeoutMs)
    script.onload = () => {
      const maps = window.kakao?.maps
      if (!maps?.load) return fail('카카오맵 SDK 응답이 올바르지 않아요. (JavaScript 키·도메인 등록 확인)')
      maps.load(() => {
        clearTimeout(timer)
        resolve(maps)
      })
    }
    script.onerror = () => fail('카카오맵 SDK 를 불러오지 못했어요. (JavaScript 키·도메인 등록 확인)')
    document.head.appendChild(script)
  })
  return loading
}
