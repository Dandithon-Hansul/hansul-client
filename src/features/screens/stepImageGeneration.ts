import type { RecipeStep } from '../../lib/api/recipes'

type GeneratedStepImage = { order: number; image_url: string }
type StepImageGenerationResult = {
  generated: GeneratedStepImage[]
  failed_orders: number[]
}

/** Reuse successful step images when a later batch partially fails. */
export function mergeStepImages(
  steps: RecipeStep[],
  generated: GeneratedStepImage[],
): RecipeStep[] {
  const urls = new Map(generated.map((image) => [image.order, image.image_url]))
  return steps.map((step) =>
    urls.has(step.order) ? { ...step, image_url: urls.get(step.order)! } : step,
  )
}

/** Only show retry UI for images that are still missing after the response. */
export function failedStepImageOrders(
  steps: RecipeStep[],
  result: StepImageGenerationResult,
): number[] {
  const missingOrders = new Set(steps.filter((step) => !step.image_url).map((step) => step.order))
  const succeededOrders = new Set(result.generated.map((image) => image.order))
  return [...new Set(result.failed_orders)].filter(
    (order) => missingOrders.has(order) && !succeededOrders.has(order),
  )
}
