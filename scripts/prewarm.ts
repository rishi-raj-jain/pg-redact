// Warm the buffer cache after a Neon scale-to-zero cold start, so the first
// request does not pay for reading the table and its primary-key index from
// storage. No secondary indexes exist by design: the list query reads every row
// (a full scan an index cannot beat) and the id lookup already uses messages_pkey.
// Run with: npm run db:prewarm
import { sql } from '../src/lib/db'

const RELATIONS = ['messages', 'messages_pkey']

async function main() {
  await sql.query('create extension if not exists pg_prewarm')
  for (const rel of RELATIONS) {
    const rows = (await sql.query('select pg_prewarm($1) as blocks', [rel])) as { blocks: number }[]
    console.log(`prewarmed ${rel}: ${rows[0]?.blocks ?? 0} blocks`)
  }
  console.log('\nBuffer cache is warm.')
}

main()
