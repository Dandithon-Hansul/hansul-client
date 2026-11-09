import { act, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { districtsOf, SIDO_NAMES } from '../../lib/regions'
import { MOCK_MAP_RECIPES } from '../../lib/mock/mockMap'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'
import type { KakaoMaps } from './kakaoLoader'
import KakaoRegionMap from './KakaoRegionMap'
import { toMapCode } from './mapRegionCode'
import { MAP_SHAPES } from './mapShapes'
import { GB_FILL, SELECTED_BORDER, SELECTED_FILL, shortName } from './mapStyle'

const region = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, 레시피`) })
const sheet = (name: string) => screen.getByRole('region', { name: `${name} 지역의 인기 레시피` })
/** 로그인·프로필 확인이 끝나고 지도 화면이 뜰 때까지 기다림 */
const findSheet = (name: string) => screen.findByRole('region', { name: `${name} 지역의 인기 레시피` })

describe('지역 지도 화면 (Figma)', () => {
  it('홈의 지도 버튼으로 들어가면 23개 지역 지도와 하단 메뉴(지도 선택됨)를 보여준다', async () => {
    loginAsDemo()
    const user = renderApp('/')
    await user.click(await screen.findByRole('button', { name: '지역 지도' }))
    expect(await screen.findByRole('group', { name: '대구·경북 지역 지도' })).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent(/^\/map$/)
    expect(within(screen.getByRole('group', { name: '대구·경북 지역 지도' })).getAllByRole('button')).toHaveLength(23)
    expect(screen.getByRole('button', { name: '지역 지도' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('region', { name: /인기 레시피/ })).not.toBeInTheDocument()
    // 지역별 레시피 수는 화면 낭독기 안내에 들어감
    expect(await screen.findByRole('button', { name: '안동시, 레시피 4개' })).toBeInTheDocument()
  })

  it('지역을 누르면 선택·주소가 바뀌고, 하단 메뉴 대신 "안동 지역의 인기 레시피" 시트에 1위 카드가 나온다', async () => {
    loginAsDemo()
    const user = renderApp('/map')
    await user.click(await screen.findByRole('button', { name: '안동시, 레시피 4개' }))
    expect(currentPath()).toHaveTextContent('/map?region=47170')
    expect(region('안동시')).toHaveAttribute('aria-pressed', 'true')
    // 디자인 요청: 빨간 핀과 함께 고른 구역 색이 바뀜 (다른 지역은 그대로)
    expect(region('안동시').querySelector('path')).toHaveAttribute('fill', SELECTED_FILL)
    expect(region('영주시').querySelector('path')).toHaveAttribute('fill', GB_FILL)
    expect(screen.queryByRole('navigation', { name: '하단 메뉴' })).not.toBeInTheDocument()
    const panel = sheet('안동')
    const card = await within(panel).findByRole('button', { name: /안동 찜닭/ })
    expect(card).toHaveTextContent('안동시 · 김한술 전승자')
    expect(within(card).getByLabelText('좋아요 204')).toBeInTheDocument()
    expect(within(card).getByLabelText('저장 133')).toBeInTheDocument()
    expect(within(panel).getAllByRole('listitem')).toHaveLength(1)
  })

  it('카드를 누르면 목록이 펼쳐지고, 레시피를 누르면 상세로 간다', async () => {
    loginAsDemo()
    const user = renderApp('/map?region=47170')
    await user.click(await within(await findSheet('안동')).findByRole('button', { name: /안동 찜닭/ }))
    const items = within(sheet('안동')).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('안동 찜닭'),
      expect.stringContaining('헛제삿밥'),
      expect.stringContaining('간고등어 조림'),
      expect.stringContaining('건진국수'),
    ])
    expect(screen.getByRole('button', { name: '목록 접기' })).toHaveAttribute('aria-expanded', 'true')
    await user.click(within(sheet('안동')).getByRole('button', { name: /헛제삿밥/ }))
    expect(currentPath()).toHaveTextContent(`/recipe?id=${MOCK_MAP_RECIPES['47170'].recipes[1].recipe_id}`)
  })

  it('레시피가 하나뿐인 지역은 카드를 누르면 바로 상세로 간다', async () => {
    loginAsDemo()
    const user = renderApp('/map?region=47130')
    await user.click(await within(await findSheet('경주')).findByRole('button', { name: /경주 쌈밥/ }))
    expect(currentPath()).toHaveTextContent(`/recipe?id=${MOCK_MAP_RECIPES['47130'].recipes[0].recipe_id}`)
  })

  it('Esc 를 누르면 펼친 목록 → 접힘 → 시트 닫힘(선택 해제, 하단 메뉴 다시 표시) 순서로 돌아간다', async () => {
    loginAsDemo()
    const user = renderApp('/map?region=27000')
    await user.click(await within(await findSheet('대구')).findByRole('button', { name: /대구식 육개장/ }))
    expect(within(sheet('대구')).getAllByRole('listitem')).toHaveLength(4)
    await user.keyboard('{Escape}')
    expect(within(sheet('대구')).getAllByRole('listitem')).toHaveLength(1)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: /인기 레시피/ })).not.toBeInTheDocument()
    expect(currentPath()).toHaveTextContent(/^\/map$/)
    expect(screen.getByRole('navigation', { name: '하단 메뉴' })).toBeInTheDocument()
  })

  it('손잡이 버튼으로 목록을 펼치고 접는다', async () => {
    loginAsDemo()
    const user = renderApp('/map?region=47110')
    await within(await findSheet('포항')).findByRole('button', { name: /포항 물회/ })
    await user.click(screen.getByRole('button', { name: '목록 펼치기' }))
    expect(within(sheet('포항')).getAllByRole('listitem')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: '목록 접기' }))
    expect(within(sheet('포항')).getAllByRole('listitem')).toHaveLength(1)
  })

  it('레시피가 없는 지역은 빈 안내를 보여준다', async () => {
    loginAsDemo()
    renderApp('/map?region=47150')
    expect(await within(await findSheet('김천')).findByText('아직 이 지역에 전승된 레시피가 없어요.')).toBeInTheDocument()
  })

  it('주소에 대구 구 코드가 와도 대구로 보여준다', async () => {
    loginAsDemo()
    renderApp('/map?region=27260') // 수성구 → 대구광역시
    expect(await within(await findSheet('대구')).findByRole('button', { name: /대구식 육개장/ })).toBeInTheDocument()
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

  it('시트 제목용 짧은 이름을 만든다', () => {
    expect(shortName('안동시')).toBe('안동')
    expect(shortName('울릉군')).toBe('울릉')
    expect(shortName('대구광역시')).toBe('대구')
  })
})

const INSETS = { top: 56, bottom: 112 }

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
    const overlays: Array<{ content: unknown; setMap: Mock<(map: unknown) => void> }> = []
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
      CustomOverlay: class {
        record: (typeof overlays)[number]
        constructor(options: { content: unknown }) {
          this.record = { content: options.content, setMap: vi.fn<(map: unknown) => void>() }
          overlays.push(this.record)
        }
        setMap(map: unknown) { this.record.setMap(map) }
        setPosition() {}
      },
      ZoomControl: class {},
      ControlPosition: { RIGHT: 1 },
      event: {
        addListener: (target: { record: (typeof polygons)[number] }, _type: string, handler: () => void) => {
          target.record.click = handler
        },
      },
    }
    window.kakao = { maps: maps as unknown as KakaoMaps }
    return { polygons, setBounds, overlays }
  }

  it('경계 파일로 지역마다 폴리곤을 만들고, 누르면 선택·선택하면 확대 + 구역 색 변경 + 빨간 핀', async () => {
    const { polygons, setBounds, overlays } = fakeKakao()
    const geo = await import('../../../public/geo/daegu-gyeongbuk.geojson?raw').then((module) => JSON.parse(module.default))
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(geo))))
    const onSelect = vi.fn()
    const onFail = vi.fn()
    const counts = new Map([['47170', 4]])
    const { rerender } = render(<KakaoRegionMap appKey="test" counts={counts} selected={null} onSelect={onSelect} onFail={onFail} insets={INSETS} />)

    await waitFor(() => expect(screen.queryByText('지도를 불러오는 중…')).not.toBeInTheDocument())
    expect(onFail).not.toHaveBeenCalled()
    // 울릉군은 울릉도·독도 등 여러 조각이라 폴리곤이 지역 수보다 많음
    expect(polygons.length).toBeGreaterThanOrEqual(23)

    const andongIndex = geo.features.findIndex((feature: { properties: { code: string } }) => feature.properties.code === '47170')
    act(() => polygons[andongIndex].click?.())
    expect(onSelect).toHaveBeenCalledWith('47170')

    setBounds.mockClear()
    rerender(<KakaoRegionMap appKey="test" counts={counts} selected="47170" onSelect={onSelect} onFail={onFail} insets={INSETS} />)
    // 고른 구역 색·테두리가 바뀌고 핀이 지도에 올라감
    expect(polygons[andongIndex].setOptions).toHaveBeenLastCalledWith(expect.objectContaining({ fillColor: SELECTED_FILL, strokeColor: SELECTED_BORDER }))
    const pin = overlays.find((overlay) => overlay.content instanceof HTMLElement && overlay.content.className === 'kakao-region-pin')
    expect(pin?.setMap).toHaveBeenLastCalledWith(expect.anything())
    expect(setBounds).toHaveBeenCalledTimes(1)
  })

  it('경계 파일을 못 받으면 onFail 로 알려 기본 지도로 바꾸게 한다', async () => {
    fakeKakao()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const onFail = vi.fn()
    render(<KakaoRegionMap appKey="test" counts={new Map()} selected={null} onSelect={vi.fn()} onFail={onFail} insets={INSETS} />)
    await waitFor(() => expect(onFail).toHaveBeenCalledTimes(1))
  })
})
