import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { recipePath } from '../../app/paths'
import { BowlIcon } from '../../components/icons'
import { useCursorList } from '../../hooks/useCursorList'
import type { CursorPage, RecipeThumb } from '../../lib/api/types'
import { errorText } from './useMyProfile'

/** 사진이 없을 때 칸 배경 — 레시피 id 로 색을 정해서 매번 같은 색 */
const TONES = ['#8c7a62', '#a0694b', '#6e7b5e', '#9a8566', '#7d5e4a', '#b08a5a']
function toneOf(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

type Props<T extends RecipeThumb> = {
  fetcher: (cursor: string | null) => Promise<CursorPage<T>>
  empty: ReactNode
}

/** 3열 레시피 그리드 + 무한 스크롤 (나의 레시피·저장한 맛·다른 사용자 레시피 공용) */
function RecipeGrid<T extends RecipeThumb>({ fetcher, empty }: Props<T>) {
  const { items, hasMore, loading, loaded, error, sentinelRef, retry } = useCursorList(fetcher)

  if (!loaded) {
    return <div className="recipe-grid" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <span className="recipe-tile is-skeleton" key={index} />)}</div>
  }
  if (error && items.length === 0) {
    return (
      <div className="profile-message">
        <p>{errorText(error)}</p>
        <button type="button" onClick={() => void retry()}>다시 불러오기</button>
      </div>
    )
  }
  if (items.length === 0) return <>{empty}</>

  return (
    <>
      <ul className="recipe-grid">
        {items.map((recipe) => (
          <li key={recipe.recipe_id}>
            <Link className="recipe-tile" to={recipePath(recipe.recipe_id)} aria-label={recipe.title}>
              {recipe.hero_image_url
                ? <img src={recipe.hero_image_url} alt="" loading="lazy" />
                : <span className="recipe-tile-empty" style={{ background: toneOf(recipe.recipe_id) }}><BowlIcon /></span>}
              <span className="recipe-tile-title">{recipe.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && <div ref={sentinelRef} className="h-10" />}
      {loading && <p className="profile-loading-more">불러오는 중…</p>}
    </>
  )
}

export default RecipeGrid
