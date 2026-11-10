import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toggleRecipe } from '../../lib/api/recipes'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/recipes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api/recipes')>()),
  toggleRecipe: vi.fn(),
}))

const reaction = vi.mocked(toggleRecipe)
beforeEach(() => reaction.mockReset())

describe('레시피 상세에서 돌아가기·좋아요·스크랩', () => {
  it('TOP6에서 상세로 들어오면 홈이 아닌 TOP6로 돌아간다', async () => {
    loginAsDemo()
    const user = renderApp('/monthly')
    await user.click(await screen.findByRole('button', { name: /안동 찜닭 레시피 보기/ }))
    expect(currentPath()).toHaveTextContent('/recipe?id=')
    await user.click(await screen.findByRole('button', { name: '뒤로가기' }))
    expect(currentPath()).toHaveTextContent('/monthly')
  })

  it('직접 주소로 상세에 들어오면 홈으로 돌아간다', async () => {
    loginAsDemo()
    const user = renderApp('/recipe?id=r-daegu-yukgaejang')
    await user.click(await screen.findByRole('button', { name: '뒤로가기' }))
    expect(currentPath()).toHaveTextContent('/')
  })

  it('서로 다른 응답 순서로 완료돼도 좋아요와 스크랩 상태를 모두 유지한다', async () => {
    type Result = Awaited<ReturnType<typeof toggleRecipe>>
    let resolveLike!: (value: Result) => void
    let resolveSave!: (value: Result) => void
    const likeRequest = new Promise<Result>((resolve) => { resolveLike = resolve })
    const saveRequest = new Promise<Result>((resolve) => { resolveSave = resolve })
    reaction.mockImplementation(async (_id, action) => action === 'like' ? likeRequest : saveRequest)

    loginAsDemo()
    const user = renderApp('/recipe?id=r-daegu-yukgaejang')
    await user.click(await screen.findByRole('button', { name: '좋아요' }))
    await user.click(screen.getByRole('button', { name: '스크랩' }))

    await act(async () => resolveSave({
      recipe_id: 'r-daegu-yukgaejang', liked: false, saved: true, like_count: 162, save_count: 103,
    }))
    await waitFor(() => expect(screen.getByRole('button', { name: '스크랩 취소' })).toHaveAttribute('aria-pressed', 'true'))

    await act(async () => resolveLike({
      recipe_id: 'r-daegu-yukgaejang', liked: true, saved: false, like_count: 163, save_count: 102,
    }))
    await waitFor(() => expect(screen.getByRole('button', { name: '좋아요 취소' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: '스크랩 취소' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('반응 API가 실패하면 오류를 안내한다', async () => {
    reaction.mockRejectedValueOnce(new Error('network down'))
    loginAsDemo()
    const user = renderApp('/recipe?id=r-daegu-yukgaejang')
    await user.click(await screen.findByRole('button', { name: '좋아요' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('좋아요를 변경하지 못했어요')
  })
})
