import type { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { buildSegments, clearanceFor, isRole, type Span } from '@/lib/pii'

export const maxDuration = 300

type Row = {
  id: number
  source: string
  body: string
  spans: Span[]
  created_at: string
}

export async function GET(req: NextRequest) {
  const roleParam = req.nextUrl.searchParams.get('role') ?? 'guest'
  const role = isRole(roleParam) ? roleParam : 'guest'
  const clearance = clearanceFor(role)
  const rows = (await sql`
    select id, source, body, spans, created_at
    from messages
    order by id desc
  `) as Row[]
  const messages = rows.map((r) => {
    const spans = Array.isArray(r.spans) ? r.spans : []
    const segments = buildSegments(r.body, spans, clearance)
    const piiSegs = segments.filter((s) => s.kind === 'pii')
    return {
      id: r.id,
      source: r.source,
      createdAt: r.created_at,
      segments,
      piiCount: piiSegs.length,
      maskedCount: piiSegs.filter((s) => s.kind === 'pii' && s.masked).length,
    }
  })
  return Response.json({ role, clearance, messages })
}
