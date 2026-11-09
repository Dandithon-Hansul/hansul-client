import { describe, expect, it } from 'vitest'
import type { RecipeStep } from '../../lib/api/recipes'
import { failedStepImageOrders, mergeStepImages } from './stepImageGeneration'

const steps: RecipeStep[] = [
  { order: 1, title: '재료 손질', description: '', image_url: null, tip: null, is_key_step: false },
  { order: 2, title: '볶기', description: '', image_url: null, tip: null, is_key_step: false },
  { order: 3, title: '끓이기', description: '', image_url: null, tip: null, is_key_step: false },
]

describe('부분 실패한 조리 단계 이미지 처리', () => {
  it('성공한 이미지만 반영하고 실패한 단계 이미지는 그대로 유지한다', () => {
    const updated = mergeStepImages(steps, [{ order: 1, image_url: 'https://cdn.test/1.png' }, { order: 3, image_url: 'https://cdn.test/3.png' }])
    expect(updated.map((step) => step.image_url)).toEqual(['https://cdn.test/1.png', null, 'https://cdn.test/3.png'])
    expect(steps.every((step) => step.image_url === null)).toBe(true)
  })

  it('실패 단계만 중복 없이 표시하고 이미 성공한 단계는 제외한다', () => {
    const result = { generated: [{ order: 1, image_url: 'https://cdn.test/1.png' }], failed_orders: [2, 2, 1, 99] }
    expect(failedStepImageOrders(steps, result)).toEqual([2])
  })

  it('재시도에서 성공한 이미지를 이전 결과와 합쳐 유지한다', () => {
    const first = mergeStepImages(steps, [{ order: 1, image_url: 'https://cdn.test/1.png' }])
    const second = mergeStepImages(first, [{ order: 2, image_url: 'https://cdn.test/2.png' }])
    expect(second.map((step) => step.image_url)).toEqual(['https://cdn.test/1.png', 'https://cdn.test/2.png', null])
    expect(failedStepImageOrders(first, { generated: [{ order: 2, image_url: 'https://cdn.test/2.png' }], failed_orders: [3] })).toEqual([3])
  })
})
