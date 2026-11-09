import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { recipePath } from '../../app/paths'
import { useGoBack } from '../../app/useGoBack'
import { BackIcon } from '../../components/icons'
import { ApiError } from '../../lib/api/client'
import { getMapRegions, getRegionRecipes, type MapRegionSummary, type RegionRecipesResponse } from '../../lib/api/map'
import { KAKAO_MAP_KEY } from '../../lib/env'
import KakaoRegionMap from './KakaoRegionMap'
import { toMapCode } from './mapRegionCode'
import { MAP_SHAPES } from './mapShapes'
import { GEO_ATTRIBUTION, shortName } from './mapStyle'
import RegionSheet from './RegionSheet'
import SvgRegionMap from './SvgRegionMap'
import './map.css'

// 지도를 가리는 영역 (px) — 지도는 그 사이 가운데에 맞춰짐
const TOP_INSET = 56 // 뒤로가기 줄
const NAV_INSET = 200 // 하단 메뉴 (홈·지도·마이크) + Figma 처럼 지도를 위쪽에 두는 여백
const SHEET_INSET = 236 // 접힌 인기 레시피 시트

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status !== 0) return error.message
  return '지도 정보를 불러오지 못했어요. 네트워크 상태를 확인해주세요.'
}

type RecipesState = { code: string; data?: RegionRecipesResponse; error?: unknown }

/** 홈과 같은 하단 메뉴 (홈 화면 스타일 재사용, 지도 버튼이 선택된 상태) */
function MapBottomNav() {
  const navigate = useNavigate()
  return (
    <nav className="home-bottom-nav" aria-label="하단 메뉴">
      <div className="home-nav-pills">
        <button className="home-nav-button" type="button" aria-label="홈" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.8v-6h-5.4v6H4.5A1.5 1.5 0 0 1 3 19.5z" fill="currentColor"/></svg>
        </button>
        <button className="home-nav-button is-active" type="button" aria-label="지역 지도" aria-current="page">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.2"/></svg>
        </button>
      </div>
      <button className="home-record-button" type="button" aria-label="음성 기록하기" onClick={() => navigate('/record')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg>
      </button>
    </nav>
  )
}

/**
 * [S-07] 지역 지도 (Figma 지도 화면)
 * 처음: 대구·경북 지도 + 하단 메뉴 → 지역 선택: 확대 + 회색 테두리 + 핀, 하단 인기 레시피 시트
 * → 카드 누르면 목록 펼침 → 레시피 누르면 상세. 선택한 지역은 주소(?region=47170)에 남김
 */
function MapPage() {
  const goBack = useGoBack('/')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selected = toMapCode(params.get('region'))

  const [regions, setRegions] = useState<MapRegionSummary[] | null>(null)
  const [regionsError, setRegionsError] = useState<unknown>(null)
  const [regionsTry, setRegionsTry] = useState(0)
  const [recipes, setRecipes] = useState<RecipesState | null>(null)
  const [recipesTry, setRecipesTry] = useState(0)
  const [kakaoFailed, setKakaoFailed] = useState(false)

  // 지역별 레시피 수 (화면 낭독기 안내 "안동시, 레시피 4개")
  useEffect(() => {
    const request = { alive: true }
    getMapRegions()
      .then((response) => {
        if (!request.alive) return
        setRegions(response.regions)
        setRegionsError(null)
      })
      .catch((error: unknown) => request.alive && setRegionsError(error))
    return () => {
      request.alive = false
    }
  }, [regionsTry])

  // 선택한 지역의 인기 레시피
  useEffect(() => {
    if (!selected) return
    const request = { alive: true }
    getRegionRecipes(selected, 10)
      .then((data) => request.alive && setRecipes({ code: selected, data }))
      .catch((error: unknown) => request.alive && setRecipes({ code: selected, error }))
    return () => {
      request.alive = false
    }
  }, [selected, recipesTry])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const region of regions ?? []) {
      const code = toMapCode(region.region_code)
      if (code) map.set(code, (map.get(code) ?? 0) + region.recipe_count)
    }
    return map
  }, [regions])

  const select = useCallback((code: string) => setParams({ region: code }, { replace: true }), [setParams])
  const clearSelection = useCallback(() => setParams({}, { replace: true }), [setParams])

  const shape = MAP_SHAPES.find((item) => item.code === selected)
  const current = recipes && recipes.code === selected ? recipes : null
  const insets = { top: TOP_INSET, bottom: selected ? SHEET_INSET : NAV_INSET }
  const useKakao = Boolean(KAKAO_MAP_KEY) && !kakaoFailed

  return (
    <main className={`map-page${selected ? ' has-selection' : ''}`}>
      <h1 className="sr-only">지역 지도</h1>
      <section className="map-stage">
        {useKakao ? (
          <KakaoRegionMap
            appKey={KAKAO_MAP_KEY}
            counts={counts}
            selected={selected}
            onSelect={select}
            insets={insets}
            onFail={(error) => {
              console.warn('[지도] 카카오맵 대신 기본 지도로 표시합니다:', error.message)
              setKakaoFailed(true)
            }}
          />
        ) : (
          <SvgRegionMap counts={counts} selected={selected} onSelect={select} insets={insets} />
        )}
      </section>

      <button type="button" className="map-back" onClick={goBack} aria-label="뒤로"><BackIcon /></button>
      <p className="map-attribution">{GEO_ATTRIBUTION}</p>
      {kakaoFailed && <p className="map-notice">카카오맵을 불러오지 못해 기본 지도로 보여드려요.</p>}
      {regionsError !== null && (
        <div className="map-notice is-error" role="alert">
          <span>{errorText(regionsError)}</span>
          <button type="button" onClick={() => setRegionsTry((n) => n + 1)}>다시 시도</button>
        </div>
      )}

      {selected && shape ? (
        <RegionSheet
          key={selected}
          title={`${shortName(shape.name)} 지역의 인기 레시피`}
          placeName={shape.name}
          recipes={current?.data?.recipes ?? null}
          error={current?.error ? errorText(current.error) : null}
          onRetry={() => setRecipesTry((n) => n + 1)}
          onPick={(recipe) => navigate(recipePath(recipe.recipe_id))}
          onClose={clearSelection}
        />
      ) : (
        <MapBottomNav />
      )}
    </main>
  )
}

export default MapPage
