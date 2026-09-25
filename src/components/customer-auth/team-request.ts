export async function teamRequest(body: object) {
  const response = await fetch('/api/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'genericError')
  return result as { ok?: boolean; deliveryFailed?: boolean; organizationId?: string }
}
