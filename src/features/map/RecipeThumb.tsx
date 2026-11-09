import { BowlIcon } from '../../components/icons'
import type { MapRecipe } from '../../lib/api/map'

/** 사진이 없을 때 배경 — 레시피 id 로 색을 정해서 매번 같은 색 (프로필 그리드와 같은 톤) */
const TONES = ['#8c7a62', '#a0694b', '#6e7b5e', '#9a8566', '#7d5e4a', '#b08a5a']
function toneOf(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

/** 레시피 대표 사진 (없으면 그릇 아이콘). 크기는 CSS(.map-thumb)에서 */
function RecipeThumb({ recipe }: { recipe: Pick<MapRecipe, 'recipe_id' | 'hero_image_url'> }) {
  return (
    <span className="map-thumb" style={recipe.hero_image_url ? undefined : { background: toneOf(recipe.recipe_id) }}>
      {recipe.hero_image_url ? <img src={recipe.hero_image_url} alt="" /> : <BowlIcon className="map-thumb-icon" />}
    </span>
  )
}

export default RecipeThumb
