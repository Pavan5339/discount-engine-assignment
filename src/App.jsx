import { parseRuleText } from './engine/ruleTextParser.js'
import { useMemo, useState } from 'react'
import DataTable from './components/DataTable.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import { parseCartPDF } from './engine/pdfCart.js'
import { priceCart } from './engine/discountEngine.js'
import { validateRule } from './engine/validation.js'
import sampleRules from '../sample-data/rules.csv?raw'
import sampleCart from '../sample-data/cart.csv?raw'
const money=n=>`Rs.${n.toLocaleString('en-IN')}`
const ruleColumns=[{key:'ruleId',label:'ID'},{key:'scope',label:'Scope'},{key:'appliesTo',label:'Applies to'},{key:'value',label:'Discount',render:(v,r)=>r.type==='percentage'?`${v}%`:money(v)},{key:'stackable',label:'Stacks',render:v=>v?'Yes':'No'},{key:'minCartValue',label:'Minimum',render:(v,r)=>v===undefined?'-':`${r.thresholdOperator==='gt'?'>':'>='} ${money(v)}`}]
const itemColumns=[{key:'product',label:'Product'},{key:'brand',label:'Brand'},{key:'platform',label:'Platform'},{key:'basePrice',label:'Base',render:money},{key:'finalPrice',label:'Final',render:money},{key:'reasoning',label:'Offer applied'}]
function Upload({label,accept,onFile,busy}) { return <label className="upload">{label}<input aria-label={label} type="file" accept={accept} disabled={busy} onChange={e=>{const file=e.target.files[0];if(file)onFile(file);e.target.value=''}}/></label> }
export default function App(){
  const [rules,setRules]=useState([]),[cart,setCart]=useState([]),[errors,setErrors]=useState([]),[notice,setNotice]=useState(''),[text,setText]=useState(''),[preview,setPreview]=useState(null),[parsing,setParsing]=useState(false),[loading,setLoading]=useState(false)
  const result=useMemo(()=>priceCart(cart,rules),[cart,rules])
  function replace(parsed,kind,name){
    setErrors(parsed.errors)
    if(parsed.errors.length){setNotice('Import rejected. Your previous data is unchanged.');return}
    if(kind==='rules'){setRules(parsed.data);setPreview(null)} else setCart(parsed.data)
    setNotice(`${name}: ${parsed.data.length} ${kind==='rules'?'rules':'items'} loaded. ${kind==='cart'?'Previous cart replaced.':''}`)
  }
  async function upload(file,kind){
    setLoading(true);setErrors([])
    try{if(file.size>10*1024*1024)throw new Error('Use a file smaller than 10 MB.')
      const parsed=kind==='pdf'?await parseCartPDF(file):kind==='rules'?parseRulesCSV(await file.text()):parseCartCSV(await file.text())
      replace(parsed,kind==='pdf'?'cart':kind,file.name)
    }catch(e){setErrors([e.message])}finally{setLoading(false)}
  }
  async function parseRule(){
    setParsing(true);setErrors([]);setPreview(null)
    try{
      let rule,via='llm'
      try{
        const response=await fetch('/api/parse-rule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})
        const isJson=response.headers.get('content-type')?.includes('application/json')
        const body=isJson?await response.json():null
        if(isJson&&response.status===422)throw new Error(body.error||'Could not parse rule.')
        if(!isJson||!response.ok||!body?.rule)throw Object.assign(new Error('unavailable'),{fallback:true})
        rule=body.rule
      }catch(e){
        if(!e.fallback&&e.message!=='Failed to fetch')throw e
        rule={...parseRuleText(text),ruleId:'PREVIEW'};via='builtin'
      }
      const checked=validateRule(rule)
      if(checked.errors.length)throw new Error(checked.errors.join(' '))
      setNotice(via==='llm'?'Parsed by the LLM. Review the fields, then confirm or discard.':'LLM endpoint unavailable, so the built-in rule parser was used. Review the fields, then confirm or discard.')
      setPreview(checked.data)
    }catch(e){setErrors([e.message])}finally{setParsing(false)}
  }
  function confirm(){
    const id=`CUSTOM-${globalThis.crypto.randomUUID().slice(0,8)}`
    const checked=validateRule({...preview,ruleId:id})
    if(checked.errors.length){setErrors(checked.errors);return}
    setRules(previous=>[...previous,checked.data]);setPreview(null);setText('');setNotice('Rule confirmed and added. Current cart recalculated.')
  }
  return <><header><span className="wordmark">O<span>pp</span>tra</span><span>DISCOUNT ENGINE</span></header><main>
    <div className="intro"><div><p className="eyebrow">CUSTOMER PRICING</p><h1>Every offer. One clear total.</h1><p>Choose the best item offer, stack eligible savings, then apply the cart offer.</p></div><button className="secondary" onClick={()=>{setRules(parseRulesCSV(sampleRules).data);setCart(parseCartCSV(sampleCart).data);setErrors([]);setPreview(null);setNotice('Sample rules and cart loaded.')}}>Load sample data</button></div>
    <div role="status" className="notice">{notice||'Start with the sample data or upload your own CSVs.'}{loading?' Reading file...':''}</div><ErrorBanner errors={errors}/>
    <div className="inputs"><section><h2>01 / Discount rules</h2><Upload label="Upload rules CSV" accept=".csv" onFile={f=>upload(f,'rules')} busy={loading}/><p className="muted">{rules.length} active rules. Imports replace the rule list.</p><DataTable columns={ruleColumns} rows={rules}/></section>
    <section><h2>02 / Cart input</h2><div className="actions"><Upload label="Upload cart CSV" accept=".csv" onFile={f=>upload(f,'cart')} busy={loading}/><Upload label="Upload cart PDF" accept=".pdf" onFile={f=>upload(f,'pdf')} busy={loading}/></div><p>PDF columns: Product, Brand, Platform, Base Price.</p><p className="muted">Text PDFs only, up to 10 MB / 20 pages. Invalid imports leave your cart unchanged. Files stay on this device.</p><div className="counter">{cart.length}<span> items in the current cart</span></div></section></div>
    <section><h2>03 / Describe a new offer</h2><p>An LLM (or the built-in parser if no LLM is configured) proposes a rule. Review every field before it affects the cart.</p><label htmlFor="rule-text" className="muted">Include amount, scope and any minimum cart value.</label><textarea id="rule-text" maxLength={1000} value={text} onChange={e=>{setText(e.target.value);setPreview(null)}} placeholder="20% off for Natura Casa brand, stackable with other offers"/><div className="actions"><button onClick={parseRule} disabled={parsing||text.trim().length<5}>{parsing?'Parsing...':'Parse offer'}</button><span className="muted">Nothing changes until you confirm.</span></div>
    {preview&&<div className="preview"><h3>Review proposed rule</h3><DataTable columns={ruleColumns} rows={[preview]}/><p>Confirming adds this offer and recalculates the current cart.</p><div className="actions"><button onClick={confirm}>Confirm and add rule</button><button className="secondary" onClick={()=>setPreview(null)}>Discard</button></div></div>}</section>
    <section><div className="section-top"><h2>Cart summary</h2><span className="pill">{cart.length?'Recalculates automatically':'No cart loaded'}</span></div><DataTable columns={itemColumns} rows={result.items}/>{cart.length>0&&<div className="totals"><div><span>After item offers</span><strong>{money(result.subtotal)}</strong></div>{result.cartOffers.map(o=><div className="saving" key={o.ruleId}><span>{o.reasoning} <small>({o.ruleId})</small></span><strong>-{money(o.saving)} saved</strong></div>)}<div className="grand"><span>Final cart total</span><strong>{money(result.total)}</strong></div><p>You save {money(result.savings)} in total.</p></div>}</section>
    <footer>Session-only data. Whole-rupee discount rounding follows the starter engine. Review build, not submitted.</footer>
  </main></>
}
