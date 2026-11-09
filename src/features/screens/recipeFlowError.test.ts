import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { flowErrorMessage } from './recipeFlowError'

describe('레시피 만들기 오류 안내', () => {
  it('402는 AI 서비스 이용 불가를 안내하고 원문을 노출하지 않는다', () => {
    const message = flowErrorMessage(new ApiError(402, 'HTTP_402', 'provider payment details'), 'analysis')
    expect(message).toContain('AI 분석 서비스')
    expect(message).not.toContain('provider')
  })
  it('502는 분석 서버 오류를 재시도 안내로 바꾼다', () => {
    expect(flowErrorMessage(new ApiError(502, 'INTERVIEW_FAILED', '서버 오류'), 'analysis')).toContain('잠시 후 다시 시도')
  })
  it('422 감각 확인 부족은 추가 답변을 안내한다', () => {
    expect(flowErrorMessage(new ApiError(422, 'SENSORY_INSUFFICIENT', '부족'), 'publish')).toContain('손맛 표현')
  })
  it('네트워크 오류와 일반 발행 오류를 구분한다', () => {
    expect(flowErrorMessage(new ApiError(0, 'NETWORK_ERROR', 'x'), 'publish')).toContain('네트워크')
    expect(flowErrorMessage(new Error('x'), 'publish')).toContain('레시피 발행')
  })
})
