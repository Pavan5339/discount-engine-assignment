// Built-in deterministic parser. Used only when no LLM endpoint is reachable.
// Output goes through the same validateRule and confirmation step as the LLM path.
const num = (s) => Number(String(s).replace(/,/g, ''))
export function parseRuleText(input) {
  const t = String(input || '').trim()
  if (t.length < 5) throw new Error('Describe a rule in at least 5 characters.')
  const pct = t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i)
  const flat = t.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:flat|off|discount)?/i)
  const thr = t.match(/(more than|over|above|greater than|exceeds?|at least|minimum|min\.?|>=|>)\s*(?:of\s*)?(?:cart value\s*(?:of)?\s*)?(?:rs\.?|inr|₹)?\s*([\d,]+)/i)
  const cartWords = /\b(cart|order|basket|bill)\b/i.test(t)
  const stackable = /\bstackable\b/i.test(t) && !/\b(not|non|un)[- ]?stackable\b/i.test(t)
  if (!pct && !flat) throw new Error('Specify the discount amount (for example 10% or Rs.100) and, for a cart offer, the minimum cart value.')
  if (cartWords && /(value|total|worth|over|above|more than|at least|minimum)/i.test(t)) {
    if (!pct) throw new Error('Cart offers support percentage discounts only.')
    if (!thr) throw new Error('A cart offer needs a minimum cart value, for example "10% off if cart value is more than Rs.5,000".')
    return { scope: 'cart', appliesTo: 'Entire cart', type: 'percentage', value: num(pct[1]), stackable, minCartValue: num(thr[2]), thresholdOperator: /at least|minimum|min|>=/i.test(thr[1]) ? 'gte' : 'gt' }
  }
  const type = pct && (!flat || t.indexOf(pct[0]) < t.indexOf(flat[0])) ? 'percentage' : 'flat'
  const value = type === 'percentage' ? num(pct[1]) : num(flat[1])
  let m = t.match(/\b(?:for|on)\s+(.+?)\s+brand\b/i) || t.match(/\bbrand\s+(.+?)(?:[,.]|\s+stackable|$)/i)
  if (m) return { scope: 'brand', appliesTo: m[1].replace(/^(all|the)\s+/i, '').trim(), type, value, stackable }
  m = t.match(/\b(?:on|for)\s+(?:all\s+)?(.+?)\s+(?:items|products|orders|platform)\b/i) || t.match(/\b(?:on|for)\s+(?:all\s+)?(.+?)\s*(?:,|$)/i)
  if (m) return { scope: 'platform', appliesTo: m[1].trim(), type, value, stackable }
  throw new Error('Name the brand or platform the offer applies to.')
}
