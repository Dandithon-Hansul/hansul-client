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
