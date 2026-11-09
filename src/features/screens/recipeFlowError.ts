import { ApiError } from '../../lib/api/client'

export function flowErrorMessage(error: unknown, stage: 'analysis' | 'publish') {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료됐어요. 다시 로그인해 주세요.'
    if (error.status === 402) return 'AI 분석 서비스를 현재 이용할 수 없어요. 서비스 관리자에게 알려주세요.'
    if (error.status === 502 || error.code === 'INTERVIEW_FAILED') return 'AI가 음식 이야기를 정리하지 못했어요. 잠시 후 다시 시도해 주세요.'
    if (error.status === 422) {
      if (error.code === 'SENSORY_INSUFFICIENT') return '확인한 손맛 표현이 부족해요. 질문에 한 번 더 답해 주세요.'
      if (error.code === 'UNRESOLVED_CRITICAL') return '꼭 확인해야 할 조리 질문이 남아 있어요. 음식 이야기를 이어가 주세요.'
      if (error.code === 'TRANSCRIPT_REQUIRED') return '먼저 음식을 설명하는 녹음을 남겨 주세요.'
      return '레시피를 만들기 전에 필요한 정보를 확인해 주세요.'
    }
    if (error.status === 0) return '네트워크 연결을 확인하고 다시 시도해 주세요.'
  }
  return stage === 'analysis'
    ? '레시피 분석을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
    : '레시피 발행을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
}
