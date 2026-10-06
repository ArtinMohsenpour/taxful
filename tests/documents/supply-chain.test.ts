import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextLint = createRequire(require.resolve('eslint-config-next'))
const plugin = createRequire(nextLint.resolve('@next/eslint-plugin-next'))
const glob = createRequire(plugin.resolve('fast-glob'))
const micromatch = createRequire(glob.resolve('micromatch'))
const braces = micromatch('braces') as {
  parse: (pattern: string) => unknown
  compile: (pattern: string) => string
  stringify: (pattern: string) => string
  expand: (pattern: string) => string[]
}

test('the installed development glob parser rejects excessive nesting before recursive AST processing', () => {
  const nested = '{'.repeat(2000) + 'a,b' + '}'.repeat(2000)
  for (const method of ['parse', 'compile', 'stringify', 'expand'] as const) {
    assert.throws(() => braces[method](nested), /nesting exceeds 100/)
  }
  assert.deepEqual(braces.expand('src/{app,lib}/**/*.ts'), ['src/app/**/*.ts', 'src/lib/**/*.ts'])
  assert.equal(braces.stringify('src/{app,lib}/**/*.ts'), 'src/{app,lib}/**/*.ts')
})
