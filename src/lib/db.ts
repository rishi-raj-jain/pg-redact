import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

// One Neon HTTP client, safe on the request path (no pooling, no sockets to leak).
export const sql = neon(process.env.DATABASE_URL)
