import { Pool } from 'pg'
const state = globalThis as typeof globalThis & { staffSecurityPool?: Pool }
export const staffPool =
  state.staffSecurityPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  })
if (process.env.NODE_ENV !== 'production') state.staffSecurityPool = staffPool
