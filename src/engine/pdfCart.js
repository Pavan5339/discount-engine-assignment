import { validateCartItem } from './validation.js'

/** Expected PDF: a text table with Product / Brand / Platform / Base Price.
 * Reconstruct columns from positioned text. Reject, rather than guess, layouts
 * with wrapped rows or scanned images. Never send uploaded PDFs to a service.
 */
export function parsePositionedRows(rows) {
  let columns = null
  const data = [], errors = []
  for (const row of rows) {
    const sorted = [...row].sort((a,b) => a.x-b.x)
    const line = sorted.map(t => t.text).join(' ').trim()
    if (!line || /^[-_\s]+$/.test(line)) continue
    if (/product/i.test(line) && /brand/i.test(line) && /platform/i.test(line) && /base\s*price/i.test(line)) {
      columns = ['product', 'brand', 'platform', 'base'].map(name => sorted.find(t => t.text.toLowerCase().startsWith(name))?.x)
      if (columns.some(x => x === undefined)) return { data: [], errors: ['PDF headers must be in separate aligned columns.'] }
      continue
    }
    if (!columns) continue // ignore order number/date above the table
    const cells = ['', '', '', '']
    sorted.forEach(t => {
      let index = 0
      for (let i=1;i<4;i++) if (t.x >= columns[i]-3) index=i
      cells[index] += (cells[index] ? ' ' : '') + t.text
    })
    const item = { itemId: `PDF-${String(data.length+1).padStart(2,'0')}`, product: cells[0], brand: cells[1], platform: cells[2], basePrice: Number(cells[3].replace(/^(?:Rs\.?|INR|₹)\s*/i,'').replaceAll(',','').trim() || NaN) }
    const issues = validateCartItem(item)
    if (issues.length) errors.push(`PDF row ${data.length + errors.length + 1}: ${issues.join(' ')}`)
    else data.push(item)
  }
  if (!columns) errors.push('No supported table found. Use Product, Brand, Platform and Base Price headers. Scanned PDFs are not supported.')
  if (!data.length && !errors.length) errors.push('The PDF contains no cart rows.')
  return { data: errors.length ? [] : data, errors }
}
export async function parseCartPDF(file) {
  if (file.size > 10 * 1024 * 1024) return { data: [], errors: ['PDF must be smaller than 10 MB.'] }
  let pdf
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise
    if (pdf.numPages > 20) throw new Error('Use a PDF with 20 pages or fewer.')
    const rows = []
    for (let n=1;n<=pdf.numPages;n++) {
      const content = await (await pdf.getPage(n)).getTextContent()
      const pageRows = []
      for (const t of content.items) {
        if (!t.str?.trim()) continue
        const y=t.transform[5]
        let row=pageRows.find(r => Math.abs(r.y-y)<3)
        if (!row) { row={ y, values: [] }; pageRows.push(row) }
        row.values.push({ x:t.transform[4], text:t.str.trim() })
      }
      rows.push(...pageRows.sort((a,b)=>b.y-a.y).map(r=>r.values))
    }
    return parsePositionedRows(rows)
  } catch (error) { return { data: [], errors: [error.name === 'PasswordException' ? 'Password-protected PDFs are not supported.' : `Cannot read this PDF. ${error.message}`] } }
  finally { if(pdf) await pdf.destroy() }
}
