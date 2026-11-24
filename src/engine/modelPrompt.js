export const instruction = 'Extract discount JSON. Scope must be exactly brand OR platform OR cart. Never invent missing fields. Default stackable false.'
export const examples = [
  {role:'user',content:'5% off for Acme brand, stackable'},
  {role:'assistant',content:JSON.stringify({scope:'brand',appliesTo:'Acme',type:'percentage',value:5,stackable:true})},
  {role:'user',content:'Rs.50 off all Amazon India items'},
  {role:'assistant',content:JSON.stringify({scope:'platform',appliesTo:'Amazon India',type:'flat',value:50,stackable:false})},
  {role:'user',content:'5% off cart over Rs.3000'},
  {role:'assistant',content:JSON.stringify({scope:'cart',appliesTo:'Entire cart',type:'percentage',value:5,stackable:false,minCartValue:3000,thresholdOperator:'gt'})},
  {role:'user',content:'8% off cart at least 2000'},
  {role:'assistant',content:JSON.stringify({scope:'cart',appliesTo:'Entire cart',type:'percentage',value:8,stackable:false,minCartValue:2000,thresholdOperator:'gte'})},
  {role:'user',content:'Discount large orders'},
  {role:'assistant',content:JSON.stringify({error:'Specify the discount amount and minimum cart value.'})},
]
