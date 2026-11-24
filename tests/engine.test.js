import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseRulesCSV, parseCartCSV } from '../src/engine/csvParser.js'
import { priceCart, applyDiscounts } from '../src/engine/discountEngine.js'
import { validateRule } from '../src/engine/validation.js'
import { parsePositionedRows } from '../src/engine/pdfCart.js'
const rules=parseRulesCSV(readFileSync('sample-data/rules.csv','utf8')).data.filter(r=>r.scope!=='cart')
const cart=parseCartCSV(readFileSync('sample-data/cart.csv','utf8')).data
const offer={ruleId:'C',scope:'cart',appliesTo:'Entire cart',type:'percentage',value:10,stackable:false,minCartValue:4000,thresholdOperator:'gte'}
test('sample item and cart totals match brief',()=>{
 const r=priceCart(cart,[...rules,offer]);assert.deepEqual(r.items.map(i=>i.finalPrice),[1104,629,509,2499,382,809]);assert.equal(r.subtotal,5932);assert.equal(r.total,5339);assert.equal(r.cartOffers[0].saving,593);assert.equal(r.items[3].reasoning,'No offers available')
})
test('cart threshold is inclusive and sees post-item prices',()=>{
 const i={itemId:'I',product:'A',brand:'B',platform:'P',basePrice:4000}
 assert.equal(priceCart([i],[offer]).total,3600)
 assert.equal(priceCart([{...i,basePrice:3999}],[offer]).cartOffers.length,0)
 assert.equal(priceCart([i],[{...offer,thresholdOperator:'gt'}]).cartOffers.length,0)
 assert.equal(priceCart([i],[offer,{ruleId:'B',scope:'brand',appliesTo:'B',type:'flat',value:1,stackable:false}]).cartOffers.length,0)
})
test('flat discount cannot make price negative; only stackable offers work alone',()=>{
 assert.equal(applyDiscounts(cart[0],[{ruleId:'A',scope:'brand',appliesTo:cart[0].brand,type:'flat',value:99999,stackable:false}]).finalPrice,0)
 assert.equal(priceCart([], [offer]).cartOffers.length,0)
 assert.equal(applyDiscounts(cart[0],[{ruleId:'A',scope:'brand',appliesTo:cart[0].brand,type:'percentage',value:10,stackable:true}]).finalPrice,1169)
})
test('malformed CSV, booleans, duplicate IDs, Infinity and over-100 percentages rejected atomically',()=>{
 for(const value of ['Infinity','12abc','101']) assert.ok(parseRulesCSV(`rule_id,scope,applies_to,type,value,stackable\nA,brand,B,percentage,${value},false`).errors.length)
 assert.ok(parseRulesCSV('rule_id,scope,applies_to,type,value,stackable\nA,brand,B,flat,10,perhaps').errors.length)
 assert.ok(parseCartCSV('item_id,product,brand,platform,base_price\nA,Good,B,P,10\nA,Other,B,P,5').errors.length)
 assert.equal(parseCartCSV('item_id,product,brand,platform,base_price\nA,Good,B,P,10\nB,Bad,B,P,nope').data.length,0)
})
test('rule validator rejects incomplete and invalid model fields',()=>{
 assert.ok(validateRule({...offer,value:101}).errors.length)
 assert.ok(validateRule({...offer,minCartValue:null}).errors.length)
 assert.ok(validateRule({...offer,stackable:'true'}).errors.length)
})
const row=(cells)=>cells.map((text,i)=>({text,x:i*150}))
test('PDF positioned text reconstructs multiword fields and rejects malformed rows',()=>{
 const rows=[row(['Product','Brand','Platform','Base Price']),row(['Cushion Cover','Natura Casa','Amazon India','Rs.1,299'])]
 assert.equal(parsePositionedRows(rows).data[0].basePrice,1299)
 assert.equal(parsePositionedRows(rows).data[0].brand,'Natura Casa')
 assert.ok(parsePositionedRows([...rows,row(['Bad','B','P','no'])]).errors.length)
 assert.ok(parsePositionedRows([]).errors.length)
})
test('cart chooses largest competing saving, applies stacks once, and ties preserve input order',()=>{
 const item={itemId:'I',product:'P',brand:'B',platform:'P',basePrice:5000}
 const r=priceCart([item],[offer,{...offer,ruleId:'BETTER',value:20},{...offer,ruleId:'STACK',value:10,stackable:true}])
 assert.deepEqual(r.cartOffers.map(o=>o.ruleId),['BETTER','STACK'])
 assert.equal(r.total,3600)
 const tied=applyDiscounts(item,[{ruleId:'FIRST',scope:'brand',appliesTo:'B',type:'flat',value:500,stackable:false},{ruleId:'SECOND',scope:'platform',appliesTo:'P',type:'percentage',value:10,stackable:false}])
 assert.deepEqual(tied.appliedRules,['FIRST'])
 assert.deepEqual(tied.skippedRules,['SECOND'])
})
