import { IS_MOCK } from '../env'
import { apiFetch } from './client'

export type HomeRecipe = {
  recipe_id: string
  title: string
  hero_image_url: string | null
  rank?: number
  region_tag?: string
  transmitter_name?: string
  transmitter_quote?: string
  like_count?: number
  save_count?: number
  is_liked?: boolean
  is_saved?: boolean
}

export type HomeFeed = {
  greeting_name: string
  top_recipes: HomeRecipe[]
  recommended: HomeRecipe[]
  next_cursor: string | null
}

export type RecipeSearchResult = Pick<HomeRecipe, 'recipe_id' | 'title' | 'hero_image_url'> & {
  transmitter_name: string
  region_tag: string
  like_count: number
}

type RecipeSearchResponse = { recipes: RecipeSearchResult[]; next_cursor: string | null }

const mockFeed: HomeFeed = {
  greeting_name: '한술',
  top_recipes: [{ recipe_id: 'r-andong-jjimdak', title: '안동 찜닭', hero_image_url: '/images/andong-jjimdak.png', rank: 1 }],
  recommended: [{
    recipe_id: 'r-daegu-yukgaejang', title: '대구식 육개장', hero_image_url: '/images/daegu-yukgaejang.png',
    region_tag: '대구 향토음식', transmitter_name: '박순덕', transmitter_quote: '대파를 넉넉히 넣어 끓여요.',
    like_count: 162, save_count: 102, is_liked: false, is_saved: false,
  }],
  next_cursor: null,
}

export async function getHomeFeed(limit = 10): Promise<HomeFeed> {
  if (IS_MOCK) return mockFeed
  return apiFetch<HomeFeed>(`/api/home?${new URLSearchParams({ limit: String(limit) })}`)
}

export async function searchRecipes(query: string): Promise<RecipeSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: '20' })
  if (IS_MOCK) {
    const recipes = [...mockFeed.top_recipes, ...mockFeed.recommended]
      .filter((recipe) => recipe.title.includes(query))
      .map((recipe) => ({
        recipe_id: recipe.recipe_id,
        title: recipe.title,
        hero_image_url: recipe.hero_image_url,
        transmitter_name: recipe.transmitter_name ?? '한술',
        region_tag: recipe.region_tag ?? '경북 향토음식',
        like_count: recipe.like_count ?? 0,
      }))
    return { recipes, next_cursor: null }
  }
  return apiFetch<RecipeSearchResponse>(`/api/search/recipes?${params}`)
}
