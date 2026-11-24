// Optional LLM endpoint. Needs GEMINI_API_KEY set in the Netlify site environment.
// Without a key it answers 503 and the app falls back to the built-in parser.
import { instruction, examples } from '../../src/engine/modelPrompt.js'
import { validateRule } from '../../src/engine/validation.js'
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)
  const key = process.env.GEMINI_API_KEY
  if (!key) return json({ error: 'LLM endpoint not configured.' }, 503)
  let text
  try { text = (await request.json()).text } catch { return json({ error: 'Invalid JSON.' }, 400) }
  if (typeof text !== 'string' || text.trim().length < 5 || text.length > 1000) return json({ error: 'Describe a rule in 5 to 1,000 characters.' }, 422)
  if (!/\d/.test(text)) return json({ error: 'Specify a numeric discount amount and, for a cart offer, its threshold.' }, 422)
  const contents = [...examples, { role: 'user', content: text }].map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  let parsed
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents, generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 220 } }),
    })
    if (!r.ok) return json({ error: 'LLM unavailable.' }, 503)
    parsed = JSON.parse((await r.json()).candidates[0].content.parts[0].text)
  } catch { return json({ error: 'The model returned an unusable answer. Nothing was added.' }, 502) }
  if (parsed.error) return json({ error: String(parsed.error).slice(0, 250) }, 422)
  const { data, errors } = validateRule({ ...parsed, ruleId: 'PREVIEW' })
  if (errors.length) return json({ error: `Invalid model output: ${errors.join(' ')}` }, 422)
  return json({ rule: data })
}
export const config = { path: '/api/parse-rule' }
