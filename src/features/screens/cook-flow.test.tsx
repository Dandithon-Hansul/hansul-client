import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getRecipe } from '../../lib/api/recipes'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

// 레시피 상세 요청만 기록해서 어떤 id 로 불렀는지 확인 (응답은 원래 mock 그대로)
vi.mock('../../lib/api/recipes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/recipes')>()
  return { ...actual, getRecipe: vi.fn(actual.getRecipe) }
})

const SEED_ID = 'seed-pohang-buchujeon'
const requestedIds = () => vi.mocked(getRecipe).mock.calls.map(([id]) => id)

describe('레시피 상세 → 단계별 조리', () => {
  it('고른 레시피 id 를 그대로 들고 조리 화면으로 가고, 예시 레시피를 다시 부르지 않는다', async () => {
    loginAsDemo()
    const user = renderApp(`/recipe?id=${SEED_ID}`)

    await user.click(await screen.findByRole('button', { name: '단계별로 따라 만들기' }))
    expect(currentPath()).toHaveTextContent(`/cook?id=${SEED_ID}`)
    expect(await screen.findByText('1. 재료 손질하기')).toBeInTheDocument()

    // 마지막 단계까지 넘겨도 오류 문구 없음 (예전: 예시 id 요청이 실제 서버에서 400 → '레시피를 불러오지 못했어요.')
    while (screen.queryByRole('button', { name: '다음 단계' })) await user.click(screen.getByRole('button', { name: '다음 단계' }))
    expect(screen.getByRole('button', { name: '요리 끝내기' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // 조리 화면에서 뒤로 → 같은 레시피 상세
    await user.click(screen.getByRole('button', { name: '레시피로 돌아가기' }))
    expect(currentPath()).toHaveTextContent(`/recipe?id=${SEED_ID}`)

    expect(requestedIds().length).toBeGreaterThan(0)
    expect(new Set(requestedIds())).toEqual(new Set([SEED_ID]))
  })
})
