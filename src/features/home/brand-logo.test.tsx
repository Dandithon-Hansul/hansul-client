import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { loginAsDemo, renderApp } from '../../test/renderApp'

describe('홈 브랜드 로고', () => {
  it('첨부된 이미지 32 원본을 홈 로고로 사용한다', async () => {
    loginAsDemo()
    renderApp('/')
    const link = await screen.findByRole('link', { name: '한술 홈' })
    expect(link.querySelector('img')).toHaveAttribute('src', '/images/hansul-logo-mark.png')
  })
})
