const text = (v) => typeof v === 'string' && v.trim().length > 0
export function validateRule(input) {
  const errors = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: ['A rule must be an object.'] }
  const r = { ...input }
  if (!text(r.ruleId)) errors.push('A rule ID is required.')
  if (!['brand', 'platform', 'cart'].includes(r.scope)) errors.push('Scope must be brand, platform or cart.')
  if (r.scope !== 'cart' && !text(r.appliesTo)) errors.push('Name the brand or platform.')
  if (!['percentage', 'flat'].includes(r.type)) errors.push('Type must be percentage or flat.')
  if (typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value <= 0 || (r.type === 'percentage' && r.value > 100)) errors.push('Use a positive value, at most 100 for percentages.')
  if (typeof r.stackable !== 'boolean') errors.push('Stackable must be true or false.')
  if (r.scope === 'cart') {
    if (r.type !== 'percentage') errors.push('Cart rules support percentage discounts only.')
    if (!Number.isFinite(r.minCartValue) || r.minCartValue < 0) errors.push('Cart rules require a non-negative minimum cart value.')
    if (!['gte', 'gt'].includes(r.thresholdOperator)) errors.push('Cart threshold must specify gte or gt.')
    r.appliesTo = 'Entire cart'
  }
  return { data: errors.length ? null : { ruleId: r.ruleId.trim(), scope: r.scope, appliesTo: r.appliesTo?.trim(), type: r.type, value: r.value, stackable: r.stackable, ...(r.scope === 'cart' ? { minCartValue: r.minCartValue, thresholdOperator: r.thresholdOperator } : {}) }, errors }
}
export function validateCartItem(item) {
  const errors = []
  for (const key of ['itemId', 'product', 'brand', 'platform']) if (!text(item[key])) errors.push(`Missing ${key}.`)
  if (typeof item.basePrice !== 'number' || !Number.isFinite(item.basePrice) || item.basePrice <= 0) errors.push('Base price must be a positive number.')
  return errors
}
