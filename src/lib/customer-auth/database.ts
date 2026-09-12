import { Pool } from 'pg'

const globalDatabase = globalThis as typeof globalThis & { customerPool?: Pool }

// A separate search_path keeps customer authentication out of Payload's schema.
export const customerPool =
  globalDatabase.customerPool ??
  new Pool({
    connectionString: process.env.CUSTOMER_DATABASE_URL || process.env.DATABASE_URL,
    options: '-c search_path=customer_auth',
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  })
if (process.env.NODE_ENV !== 'production') globalDatabase.customerPool = customerPool
