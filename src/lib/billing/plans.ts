export const planIds = ['free', 'starter', 'professional', 'business'] as const
export type PlanId = (typeof planIds)[number]
export type Plan = {
  id: PlanId
  monthly_documents: number
  daily_uploads: number
  batch_uploads: number
  team_members: number
  storage_bytes: string
  monthly_price_cents: number
  stripe_price_id: string | null
  stripe_product_id: string | null
  revision: number
  published: boolean
}
export function effectivePlan(
  subscription:
    | { plan_id: PlanId; status: string; current_period_end: Date | null; grace_until: Date | null }
    | undefined,
  now = new Date(),
): PlanId {
  if (!subscription) return 'free'
  if (
    ['active', 'trialing'].includes(subscription.status) &&
    subscription.current_period_end &&
    subscription.current_period_end > now
  )
    return subscription.plan_id
  if (
    subscription.status === 'past_due' &&
    subscription.grace_until &&
    subscription.grace_until > now
  )
    return subscription.plan_id
  return 'free'
}
