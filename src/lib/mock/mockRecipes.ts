import type { MyRecipeItem, PublicProfile, RecipeThumb, SavedRecipeItem } from '../api/types'

// mock 모드에서 프로필 그리드에 보여줄 데이터 (목업 화면에 나온 음식 이름 그대로)
// 사진은 레포에 있는 두 장만 쓰고, 나머지는 사진 없는 칸으로 표시

const JJIMDAK = '/images/andong-jjimdak.png'
const YUKGAEJANG = '/images/daegu-yukgaejang.png'

/** 데모 계정(hansul)의 전승 레시피 */
export const DEMO_MY_RECIPES: MyRecipeItem[] = [
  { recipe_id: 'r-andong-jjimdak', title: '안동 찜닭', hero_image_url: JJIMDAK, like_count: 21, save_count: 9, created_at: '2026-11-01T09:00:00Z' },
  { recipe_id: 'r-godeungeo', title: '안동 간고등어 조림', hero_image_url: null, like_count: 13, save_count: 4, created_at: '2026-10-28T09:00:00Z' },
]

/** 데모 계정이 저장한 맛 */
export const DEMO_SAVED: SavedRecipeItem[] = [
  ['문경 산채 비빔밥', null],
  ['청송 닭불고기', null],
  ['대구 찜갈비', null],
  ['안동 찜닭', JJIMDAK],
  ['포항 모리국수', null],
  ['영주 태평초', null],
  ['울진 물곰국', null],
  ['대구식 육개장', YUKGAEJANG],
].map(([title, image], index) => ({
  recipe_id: `r-saved-${index + 1}`,
  title: title as string,
  hero_image_url: image,
  transmitter_name: '김한술',
  saved_at: new Date(Date.UTC(2026, 10, 5 - index)).toISOString(),
}))

/** 다른 사용자(전승자) — /users/u-kim-hansul */
export const MOCK_PUBLIC_PROFILES: Record<string, { profile: PublicProfile; recipes: RecipeThumb[] }> = {
  'u-kim-hansul': {
    profile: {
      id: 'u-kim-hansul',
      display_name: '김한술',
      avatar_url: null,
      region: { code: '27260', sido: '대구광역시', sigungu: '수성구', dong: null },
      bio: '안녕하세요 여러분ㅎㅎ 같이 레시피 공유해봐요~',
      stats: { transmitted_recipes: 5, likes_received: 63 },
    },
    recipes: [
      ['소고기 뭇국', null],
      ['대구식 육개장', YUKGAEJANG],
      ['찜갈비', null],
      ['닭강정', null],
      ['누른 국수', null],
    ].map(([title, image], index) => ({ recipe_id: `r-kim-${index + 1}`, title: title as string, hero_image_url: image })),
  },
}
