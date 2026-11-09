import { describe, expect, it } from 'vitest'
import { isValidRecipeId } from './recipeId'

describe('운영 레시피 상세 ID 검증', () => {
  it('서버 UUID는 통과', () => {
    expect(isValidRecipeId('11111111-1111-4111-8111-111111111111')).toBe(true)
  })
  it('mock 및 undefined ID는 상세 API로 보내지 않는다', () => {
    expect(isValidRecipeId('r-andong-jjimdak')).toBe(false)
    expect(isValidRecipeId('')).toBe(false)
    expect(isValidRecipeId(undefined)).toBe(false)
  })
})
