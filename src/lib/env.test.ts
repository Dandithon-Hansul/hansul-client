import { describe, expect, it } from 'vitest'
import { cleanEnvValue } from './env'

describe('cleanEnvValue (배포 환경 변수 붙여 넣기 실수 정리)', () => {
  it('앞뒤 공백·줄바꿈을 지운다', () => {
    expect(cleanEnvValue('  sb_publishable_abc \n')).toBe('sb_publishable_abc')
  })
  it('값 전체를 감싼 따옴표를 지운다', () => {
    expect(cleanEnvValue('"sb_publishable_abc"')).toBe('sb_publishable_abc')
    expect(cleanEnvValue("'https://x.supabase.co'")).toBe('https://x.supabase.co')
  })
  it('없거나 빈 값은 빈 문자열', () => {
    expect(cleanEnvValue(undefined)).toBe('')
    expect(cleanEnvValue('   ')).toBe('')
  })
  it('값 안의 문자는 건드리지 않는다', () => {
    expect(cleanEnvValue('sb_publishable_aa3-S1Rv_8A')).toBe('sb_publishable_aa3-S1Rv_8A')
  })
})
