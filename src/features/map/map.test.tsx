import { act, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { districtsOf, SIDO_NAMES } from '../../lib/regions'
import { MOCK_MAP_RECIPES } from '../../lib/mock/mockMap'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'
import type { KakaoMaps } from './kakaoLoader'
import KakaoRegionMap from './KakaoRegionMap'
import { toMapCode } from './mapRegionCode'
import { MAP_SHAPES } from './mapShapes'
import { SELECTED_FILL } from './mapStyle'

const region = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, 레시피`) })

describe('지역 지도 화면', () => {
  it('홈의 지도 버튼으로 들어가면 대구·경북 23개 지역과 안내를 보여준다', async () => {
    loginAsDemo()
    const user = renderApp('/')
    await user.click(await screen.findByRole('button', { name: '지역 지도' }))
    expect(await screen.findByRole('heading', { name: '지역의 맛 지도' })).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent(/^\/map$/)
    const map = screen.getByRole('group', { name: '대구·경북 지역 지도' })
    expect(within(map).getAllByRole('button')).toHaveLength(23)
    expect(screen.getByText('지역을 눌러 전승 음식을 찾아보세요')).toBeInTheDocument()
    // 레시피 수가 오면 지역 이름표에 개수가 붙고, 많은 지역 바로가기가 생김
    expect(await screen.findByRole('button', { name: '안동시, 레시피 4개' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('레시피가 많은 지역')).getAllByRole('button')).toHaveLength(3)
  })

  it('지역을 누르면 선택 표시·주소가 바뀌고 하단에 인기 1위 레시피 카드가 나온다', async () => {
    loginAsDemo()
    const user = renderApp('/map')
    await user.click(await screen.findByRole('button', { name: '안동시, 레시피 4개' }))
    expect(currentPath()).toHaveTextContent('/map?region=47170')
    expect(region('안동시')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: '경상북도 · 안동시' })).toBeInTheDocument()
    const card = await screen.findByRole('button', { name: /안동 찜닭/ })
    expect(card).toHaveTextContent('이 지역 인기 1위')
    expect(card).toHaveTextContent('김한술 전승자')
    expect(card).toHaveTextContent('좋아요 204 · 저장 133')
    expect(screen.getByText('레시피 4개')).toBeInTheDocument()
  })

  it('카드를 누르면 인기 레시피 목록 팝업이 열리고, 레시피를 누르면 상세로 간다', async () => {
    loginAsDemo()
    const user = renderApp('/map?region=47170')
    await user.click(await screen.findByRole('button', { name: /안동 찜닭/ }))
    const sheet = screen.getByRole('dialog', { name: '경상북도 · 안동시 인기 레시피' })
    const rows = within(sheet).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('안동 찜닭'),
      expect.stringContaining('헛제삿밥'),
      expect.stringContaining('간고등어 조림'),
      expect.stringContaining('건진국수'),
    ])
    await user.click(within(sheet).getByRole('button', { name: /헛제삿밥/ }))
    expect(currentPath()).toHaveTextContent(`/recipe?id=${MOCK_MAP_RECIPES['47170'].recipes[1].recipe_id}`)
  })

  it('팝업은 닫기 버튼과 Esc 로 닫힌다', async () => {
    loginAsDemo()
    const user = renderApp('/map?region=27000')
    await user.click(await screen.findByRole('button', { name: /대구식 육개장/ }))
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /대구식 육개장/ }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('레시피가 없는 지역은 빈 안내를 보여준다', async () => {
    loginAsDemo()
    renderApp('/map?region=47150')
    expect(await screen.findByText('아직 이 지역에 전승된 레시피가 없어요.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '경상북도 · 김천시' })).toBeInTheDocument()
  })

  it('주소에 대구 구 코드나 없는 코드가 와도 화면이 깨지지 않는다', async () => {
    loginAsDemo()
    renderApp('/map?region=27260') // 수성구 → 대구광역시
    expect(await screen.findByRole('heading', { name: '대구광역시' })).toBeInTheDocument()
  })

  it('로그인하지 않으면 로그인 화면으로 보낸다', async () => {
    renderApp('/map')
    expect(await screen.findByPlaceholderText('아이디 입력')).toBeInTheDocument()
  })
})

describe('지도 데이터', () => {
  it('온보딩 지역 목록(대구 1 + 경북 22)과 지도 경계가 정확히 같다', () => {
    const listed = SIDO_NAMES.flatMap(districtsOf).map((item) => item.code).sort()
    expect(MAP_SHAPES.map((shape) => shape.code).sort()).toEqual(listed)
    expect(Object.keys(MOCK_MAP_RECIPES).sort()).toEqual(listed)
  })

  it('지역 코드를 지도 코드로 맞춘다', () => {
    expect(toMapCode('47170')).toBe('47170')
    expect(toMapCode('27110')).toBe('27000') // 대구 중구 → 대구
    expect(toMapCode('27720')).toBe('27000') // 군위군(2023 대구 편입)
    expect(toMapCode('11110')).toBeNull() // 서울 — 지도 밖
    expect(toMapCode('')).toBeNull()
  })
})

describe('카카오맵 모드', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.kakao
  })

  /** 실제 SDK 대신 호출만 기록하는 가짜 카카오맵 */
  function fakeKakao() {
    type Options = Record<string, unknown>
    const polygons: Array<{ options: Options; setOptions: Mock<(options: Options) => void>; click?: () => void }> = []
    const setBounds = vi.fn()
    const maps = {
      load: (callback: () => void) => callback(),
      LatLng: class {
        lat: number
        lng: number
        constructor(lat: number, lng: number) {
          this.lat = lat
          this.lng = lng
        }
        getLat() { return this.lat }
        getLng() { return this.lng }
      },
      LatLngBounds: class { extend() {} },
      Map: class { setBounds = setBounds; relayout() {} addControl() {} },
      Polygon: class {
        record: (typeof polygons)[number]
        constructor(options: Record<string, unknown>) {
          this.record = { options, setOptions: vi.fn<(options: Options) => void>() }
          polygons.push(this.record)
        }
        setMap() {}
        setOptions(options: Record<string, unknown>) { this.record.setOptions(options) }
      },
      CustomOverlay: class { setMap() {} setPosition() {} },
      ZoomControl: class {},
      ControlPosition: { RIGHT: 1 },
      event: {
        addListener: (target: { record: (typeof polygons)[number] }, _type: string, handler: () => void) => {
          target.record.click = handler
        },
      },
    }
    window.kakao = { maps: maps as unknown as KakaoMaps }
    return { polygons, setBounds }
  }

  it('경계 파일로 지역마다 폴리곤을 만들고, 누르면 선택·선택하면 색과 확대가 바뀐다', async () => {
    const { polygons, setBounds } = fakeKakao()
    const geo = await import('../../../public/geo/daegu-gyeongbuk.geojson?raw').then((module) => JSON.parse(module.default))
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(geo))))
    const onSelect = vi.fn()
    const onFail = vi.fn()
    const counts = new Map([['47170', 4]])
    const { rerender } = render(<KakaoRegionMap appKey="test" counts={counts} selected={null} onSelect={onSelect} onFail={onFail} />)

    await waitFor(() => expect(screen.queryByText('지도를 불러오는 중…')).not.toBeInTheDocument())
    expect(onFail).not.toHaveBeenCalled()
    // 울릉군은 울릉도·독도 등 여러 조각이라 폴리곤이 지역 수보다 많음
    expect(polygons.length).toBeGreaterThanOrEqual(23)

    const andongIndex = geo.features.findIndex((feature: { properties: { code: string } }) => feature.properties.code === '47170')
    act(() => polygons[andongIndex].click?.())
    expect(onSelect).toHaveBeenCalledWith('47170')

    setBounds.mockClear()
    rerender(<KakaoRegionMap appKey="test" counts={counts} selected="47170" onSelect={onSelect} onFail={onFail} />)
    expect(polygons[andongIndex].setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ fillColor: SELECTED_FILL }))
    expect(setBounds).toHaveBeenCalledTimes(1)
  })

  it('경계 파일을 못 받으면 onFail 로 알려 기본 지도로 바꾸게 한다', async () => {
    fakeKakao()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const onFail = vi.fn()
    render(<KakaoRegionMap appKey="test" counts={new Map()} selected={null} onSelect={vi.fn()} onFail={onFail} />)
    await waitFor(() => expect(onFail).toHaveBeenCalledTimes(1))
  })
})
