import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RecipePhoto from './RecipePhoto'

describe('레시피 사진', () => {
  it('실제 레시피 사진 URL이 있으면 해당 사진을 표시한다', () => {
    render(<RecipePhoto src="https://cdn.example.com/pohang-buchujeon.png" title="포항 부추전" />)
    expect(screen.getByRole('img', { name: '포항 부추전' })).toHaveAttribute('src', 'https://cdn.example.com/pohang-buchujeon.png')
  })
  it('사진이 없으면 다른 음식의 하드코딩 이미지를 쓰지 않는다', () => {
    render(<RecipePhoto src={null} title="포항 부추전" />)
    expect(screen.getByRole('img', { name: '포항 부추전 사진 준비 중' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '안동찜닭' })).not.toBeInTheDocument()
  })
  it('백엔드 내부 스토리지 경로를 그대로 이미지 URL로 쓰지 않는다', () => {
    render(<RecipePhoto src="owner/recipe/photo.webp" title="육개장" />)
    expect(screen.getByRole('img', { name: '육개장 사진 준비 중' })).toBeInTheDocument()
  })
})
