import { useEffect, useState, type FormEvent } from 'react'
import { getHomeFeed, searchRecipes, type HomeFeed, type RecipeSearchResult } from '../../lib/api/home'
import { getRecipe, getRecommendations, type RecommendationItem } from '../../lib/api/recipes'
import { ApiError } from '../../lib/api/client'
import { IS_MOCK } from '../../lib/env'
import RecipePhoto from '../../components/RecipePhoto'
import { isValidRecipeId } from '../../lib/recipeId'
import './home.css'

type HomeScreenProps = {
  name: string
  onNavigate: (destination: 'home' | 'record' | 'map' | 'profile' | 'monthly' | 'recipe') => void
  onRecipeSelect: (recipeId: string) => void
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
}

function HomeScreen({ name, onNavigate, onRecipeSelect }: HomeScreenProps) {
  const [feed, setFeed] = useState<HomeFeed | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [feedError, setFeedError] = useState('')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [results, setResults] = useState<RecipeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [recipeImages, setRecipeImages] = useState<Record<string, string | null>>({})
  const [verifiedRecipes, setVerifiedRecipes] = useState<string[]>([])
  const [recommendationError, setRecommendationError] = useState('')
  const [openingRecommendation, setOpeningRecommendation] = useState(false)

  useEffect(() => {
    let active = true
    getHomeFeed().then((data) => {
      if (active) setFeed(data)
    }).catch(() => {
      if (active) setFeedError('홈 정보를 불러오지 못했어요.')
    })
    getRecommendations().then((data) => {
      if (active) setRecommendations(data.recipes)
    }).catch(() => { /* 통합 홈 응답의 추천 목록을 fallback으로 사용 */ })
    return () => { active = false }
  }, [])

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setSubmittedQuery('')
      setResults([])
      setSearchError('')
      return
    }
    setSubmittedQuery(value)
    setSearching(true)
    setSearchError('')
    try {
      const response = await searchRecipes(value)
      setResults(response.recipes)
    } catch {
      setSearchError('검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const topRecipe = feed?.top_recipes[0]
  const isUsableId = (id: unknown) => IS_MOCK || isValidRecipeId(id)
  const recommended = recommendations.find((item) => isUsableId(item.recipe_id))
    ?? feed?.recommended.find((item) => isUsableId(item.recipe_id))

  // Home DTO images may be storage paths rather than signed URLs. The detail API
  // resolves actual recipe image URLs and verifies the card's UUID exists.
  useEffect(() => {
    if (IS_MOCK) return undefined
    let active = true
    const ids = [topRecipe?.recipe_id, recommended?.recipe_id]
      .filter((candidate): candidate is string => isValidRecipeId(candidate))
    for (const id of new Set(ids)) {
      void getRecipe(id).then((recipe) => {
        if (!active || recipe.recipe_id !== id) return
        setRecipeImages((current) => ({ ...current, [id]: recipe.hero_image_url }))
        setVerifiedRecipes((current) => current.includes(id) ? current : [...current, id])
      }).catch(() => { /* Card remains visible; opening it retries with an actionable error. */ })
    }
    return () => { active = false }
  }, [topRecipe?.recipe_id, recommended?.recipe_id])

  async function openRecommendation(id: string) {
    if (openingRecommendation) return
    if (!isUsableId(id)) {
      setRecommendationError('추천 레시피 정보가 올바르지 않아요. 다른 음식을 선택해 주세요.')
      return
    }
    setRecommendationError('')
    if (verifiedRecipes.includes(id)) {
      onRecipeSelect(id)
      return
    }
    setOpeningRecommendation(true)
    try {
      const recipe = await getRecipe(id)
      if (recipe.recipe_id !== id) throw new Error('RECIPE_ID_MISMATCH')
      onRecipeSelect(id)
    } catch (error) {
      const status = error instanceof ApiError ? `(${error.code} · ${error.status})` : ''
      setRecommendationError(`이 추천 음식의 상세 정보를 열지 못했어요. ${status}`)
    } finally {
      setOpeningRecommendation(false)
    }
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <a className="home-brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate('home') }} aria-label="한술 홈">
          <img src="/logo.svg" alt="" />
          <span>한술</span>
        </a>
        <button className="profile-shortcut" type="button" aria-label="프로필" onClick={() => onNavigate('profile')}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="currentColor"/><circle cx="16" cy="11.5" r="5" fill="white"/><path d="M6.5 26c1.4-5 4.7-7.5 9.5-7.5s8.1 2.5 9.5 7.5" fill="white"/></svg>
        </button>
      </header>

      <section className="home-intro">
        <h1>{(feed?.greeting_name || name || '한술')}님,<br />오늘은 어떤 맛의 기억을 이어볼까요?</h1>
        <form className="recipe-search" onSubmit={submitSearch}>
          <label className="visually-hidden" htmlFor="home-recipe-search">음식 또는 지역 검색</label>
          <input id="home-recipe-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="음식·지역·전승자를 검색해 보세요" />
          <button type="submit" aria-label="검색" disabled={searching}><SearchIcon /></button>
        </form>
      </section>

      {submittedQuery && (
        <section className="home-search-results" aria-live="polite">
          <h2>‘{submittedQuery}’ 검색 결과</h2>
          {searching ? <p>검색 중…</p> : searchError ? <p role="alert">{searchError}</p> : results.length ? results.map((recipe) => (
            <button className="home-search-result" type="button" key={recipe.recipe_id} onClick={() => onRecipeSelect(recipe.recipe_id)}>
              {recipe.hero_image_url && <img src={recipe.hero_image_url} alt="" />}
              <span><b>{recipe.title}</b><small>{recipe.region_tag} · {recipe.transmitter_name} 전승자</small></span>
            </button>
          )) : <p>검색 결과가 없습니다.</p>}
        </section>
      )}

      <button className="record-promo" type="button" onClick={() => onNavigate('record')}>
        <span className="record-promo-title">우리 집 손맛을<br />목소리로 남겨보세요</span>
        <span className="record-promo-link">전승 시작하기 <span aria-hidden="true">→</span></span>
        <svg className="sound-mark" viewBox="0 0 74 74" aria-hidden="true"><path d="M11 42V30m12 25V20m12 32V13m12 39V24m12 24V31"/><path d="M62 13v12m-6-6h12"/></svg>
      </button>

      {feedError ? <div className="home-feed-error" role="alert">{feedError} 새로고침해 다시 시도해주세요.</div> : (
        <>
          <section className="recipe-section monthly-section">
            <button className="section-heading" type="button" onClick={() => onNavigate('monthly')}>
              <span>이달의 전승 음식</span><span className="section-arrow" aria-hidden="true">›</span>
            </button>
            {topRecipe ? <button className="recipe-feature" type="button" onClick={() => onRecipeSelect(topRecipe.recipe_id)}>
              <RecipePhoto className="home-recipe-photo" src={recipeImages[topRecipe.recipe_id] || topRecipe.hero_image_url} title={topRecipe.title || '전승 음식'} />
              <span className="recipe-gradient" />
              <span className="recipe-title">{String(topRecipe.rank ?? 1).padStart(2, '0')} {topRecipe.title}</span>
            </button> : <p className="home-empty">아직 소개할 전승 음식이 없어요.</p>}
          </section>

          <section className="recipe-section recommendation-section">
            <h2>{(feed?.greeting_name || name || '한술')}님을 위한 추천 음식</h2>
            {recommendationError && <p className="home-feed-error" role="alert">{recommendationError}</p>}
            {recommended ? <button className="recipe-feature recommendation-card" type="button" disabled={openingRecommendation} onClick={() => void openRecommendation(recommended.recipe_id)}>
              <RecipePhoto className="home-recipe-photo" src={recipeImages[recommended.recipe_id] || recommended.hero_image_url} title={recommended.title || '추천 음식'} />
              <span className="recipe-gradient" />
              {recommended.region_tag && <span className="recipe-location">{recommended.region_tag}</span>}
              <span className="recipe-title">{recommended.title}</span>
            </button> : <p className="home-empty">취향에 맞는 추천 음식이 준비 중이에요.</p>}
          </section>
        </>
      )}

      <nav className="home-bottom-nav" aria-label="하단 메뉴">
        <div className="home-nav-pills">
          <button className="home-nav-button is-active" type="button" aria-label="홈" onClick={() => onNavigate('home')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.8v-6h-5.4v6H4.5A1.5 1.5 0 0 1 3 19.5z" fill="currentColor"/></svg>
          </button>
          <button className="home-nav-button" type="button" aria-label="지역 지도" onClick={() => onNavigate('map')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.2"/></svg>
          </button>
        </div>
        <button className="home-record-button" type="button" aria-label="음성 기록하기" onClick={() => onNavigate('record')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg>
        </button>
      </nav>
    </div>
  )
}

export default HomeScreen
