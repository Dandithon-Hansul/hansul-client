import { describe, expect, it } from 'vitest'
import { isValidPassword, toAuthEmail, toKoreanAuthMessage, validateSignup } from './validation'

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
    expect(validateSignup('hansol_01', 'hansul123', 'hansul123')).toEqual({})
  })
  it('아이디·비밀번호·확인 칸을 각각 검사한다', () => {
    expect(validateSignup('', '', '')).toEqual({
      loginId: '아이디를 입력해주세요.',
      password: '비밀번호는 영문과 숫자를 포함해 8자 이상으로 입력해주세요.',
      passwordConfirm: '비밀번호를 한 번 더 입력해주세요.',
    })
    expect(validateSignup('ab', 'hansul123', 'hansul124')).toEqual({
      loginId: '영문 소문자·숫자·밑줄(_) 4~20자로 입력해주세요.',
      passwordConfirm: '비밀번호가 일치하지 않아요.',
    })
    expect(validateSignup('한글아이디', 'hansul123', 'hansul123').loginId).toBeDefined()
  })

  it('비밀번호는 영문과 숫자를 포함해 8자 이상', () => {
    expect(isValidPassword('hansul12')).toBe(true)
    expect(isValidPassword('hansul1')).toBe(false) // 7자
    expect(isValidPassword('12345678')).toBe(false) // 영문 없음
    expect(isValidPassword('abcdefgh')).toBe(false) // 숫자 없음
  })
})

describe('toKoreanAuthMessage', () => {
  it('Supabase 에러 코드를 한국어로 바꾼다', () => {
    expect(toKoreanAuthMessage({ code: 'invalid_credentials' })).toBe('아이디 또는 비밀번호가 올바르지 않아요.')
    expect(toKoreanAuthMessage({ message: 'User already registered' })).toBe('이미 사용 중인 아이디예요.')
    expect(toKoreanAuthMessage({ status: 0, message: 'Failed to fetch' })).toContain('서버에 연결하지 못했어요')
    expect(toKoreanAuthMessage({ status: 500 })).toBe('문제가 생겼어요. 잠시 후 다시 시도해주세요. (500)')
    expect(toKoreanAuthMessage({})).toBe('문제가 생겼어요. 잠시 후 다시 시도해주세요.')
  })

  it("'Confirm email' 이 켜져 있을 때 만든(확인 안 된) 계정은 그 이유를 알려준다", () => {
    expect(toKoreanAuthMessage({ code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' })).toContain('가입 확인이 끝나지 않은 계정')
  })

  it('Supabase 키가 잘못되면 배포 환경 변수를 확인하라고 알려준다', () => {
    expect(toKoreanAuthMessage({ status: 401, message: 'Invalid API key' })).toContain('VITE_SUPABASE_ANON_KEY')
  })
})
