import {test} from 'node:test'
import assert from 'node:assert/strict'
import {invoiceFixture} from './fixtures'
import {calculateInvoice} from '../../src/lib/documents/invoice-calculation'
import {invoiceRequirements} from '../../src/lib/documents/invoice-requirements'
import {applyReviewDefaults} from '../../src/lib/documents/review-defaults'
import {zugferdIssues} from '../../src/lib/documents/validation-report'

test('rate/total mismatches and unknown units block approval before XML generation',()=>{
  const data=invoiceFixture()
  data.lines=[{...data.lines[0],unitPrice:'100',netAmount:'100'}, {...data.lines[0],quantity:'2',unitPrice:'15',netAmount:'30'}, {...data.lines[0],quantity:'3',unitPrice:'5',netAmount:'15',unitCode:'hrs'}]
  data.netAmount='145';data.taxAmount='9.06';data.grossAmount='154.06'
  assert.equal(calculateInvoice(data)?.tax,'27.55')
  assert.ok(invoiceRequirements(data).includes('taxAmount'))
  assert.ok(invoiceRequirements(data).includes('lines.2.unitCode'))
  data.lines[2].unitCode='HUR';data.taxAmount='27.55';data.grossAmount='172.55'
  assert.deepEqual(invoiceRequirements(data),[])
  data.lines[1].netAmount='31'
  assert.ok(invoiceRequirements(data).includes('lines.1.netAmount'))
})
test('EUR/DE defaults fill blanks without replacing explicit source values',()=>{
  const data=invoiceFixture();data.currency='USD';data.issuer.country='US';data.recipient.country=''
  const result=applyReviewDefaults(data)
  assert.equal(result.data.currency,'USD');assert.equal(result.data.issuer.country,'US');assert.equal(result.data.recipient.country,'DE')
  assert.deepEqual(result.fields,['recipient.country'])
  data.currency='';assert.equal(applyReviewDefaults(data).data.currency,'EUR')
})
test('validator errors retain rules and field paths, excluding nonfatal notices',()=>{
  const report=`<validation><xml><messages><error location="/IncludedSupplyChainTradeLineItem[3]/BilledQuantity">Value of '@unitCode' is not allowed. [ID FX-SCH-A-000613]</error><error>[BR-CO-14]-Invoice total VAT amount must equal the sum. [ID BR-CO-14]</error><notice>Optional profile notice</notice></messages></xml></validation>`
  const issues=zugferdIssues(report)
  assert.equal(issues.length,2);assert.equal(issues[0].field,'lines.2.unitCode');assert.equal(issues[1].field,'taxAmount')
  assert.deepEqual(zugferdIssues('<!DOCTYPE fake><validation/>'),[])
})
