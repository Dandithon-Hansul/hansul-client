import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { MapRecipe } from '../../lib/api/map'
import RecipeThumb from './RecipeThumb'

type Props = {
  /** 시트 제목 ("안동 지역의 인기 레시피") */
  title: string
  /** 카드에 쓰는 지역 이름 ("안동시") */
  placeName: string
  recipes: MapRecipe[] | null
  /** 레시피를 못 불러왔을 때 안내 */
  error: string | null
  onRetry: () => void
  onPick: (recipe: MapRecipe) => void
  /** 접힌 상태에서 아래로 끌거나 Esc → 지역 선택 해제 */
  onClose: () => void
}

const SWIPE = 40 // px — 이만큼 끌면 펼치기·접기·닫기

function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
}
function BookmarkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16l-5-3.6L7 20Z" /></svg>
}

/**
 * [S-07] 지역 인기 레시피 바텀 시트 (Figma: "안동 지역의 인기 레시피")
 * - 접힘: 1위 카드 하나 / 카드를 누르거나 위로 끌면 펼쳐서 전체 목록 (레시피가 1개면 바로 상세)
 * - 펼침: 목록 스크롤, 레시피 누르면 상세 / 아래로 끌거나 Esc → 접힘
 * - 접힌 상태에서 아래로 끌거나 Esc → 시트 닫기 (지역 선택 해제)
 */
function RegionSheet({ title, placeName, recipes, error, onRetry, onPick, onClose }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const list = recipes ?? []
  const canExpand = list.length > 1

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (expanded) setExpanded(false)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, onClose])

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientY
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart.current !== null) setDragY(event.clientY - dragStart.current)
  }
  function endDrag() {
    if (dragStart.current === null) return
    dragStart.current = null
    const dy = dragY
    setDragY(0)
    if (dy < -SWIPE && canExpand) setExpanded(true)
    else if (dy > SWIPE) {
      if (expanded) setExpanded(false)
      else onClose()
    }
  }

  function pickCard(recipe: MapRecipe) {
    if (!expanded && canExpand) setExpanded(true) // 명세: 카드 탭 → 목록 팝업
    else onPick(recipe)
  }

  // 끄는 동안 손가락을 따라 움직임 (펼침 상태에서 위로는 더 안 올라감)
  const offset = expanded ? Math.max(0, dragY) : dragY
  return (
    <section
      className={`map-sheet${expanded ? ' is-expanded' : ''}${dragY ? ' is-dragging' : ''}`}
      aria-label={title}
      style={offset ? { transform: `translateY(${offset}px)` } : undefined}
    >
      <div className="map-sheet-grip" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <button
          type="button"
          className="map-sheet-handle"
          aria-label={expanded ? '목록 접기' : '목록 펼치기'}
          aria-expanded={expanded}
          disabled={!canExpand}
          onClick={() => setExpanded(!expanded)}
          onPointerDown={(event) => event.stopPropagation()}
        />
        <h2>{title}</h2>
      </div>

      <div className="map-sheet-body">
        {error ? (
          <div className="map-sheet-message">
            <p>{error}</p>
            <button type="button" onClick={onRetry}>다시 불러오기</button>
          </div>
        ) : !recipes ? (
          <div className="map-card is-loading" aria-busy="true">
            <span className="map-thumb map-skeleton" />
            <span className="map-card-text"><span className="map-skeleton-line" /><span className="map-skeleton-line is-short" /></span>
          </div>
        ) : list.length === 0 ? (
          <p className="map-sheet-empty">아직 이 지역에 전승된 레시피가 없어요.</p>
        ) : (
          <ol className="map-card-list">
            {(expanded ? list : list.slice(0, 1)).map((recipe) => (
              <li key={recipe.recipe_id}>
                <button type="button" className="map-card" onClick={() => pickCard(recipe)}>
                  <RecipeThumb recipe={recipe} />
                  <span className="map-card-text">
                    <b>{recipe.title}</b>
                    <small>{placeName} · {recipe.transmitter_name} 전승자</small>
                    <span className="map-card-reactions">
                      <span aria-label={`좋아요 ${recipe.like_count}`}><HeartIcon />{recipe.like_count}</span>
                      <span aria-label={`저장 ${recipe.save_count}`}><BookmarkIcon />{recipe.save_count}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

export default RegionSheet
