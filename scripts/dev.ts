import { spawn, type ChildProcess } from 'node:child_process'

// Keep the website and its document worker together during local development.
const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' '),
}
const children: ChildProcess[] = []
let stopping = false
function stop(code: number) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children)
    if (child.pid && child.exitCode === null) {
      try {
        if (process.platform === 'win32') child.kill('SIGTERM')
        else process.kill(-child.pid, 'SIGTERM')
      } catch {
        /* Already exited. */
      }
    }
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
for (const args of [
  ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)],
  ['--import', 'tsx', 'scripts/document-worker.ts'],
]) {
  const child = spawn(process.execPath, args, {
    env,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  children.push(child)
  child.once('error', () => {
    console.error('[dev] Could not start website or document worker.')
    stop(1)
  })
  child.once('exit', (code) => {
    if (!stopping) stop(code || 0)
  })
}
