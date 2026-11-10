/**
 * The production recipe-detail API accepts UUID-shaped IDs only (8-4-4-4-12 hex).
 * 버전·변형 자리까지 따지지 않음 — 시드 데이터가 'a0000001-0000-0000-0000-000000000001' 처럼
 * 손으로 만든 ID 를 쓰는데, Postgres uuid 는 이 형식도 받기 때문 (엄격하게 막으면 시드 레시피를 못 엶)
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidRecipeId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
