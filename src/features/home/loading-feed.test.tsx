import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHomeFeed, type HomeFeed } from '../../lib/api/home'
import { loginAsDemo, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/home', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api/home')>()),
  getHomeFeed: vi.fn(),
}))

beforeEach(() => vi.mocked(getHomeFeed).mockReset())

describe('홈 피드 로딩 상태', () => {
  it('API 로딩 중에 비어 있다는 문구를 표시하지 않는다', async () => {
    let resolveFeed!: (value: HomeFeed) => void
    const pending = new Promise<HomeFeed>((resolve) => { resolveFeed = resolve })
    vi.mocked(getHomeFeed).mockReturnValue(pending)
    loginAsDemo()
    renderApp('/')

    expect(await screen.findByText('이달의 전승 음식을 불러오는 중이에요…')).toBeInTheDocument()
    expect(screen.queryByText('아직 소개할 전승 음식이 없어요.')).not.toBeInTheDocument()

    await act(async () => resolveFeed({
      greeting_name: '테스트', top_recipes: [], recommended: [], next_cursor: null,
    }))
    expect(await screen.findByText('아직 소개할 전승 음식이 없어요.')).toBeInTheDocument()
  })
})
