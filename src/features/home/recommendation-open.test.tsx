import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../lib/api/client'
import { getRecipe } from '../../lib/api/recipes'
import { loginAsDemo, renderApp, currentPath } from '../../test/renderApp'

vi.mock('../../lib/api/recipes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/recipes')>()
  return { ...actual, getRecipe: vi.fn(actual.getRecipe) }
})
beforeEach(() => vi.mocked(getRecipe).mockReset())

describe('추천 음식 상세 이동', () => {
  it('상세 API에서 같은 ID를 확인하면 해당 레시피로 이동한다', async () => {
    vi.mocked(getRecipe).mockResolvedValue({
      recipe_id: 'r-daegu-yukgaejang',
      title: '대구식 육개장',
      hero_image_url: '/images/daegu-yukgaejang.png',
    } as Awaited<ReturnType<typeof getRecipe>>)
    loginAsDemo()
    const user = renderApp('/')
    await user.click(await screen.findByRole('button', { name: /대구식 육개장/ }))
    await waitFor(() => expect(currentPath()).toHaveTextContent('/recipe?id=r-daegu-yukgaejang'))
  })
  it('상세 API가 400을 반환하면 잘못된 상세 화면으로 보내지 않고 오류 안내를 제공한다', async () => {
    vi.mocked(getRecipe).mockRejectedValue(new ApiError(400, 'INVALID_RECIPE_ID', '잘못된 ID'))
    loginAsDemo()
    const user = renderApp('/')
    await user.click(await screen.findByRole('button', { name: /대구식 육개장/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('INVALID_RECIPE_ID · 400')
    expect(currentPath()).toHaveTextContent('/')
  })
})
