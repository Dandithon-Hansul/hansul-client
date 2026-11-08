// "이 사용자는 서버에 프로필이 있다"를 한 번 확인하면 기억해 두는 곳
// → 화면을 옮길 때마다 GET /api/profiles/me 를 다시 부르지 않도록

const confirmed = new Set<string>()

export function markProfileReady(userId: string | null | undefined) {
  if (userId) confirmed.add(userId)
}

export function isProfileConfirmed(userId: string | null | undefined) {
  return Boolean(userId && confirmed.has(userId))
}

/** 테스트끼리 기억이 섞이지 않도록 비우기 */
export function resetProfileStatus() {
  confirmed.clear()
}
