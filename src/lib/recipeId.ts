/** The production recipe-detail API accepts UUID recipe IDs only. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidRecipeId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
