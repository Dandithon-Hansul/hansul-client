import { describe, expect, it } from 'vitest'
import { toAuthEmail, toKoreanAuthMessage, validateSignup } from './validation'

describe('toAuthEmail', () => {
  it('아이디를 가짜 이메일로 바꾼다 (공백·대문자 정리)', () => {
    expect(toAuthEmail('  Hansol ')).toBe('hansol@hansul.app')
  })
  it('진짜 이메일은 그대로 둔다', () => {
    expect(toAuthEmail('me@gmail.com')).toBe('me@gmail.com')
  })
})

describe('validateSignup', () => {
  it('규칙에 맞으면 에러가 없다', () => {
    expect(validateSignup('hansol_01', '123456', '123456')).toEqual({})
  })
  it('아이디·비밀번호·확인 칸을 각각 검사한다', () => {
    expect(validateSignup('', '', '')).toEqual({
      loginId: '아이디를 입력해주세요.',
      password: '비밀번호는 6자 이상이어야 해요.',
      passwordConfirm: '비밀번호를 한 번 더 입력해주세요.',
    })
    expect(validateSignup('ab', '123456', '654321')).toEqual({
      loginId: '영문 소문자·숫자·밑줄(_) 4~20자로 입력해주세요.',
      passwordConfirm: '비밀번호가 일치하지 않아요.',
    })
    expect(validateSignup('한글아이디', '123456', '123456').loginId).toBeDefined()
  })
})

describe('toKoreanAuthMessage', () => {
  it('Supabase 에러 코드를 한국어로 바꾼다', () => {
    expect(toKoreanAuthMessage({ code: 'invalid_credentials' })).toBe('아이디 또는 비밀번호가 올바르지 않아요.')
    expect(toKoreanAuthMessage({ message: 'User already registered' })).toBe('이미 사용 중인 아이디예요.')
    expect(toKoreanAuthMessage({ status: 500 })).toBe('문제가 생겼어요. 잠시 후 다시 시도해주세요.')
  })
})
