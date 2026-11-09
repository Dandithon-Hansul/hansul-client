import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { loginAsDemo, renderApp } from '../../test/renderApp'
import { generateStepImages } from '../../lib/api/recipes'

vi.mock('../../lib/api/recipes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/recipes')>()
  return { ...actual, generateStepImages: vi.fn() }
})

const generateImages = vi.mocked(generateStepImages)
const RECIPE_ID = 'seed-pohang-buchujeon'

beforeEach(() => generateImages.mockReset())

describe('조리 화면의 단계 이미지 실패 복구', () => {
  it('부분 실패를 안내하고 재시도 후 성공 이미지를 유지한다', async () => {
    generateImages
      .mockResolvedValueOnce({
        generated: [
          { order: 1, image_url: 'https://images.test/step-1.png', prompt_used: '' },
          { order: 3, image_url: 'https://images.test/step-3.png', prompt_used: '' },
        ],
        failed_orders: [2, 4],
      })
      .mockResolvedValueOnce({
        generated: [
          { order: 2, image_url: 'https://images.test/step-2.png', prompt_used: '' },
          { order: 4, image_url: 'https://images.test/step-4.png', prompt_used: '' },
        ],
        failed_orders: [],
      })

    loginAsDemo()
    const user = renderApp(`/cook?id=${RECIPE_ID}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('2개 단계의 이미지를 생성하지 못했어요.')
    expect(generateImages).toHaveBeenCalledTimes(1)
    expect(generateImages).toHaveBeenCalledWith(RECIPE_ID)
    expect(screen.getByRole('img', { name: '재료 손질하기' })).toHaveAttribute('src', 'https://images.test/step-1.png')

    await user.click(screen.getByRole('button', { name: '다음 단계' }))
    expect(screen.getByText('이 단계의 이미지 대신 임시 이미지를 보여드리고 있어요.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '이미지 다시 시도하기' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '이미지 다시 시도하기' })).not.toBeInTheDocument())
    expect(screen.getByRole('img', { name: '소고기 볶기' })).toHaveAttribute('src', 'https://images.test/step-2.png')
    expect(generateImages).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: '이전 단계' }))
    expect(screen.getByRole('img', { name: '재료 손질하기' })).toHaveAttribute('src', 'https://images.test/step-1.png')
  })

  it('요청 전체가 실패해도 자동 무한 재시도 없이 수동 재시도할 수 있다', async () => {
    generateImages.mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({
        generated: [1, 2, 3, 4].map((order) => ({ order, image_url: `https://images.test/step-${order}.png`, prompt_used: '' })),
        failed_orders: [],
      })

    loginAsDemo()
    const user = renderApp(`/cook?id=${RECIPE_ID}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('단계 이미지 생성 요청에 실패했어요.')
    expect(generateImages).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: '이미지 다시 시도하기' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(generateImages).toHaveBeenCalledTimes(2)
  })
})
