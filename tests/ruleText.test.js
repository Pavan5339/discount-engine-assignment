import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRuleText } from '../src/engine/ruleTextParser.js'
import { validateRule } from '../src/engine/validation.js'
const ok = (t) => { const r = validateRule({ ...parseRuleText(t), ruleId: 'X' }); assert.deepEqual(r.errors, []); return r.data }
test('brand', () => { const r = ok('20% off for Natura Casa brand, stackable with other offers'); assert.deepEqual([r.scope, r.appliesTo, r.type, r.value, r.stackable], ['brand', 'Natura Casa', 'percentage', 20, true]) })
test('platform flat', () => { const r = ok('Rs.100 flat discount on all Flipkart items'); assert.deepEqual([r.scope, r.appliesTo, r.type, r.value, r.stackable], ['platform', 'Flipkart', 'flat', 100, false]) })
test('cart', () => { const r = ok('10% off if cart value is more than Rs.5,000'); assert.deepEqual([r.scope, r.type, r.value, r.minCartValue, r.thresholdOperator], ['cart', 'percentage', 10, 5000, 'gt']) })
test('ambiguous', () => { assert.throws(() => parseRuleText('Give a discount for big orders')) })
