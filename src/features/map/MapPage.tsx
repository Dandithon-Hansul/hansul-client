import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { recipePath } from '../../app/paths'
import { useGoBack } from '../../app/useGoBack'
import { BackIcon, PinIcon } from '../../components/icons'
import { ApiError } from '../../lib/api/client'
import { getMapRegions, getRegionRecipes, type MapRegionSummary, type RegionRecipesResponse } from '../../lib/api/map'
import { KAKAO_MAP_KEY } from '../../lib/env'
import { findRegionByCode, formatRegion } from '../../lib/regions'
import KakaoRegionMap from './KakaoRegionMap'
import { toMapCode } from './mapRegionCode'
import { MAP_SHAPES } from './mapShapes'
import { GEO_ATTRIBUTION, LEVELS } from './mapStyle'
import RecipeThumb from './RecipeThumb'
import RegionRecipeSheet from './RegionRecipeSheet'
import SvgRegionMap from './SvgRegionMap'
import './map.css'

const regionTitle = (code: string) => formatRegion(findRegionByCode(code))

function errorText(error: unknown) {
  if (error instanceof ApiError && error.status !== 0) return error.message
  return '지도 정보를 불러오지 못했어요. 네트워크 상태를 확인해주세요.'
}

type RecipesState = { code: string; data?: RegionRecipesResponse; error?: unknown }

/**
 * [S-07] 지역의 맛 지도
 * 대구·경북 지도 → 지역 선택(확대 + 마커 + 색) → 하단 인기 레시피 카드 → 목록 팝업 → 레시피 상세
 * 선택한 지역은 주소(?region=47170)에 남겨서 상세에서 돌아와도 그대로
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [kakaoFailed, setKakaoFailed] = useState(false)

  // 지역별 레시피 수 (색 구분용)
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

  const topRegions = useMemo(
    () => [...counts.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 3),
    [counts],
  )

  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const select = useCallback((code: string) => {
    setSheetOpen(false)
    setParams({ region: code }, { replace: true })
  }, [setParams])

  const current = recipes && recipes.code === selected ? recipes : null
  const list = current?.data?.recipes ?? []
  const top = list[0]
  const useKakao = Boolean(KAKAO_MAP_KEY) && !kakaoFailed

  return (
    <main className="map-page">
      <header className="map-topbar">
        <button type="button" className="map-back" onClick={goBack} aria-label="뒤로"><BackIcon /></button>
        <h1>지역의 맛 지도</h1>
        <span aria-hidden="true" />
      </header>

      <section className="map-stage">
        {useKakao ? (
          <KakaoRegionMap
            appKey={KAKAO_MAP_KEY}
            counts={counts}
            selected={selected}
            onSelect={select}
            onFail={(error) => {
              console.warn('[지도] 카카오맵 대신 기본 지도로 표시합니다:', error.message)
              setKakaoFailed(true)
            }}
          />
        ) : (
          <SvgRegionMap counts={counts} selected={selected} onSelect={select} />
        )}

        <div className="map-legend" aria-label="레시피 수 범례">
          <span className="map-legend-title">레시피 수</span>
          {LEVELS.map((level) => (
            <span key={level.label} className="map-legend-item"><i style={{ background: level.fill }} />{level.label}</span>
          ))}
        </div>
        <p className="map-attribution">{GEO_ATTRIBUTION}</p>
        {kakaoFailed && <p className="map-notice">카카오맵을 불러오지 못해 기본 지도로 보여드려요.</p>}
      </section>

      <section className="map-panel" aria-live="polite">
        {regionsError ? (
          <div className="map-panel-message">
            <p>{errorText(regionsError)}</p>
            <button type="button" onClick={() => setRegionsTry((n) => n + 1)}>다시 불러오기</button>
          </div>
        ) : !selected ? (
          <div className="map-panel-intro">
            <h2>지역을 눌러 전승 음식을 찾아보세요</h2>
            <p>레시피가 많은 지역일수록 진하게 표시돼요.</p>
            {topRegions.length > 0 && (
              <div className="map-chips" aria-label="레시피가 많은 지역">
                {topRegions.map(([code, count]) => {
                  const shape = MAP_SHAPES.find((item) => item.code === code)
                  return <button key={code} type="button" onClick={() => select(code)}>{shape?.name} <b>{count}</b></button>
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="map-panel-head">
              <PinIcon className="map-panel-pin" />
              <h2>{regionTitle(selected)}</h2>
              {current?.data && <span>레시피 {list.length}개</span>}
            </div>
            {!current ? (
              <div className="map-top-card is-loading" aria-busy="true"><span className="map-thumb map-skeleton" style={{ width: 72, height: 72 }} /><span className="map-top-text"><span className="map-skeleton-line" /><span className="map-skeleton-line is-short" /></span></div>
            ) : current.error ? (
              <div className="map-panel-message">
                <p>{errorText(current.error)}</p>
                <button type="button" onClick={() => setRecipesTry((n) => n + 1)}>다시 불러오기</button>
              </div>
            ) : top ? (
              <button type="button" className="map-top-card" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
                <RecipeThumb recipe={top} size={72} />
                <span className="map-top-text">
                  <small className="map-top-kicker">이 지역 인기 1위</small>
                  <b>{top.title}</b>
                  <small>{findRegionByCode(selected)?.sigungu || '대구'} · {top.transmitter_name} 전승자</small>
                  <small className="map-recipe-reactions">좋아요 {top.like_count} · 저장 {top.save_count}</small>
                </span>
                <span className="map-top-more">{list.length > 1 ? `${list.length}개 모두 보기` : '보기'} ›</span>
              </button>
            ) : (
              <p className="map-panel-empty">아직 이 지역에 전승된 레시피가 없어요.</p>
            )}
          </>
        )}
      </section>

      {sheetOpen && selected && list.length > 0 && (
        <RegionRecipeSheet
          regionName={regionTitle(selected)}
          recipes={list}
          onClose={closeSheet}
          onPick={(recipe) => navigate(recipePath(recipe.recipe_id))}
        />
      )}
    </main>
  )
}

export default MapPage
