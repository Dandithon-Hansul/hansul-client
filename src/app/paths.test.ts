import { describe, expect, it } from 'vitest'
import { isFeaturePage, pathOf } from './paths'

describe('paths', () => {
  it('기존 화면 이름을 주소로 바꾼다', () => {
    expect(pathOf('home')).toBe('/')
    expect(pathOf('profile')).toBe('/profile')
    expect(pathOf('record')).toBe('/record')
  })

  it('없는 화면 이름은 걸러낸다', () => {
    expect(isFeaturePage('chat')).toBe(true)
    expect(isFeaturePage('login')).toBe(false)
    expect(isFeaturePage(undefined)).toBe(false)
  })
})
