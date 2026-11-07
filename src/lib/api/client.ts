import { getAccessToken } from '../auth/session'
import { API_BASE_URL } from '../env'
import type { ApiErrorBody } from './types'

/** 백엔드 공통 에러 { code, message, details } 를 담는 에러. 화면에서 status·code 로 분기 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type ApiInit = Omit<RequestInit, 'body'> & {
  /** 객체를 넘기면 JSON 으로 보내고 Content-Type 도 붙임 */
  json?: unknown
  body?: BodyInit
}

/**
 * 모든 백엔드 호출은 이 함수를 거칩니다.
 * - 로그인 토큰을 Authorization: Bearer 로 붙임 (API 명세서 12. 공통 규약)
 * - 실패하면 ApiError 를 throw
 */
export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, body, ...rest } = init
  const finalHeaders = new Headers(headers)
  const token = await getAccessToken()
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  if (json !== undefined) finalHeaders.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: json !== undefined ? JSON.stringify(json) : body,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했어요.')
  }

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false

  if (!res.ok) {
    const errorBody: Partial<ApiErrorBody> = isJson ? await res.json().catch(() => ({})) : {}
    throw new ApiError(
      res.status,
      errorBody.code ?? `HTTP_${res.status}`,
      errorBody.message ?? '요청을 처리하지 못했어요.',
      errorBody.details,
    )
  }

  if (res.status === 204) return undefined as T
  // 백엔드 주소를 잘못 잡으면 vite 가 index.html 을 200 으로 돌려줌 → 여기서 잡아냄
  if (!isJson) {
    throw new ApiError(res.status, 'INVALID_RESPONSE', 'API 응답이 JSON 이 아니에요. 백엔드 주소 설정을 확인하세요.')
  }
  return (await res.json()) as T
}
