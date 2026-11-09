import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyTopRecipes } from '../../lib/api/home'
import { getRecipe, toggleRecipe } from '../../lib/api/recipes'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/home', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/home')>()
  return { ...actual, getMonthlyTopRecipes: vi.fn() }
})
vi.mock('../../lib/api/recipes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/recipes')>()
  return { ...actual, getRecipe: vi.fn(actual.getRecipe), toggleRecipe: vi.fn(actual.toggleRecipe) }
})

const fetchMonthly = vi.mocked(getMonthlyTopRecipes)

beforeEach(() => {
  fetchMonthly.mockReset()
  vi.mocked(getRecipe).mockClear()
  vi.mocked(toggleRecipe).mockClear()
})

describe('이달의 TOP 6 전체 목록', () => {
  it('월간 API 순위 그대로 표시하고 선택한 레시피 상세로 이동한다', async () => {
    fetchMonthly.mockResolvedValue([
      { recipe_id: 'monthly-uuid-2', title: '이번 달 최다 저장', hero_image_url: null, rank: 1 },
      { recipe_id: 'monthly-uuid-1', title: '이번 달 인기 음식', hero_image_url: null, rank: 2 },
    ])
    loginAsDemo()
    const user = renderApp('/monthly')

    const first = await screen.findByRole('button', { name: /01 이번 달 최다 저장/ })
    const second = screen.getByRole('button', { name: /02 이번 달 인기 음식/ })
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('이번 달 좋아요·저장 활동을 기준으로 선정했어요.')).toBeInTheDocument()
    expect(screen.getByText('MONTHLY FAVORITES')).toBeInTheDocument()
    expect(first.closest('article')).toHaveClass('is-featured')

    await user.click(second)
    expect(currentPath()).toHaveTextContent('/recipe?id=monthly-uuid-1')
  })

  it('월간 목록이 비어 있으면 빈 상태를 안내한다', async () => {
    fetchMonthly.mockResolvedValue([])
    loginAsDemo()
    renderApp('/monthly')
    expect(await screen.findByText('아직 이번 달에 소개할 전승 음식이 없어요.')).toBeInTheDocument()
  })
  it('월간 TOP 6 카드에서 실제 좋아요·스크랩 상태를 보여주고 변경한다', async () => {
    fetchMonthly.mockResolvedValue([
      { recipe_id: 'monthly-reaction', title: '이번 달 육개장', hero_image_url: null, rank: 1 },
    ])
    vi.mocked(toggleRecipe).mockResolvedValueOnce({
      recipe_id: 'monthly-reaction', liked: true, saved: false, like_count: 163, save_count: 102,
    })
    loginAsDemo()
    const user = renderApp('/monthly')
    const like = await screen.findByRole('button', { name: '이번 달 육개장 좋아요' })
    expect(like).toHaveTextContent('162')
    expect(like).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '이번 달 육개장 스크랩' })).toHaveTextContent('102')
    await user.click(like)
    expect(await screen.findByRole('button', { name: '이번 달 육개장 좋아요 취소' })).toHaveTextContent('163')
    expect(toggleRecipe).toHaveBeenCalledWith('monthly-reaction', 'like')
  })

  it('음성 파일 없는 전승자 한마디에 기기 음성 읽어주기 버튼을 표시한다', async () => {
    fetchMonthly.mockResolvedValue([
      { recipe_id: 'monthly-voice', title: '한마디 있는 음식', hero_image_url: null, rank: 1 },
    ])
    loginAsDemo()
    const user = renderApp('/monthly')
    await user.click(await screen.findByRole('button', { name: /01 한마디 있는 음식/ }))
    expect(await screen.findByRole('button', { name: '한마디 기기 음성으로 읽기' })).toBeInTheDocument()
    expect(screen.getByText('전승자 음성 파일이 없어 기기 음성으로 읽어드려요.')).toBeInTheDocument()
  })

})
