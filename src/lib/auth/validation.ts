import { AUTH_EMAIL_DOMAIN } from '../env'

/** 아이디 규칙: 영문 소문자·숫자·밑줄 4~20자 (이메일 앞부분으로 써도 안전한 문자만) */
export const LOGIN_ID_PATTERN = /^[a-z0-9_]{4,20}$/
/** 비밀번호 규칙 (Figma 회원가입 안내 문구): 영문과 숫자를 포함해 8자 이상 */
export const PASSWORD_MIN = 8
export const PASSWORD_RULE = '영문과 숫자를 포함해 8자 이상'
export function isValidPassword(password: string) {
  return password.length >= PASSWORD_MIN && /[A-Za-z]/.test(password) && /\d/.test(password)
}

export function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase()
}

/**
 * 목업은 "아이디" 로그인인데 Supabase Auth 는 이메일이 필요해서 가짜 이메일로 바꿉니다.
 * hansol → hansol@hansul.app  ('@' 가 있으면 진짜 이메일로 보고 그대로 사용)
 */
export function toAuthEmail(loginId: string) {
  const id = normalizeLoginId(loginId)
  return id.includes('@') ? id : `${id}@${AUTH_EMAIL_DOMAIN}`
}

export type SignupErrors = Partial<Record<'loginId' | 'password' | 'passwordConfirm', string>>

export function validateSignup(loginId: string, password: string, passwordConfirm: string): SignupErrors {
  const errors: SignupErrors = {}
  const id = normalizeLoginId(loginId)
  if (!id) errors.loginId = '아이디를 입력해주세요.'
  else if (!LOGIN_ID_PATTERN.test(id)) errors.loginId = '영문 소문자·숫자·밑줄(_) 4~20자로 입력해주세요.'
  if (!isValidPassword(password)) errors.password = `비밀번호는 ${PASSWORD_RULE}으로 입력해주세요.`
  if (!passwordConfirm) errors.passwordConfirm = '비밀번호를 한 번 더 입력해주세요.'
  else if (passwordConfirm !== password) errors.passwordConfirm = '비밀번호가 일치하지 않아요.'
  return errors
}

/** Supabase 에러(code·message·status)를 화면용 한국어로 */
export function toKoreanAuthMessage(error: { code?: string; message?: string; status?: number }) {
  const code = error.code ?? ''
  const message = error.message ?? ''
  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) return '아이디 또는 비밀번호가 올바르지 않아요.'
  if (code === 'user_already_exists' || message.includes('already registered')) return '이미 사용 중인 아이디예요.'
  if (code === 'weak_password' || message.includes('Password should be')) return `비밀번호는 ${PASSWORD_RULE}으로 입력해주세요.`
  if (code === 'email_address_invalid') return '사용할 수 없는 아이디예요.'
  if (code === 'over_request_rate_limit' || error.status === 429) return '요청이 많아요. 잠시 후 다시 시도해주세요.'
  if (error.status === 0 || message.includes('fetch')) return '서버에 연결하지 못했어요. 인터넷 연결이나 Supabase 주소를 확인해주세요.'
  return '문제가 생겼어요. 잠시 후 다시 시도해주세요.'
}
