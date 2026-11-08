import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CloseIcon } from '../../components/icons'
import type { MapRecipe } from '../../lib/api/map'
import RecipeThumb from './RecipeThumb'

type Props = {
  /** 팝업 상단 지역명 ("경상북도 · 안동시") */
  regionName: string
  recipes: MapRecipe[]
  onClose: () => void
  onPick: (recipe: MapRecipe) => void
}

const CLOSE_DISTANCE = 90 // px — 이만큼 아래로 끌면 닫힘

/**
 * [S-07] 지역별 인기 레시피 팝업 (바텀 시트)
 * - 내부 스크롤 / 손잡이를 아래로 끌면 닫힘 / 바깥·X·Esc 로 닫힘
 */
function RegionRecipeSheet({ regionName, recipes, onClose, onPick }: Props) {
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  // 열리면 닫기 버튼에 포커스 (키보드·스크린리더 사용자가 팝업 안에서 시작)
  useEffect(() => closeButton.current?.focus(), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientY
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return
    setDragY(Math.max(0, event.clientY - dragStart.current))
  }
  function endDrag() {
    if (dragStart.current === null) return
    dragStart.current = null
    if (dragY > CLOSE_DISTANCE) onClose()
    else setDragY(0)
  }

  return (
    <div className="map-sheet-overlay" role="presentation" onClick={onClose}>
      <section
        className={`map-sheet${dragY ? ' is-dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${regionName} 인기 레시피`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="map-sheet-grip" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <span className="map-sheet-handle" aria-hidden="true" />
          <div className="map-sheet-head">
            <h2>{regionName}</h2>
            <p>인기 레시피 {recipes.length}개</p>
          </div>
          <button ref={closeButton} type="button" className="map-sheet-close" aria-label="닫기" onClick={onClose} onPointerDown={(event) => event.stopPropagation()}><CloseIcon /></button>
        </div>

        <ol className="map-sheet-list">
          {recipes.map((recipe, index) => (
            <li key={recipe.recipe_id}>
              <button type="button" className="map-recipe-row" onClick={() => onPick(recipe)}>
                <span className="map-recipe-rank">{index + 1}</span>
                <RecipeThumb recipe={recipe} size={64} />
                <span className="map-recipe-text">
                  <b>{recipe.title}</b>
                  <small>{recipe.transmitter_name} 전승자</small>
                  <small className="map-recipe-reactions">좋아요 {recipe.like_count} · 저장 {recipe.save_count}</small>
                </span>
                <span className="map-recipe-chevron" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

export default RegionRecipeSheet
