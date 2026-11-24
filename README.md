# Discount engine (Opptra FDE case study)

Live demo: LIVE_URL_HERE

## Run locally (3 steps)

1. `npm install`
2. `npm run dev`
3. Open http://localhost:5173 and click **Load sample data**.

## What it does

- Item rules: the largest non-stackable saving wins, then stackable rules apply. Sample result: 1,104 / 629 / 509 / 2,499 / 382 / 809, subtotal 5,932, cart offer -593, final total 5,339.
- Cart offer: checked against the sum of final item prices, shown as one separate line, hidden when under the threshold.
- Natural language rules: text goes to `/api/parse-rule` (Netlify Function, Gemini, needs `GEMINI_API_KEY`). If that endpoint is missing or down, a built-in deterministic parser handles the same input. Either way the result is validated, shown in a confirmation step, and only added after Confirm. Vague input ("discount for big orders") returns an error and adds nothing.
- PDF cart upload: PDF.js reads the table in the browser and replaces the cart; active rules are kept. A malformed row rejects the whole file so the old cart stays intact.
- Rule/cart CSV imports are atomic for the same reason.

## Design choices

- Whole-rupee rounding matches the starter's expected results.
- No partial PDF import, because a partial cart could give a wrong total without warning.
- No OCR: the brief specifies a simple text table.
- The built-in parser is a fallback, not an LLM. It is labelled as such in the UI.
- Tests: `npm test`.

AI coding assistance was used, as the brief allows.
