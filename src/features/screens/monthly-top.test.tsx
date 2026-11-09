import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyTopRecipes } from '../../lib/api/home'
import { currentPath, loginAsDemo, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/home', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/home')>()
  return { ...actual, getMonthlyTopRecipes: vi.fn() }
})

const fetchMonthly = vi.mocked(getMonthlyTopRecipes)

beforeEach(() => fetchMonthly.mockReset())

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
    expect(screen.queryByText(/전승자/)).not.toBeInTheDocument()

    await user.click(second)
    expect(currentPath()).toHaveTextContent('/recipe?id=monthly-uuid-1')
  })

  it('월간 목록이 비어 있으면 빈 상태를 안내한다', async () => {
    fetchMonthly.mockResolvedValue([])
    loginAsDemo()
    renderApp('/monthly')
    expect(await screen.findByText('아직 이번 달에 소개할 전승 음식이 없어요.')).toBeInTheDocument()
  })
})
