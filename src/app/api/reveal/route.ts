import type { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { clearanceFor, isRole, SENSITIVITY, type PiiType, type Span } from '@/lib/pii'

type Row = { db_masked: string; spans: Span[] }

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Under-the-hood view: proves the redaction is enforced inside Postgres by the
 * redact() SQL function, not just in the front end. Returns the DB-masked string
 * for this role plus a value-free summary of what Jev found.
 */
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'))
  const roleParam = req.nextUrl.searchParams.get('role') ?? 'guest'
  const role = isRole(roleParam) ? roleParam : 'guest'
  if (!Number.isFinite(id)) return Response.json({ error: 'bad id' }, { status: 400 })
  const clearance = clearanceFor(role)
  const [row] = (await sql`
    select redact(body, spans, ${clearance}) as db_masked, spans
    from messages
    where id = ${id}
  `) as Row[]
  if (!row) return Response.json({ error: 'not found' }, { status: 404 })
  const findings = (Array.isArray(row.spans) ? row.spans : []).map((s) => ({
    type: s.type as PiiType,
    conf: s.conf,
    sensitivity: SENSITIVITY[s.type as PiiType] ?? 99,
    masked: (SENSITIVITY[s.type as PiiType] ?? 99) > clearance,
  }))
  return Response.json({ dbMasked: row.db_masked, findings, clearance })
}
