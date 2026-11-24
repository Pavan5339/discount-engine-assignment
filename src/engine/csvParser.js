import Papa from 'papaparse'
import { validateRule, validateCartItem } from './validation.js'

function parse(csvText, convert, validate) {
  const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_') })
  if (parsed.errors.length) return { data: [], errors: parsed.errors.map(e => `CSV: ${e.message}`) }
  const data = [], errors = [], ids = new Set()
  if (!parsed.data.length) errors.push('The file has no data rows.')
  parsed.data.forEach((row, i) => {
    const value = convert(row), issues = validate(value)
    const id = value.ruleId ?? value.itemId
    if (ids.has(id)) issues.push('Duplicate ID.')
    ids.add(id)
    issues.forEach(issue => errors.push(`Row ${i + 2}: ${issue}`))
    if (!issues.length) data.push(value)
  })
  // Atomic import: never calculate a partial cart or silently drop bad rules.
  return { data: errors.length ? [] : data, errors }
}
const number = value => value?.trim() ? Number(value) : NaN
export function parseRulesCSV(text) {
  return parse(text, r => ({ ruleId: r.rule_id?.trim(), scope: r.scope?.trim().toLowerCase(), appliesTo: r.applies_to?.trim() || (r.scope?.trim().toLowerCase() === 'cart' ? 'Entire cart' : ''), type: r.type?.trim().toLowerCase(), value: number(r.value), stackable: r.stackable?.trim().toLowerCase() === 'true' ? true : r.stackable?.trim().toLowerCase() === 'false' ? false : null, ...(r.scope?.trim().toLowerCase() === 'cart' ? { minCartValue: number(r.min_cart_value), thresholdOperator: r.threshold_operator?.trim() || 'gte' } : {}) }), r => validateRule(r).errors)
}
export function parseCartCSV(text) {
  return parse(text, r => ({ itemId: r.item_id?.trim(), product: r.product?.trim(), brand: r.brand?.trim(), platform: r.platform?.trim(), basePrice: number(r.base_price) }), validateCartItem)
}
