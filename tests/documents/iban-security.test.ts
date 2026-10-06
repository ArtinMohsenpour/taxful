import test from 'node:test'
import assert from 'node:assert/strict'
import { validIban } from '../../src/lib/documents/invoice-requirements'

test('IBAN validation combines registered country length, checksum and German numeric structure', () => {
  for (const value of [
    'DE89370400440532013000',
    'de89 3704 0044 0532 0130 00',
    'GB82WEST12345698765432',
    'FR1420041010050500013M02606',
    'NO9386011117947',
  ]) {
    assert.equal(validIban(value), true, value)
  }
  function checksum(country: string, account: string) {
    const digits = (account + country + '00').replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
    return country + String(98n - (BigInt(digits) % 97n)).padStart(2, '0') + account
  }
  for (const value of [
    checksum('DE', '1234567890123456789'),
    checksum('ZZ', '123456789012345678'),
    checksum('DE', 'A23456789012345678'),
    'DE00370400440532013000',
    ' '.repeat(10000),
  ]) {
    assert.equal(validIban(value), false)
  }
})
