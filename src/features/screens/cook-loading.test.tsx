import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getRecipe } from '../../lib/api/recipes'
import { loginAsDemo, renderApp } from '../../test/renderApp'

vi.mock('../../lib/api/recipes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/recipes')>()
  return { ...actual, getRecipe: vi.fn(actual.getRecipe) }
})

describe('조리 화면의 로딩 및 디자인', () => {
  it('조리 상세가 로딩 중에도 동일한 배치에 진행바·뒤로가기·사진 스켈레톤을 유지한다', async () => {
    vi.mocked(getRecipe).mockImplementation(() => new Promise(() => {}))
    loginAsDemo()
    renderApp('/cook?id=seed-pohang-buchujeon')
    const skeleton = await screen.findByRole('status', { name: '조리 단계를 불러오는 중' })
    expect(skeleton.querySelector('.cook-skeleton-photo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '레시피로 돌아가기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음 단계' })).toBeDisabled()
    expect(screen.getByLabelText('조리 단계 불러오는 중')).toBeInTheDocument()
  })
  it('상세 레시피 로딩도 빈 화면 대신 고정 크기 스켈레톤을 표시한다', async () => {
    vi.mocked(getRecipe).mockImplementation(() => new Promise(() => {}))
    loginAsDemo()
    renderApp('/recipe?id=seed-pohang-buchujeon')
    expect(await screen.findByRole('status', { name: '레시피를 불러오는 중' })).toBeInTheDocument()
  })
})
