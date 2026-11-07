import type { FeaturePage } from '../features/screens/PostOnboardingScreens'

/** 기존 onNavigate('record') 같은 호출을 주소(/record)로 바꿔주는 연결 고리 */
export type Destination = 'home' | FeaturePage

const FEATURE_PAGES: readonly FeaturePage[] = ['record', 'chat', 'map', 'profile', 'monthly', 'recipe', 'cook']

export function isFeaturePage(value: string | undefined): value is FeaturePage {
  return value !== undefined && (FEATURE_PAGES as readonly string[]).includes(value)
}

export function pathOf(destination: Destination): string {
  return destination === 'home' ? '/' : `/${destination}`
}

/**
 * 레시피 상세 주소. 지금 상세 화면(/recipe)은 id 없이 고정 데이터라 쿼리로 id 만 넘겨 둠.
 * 상세 화면이 API 로 바뀌면 여기만 `/recipes/${recipeId}` 로 고치면 됨.
 */
export function recipePath(recipeId: string): string {
  return `/recipe?id=${encodeURIComponent(recipeId)}`
}
