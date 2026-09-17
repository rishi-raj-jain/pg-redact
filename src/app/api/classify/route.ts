import { sql } from '@/lib/db'
import { classify } from '@/lib/jev'
import { buildSegments, clearanceFor, generateCandidates, isRole, type Span } from '@/lib/pii'
import { clientIp, DAILY_LIMIT, rateLimit } from '@/lib/ratelimit'

export const maxDuration = 300

type Row = {
  id: number
  source: string
  body: string
  spans: Span[]
  created_at: string
}

export async function POST(req: Request) {
  let payload: { body?: unknown; role?: unknown }
  try {
    payload = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const body = typeof payload.body === 'string' ? payload.body.trim() : ''
  if (!body) return Response.json({ error: 'Provide some text to classify.' }, { status: 400 })
  if (body.length > 2000) return Response.json({ error: 'Keep it under 2000 characters for the demo.' }, { status: 400 })
  const roleRaw = typeof payload.role === 'string' ? payload.role : 'guest'
  const role = isRole(roleRaw) ? roleRaw : 'guest'

  // Rate limit: DAILY_LIMIT new classifications per IP per day.
  const ip = clientIp(req)
  const rate = await rateLimit(ip)
  if (!rate.ok) {
    return Response.json(
      {
        error: `Daily limit reached (${DAILY_LIMIT} new queries per day). Try again tomorrow.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '86400',
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  const candidates = generateCandidates(body)
  let result
  try {
    result = await classify(body, candidates)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Jev request failed' }, { status: 502 })
  }
  const [row] = (await sql`
    insert into messages (source, body, spans)
    values ('pasted', ${body}, ${JSON.stringify(result.spans)}::jsonb)
    returning id, source, body, spans, created_at
  `) as Row[]
  const segments = buildSegments(row.body, result.spans, clearanceFor(role))
  const piiSegs = segments.filter((s) => s.kind === 'pii')
  return Response.json({
    message: {
      id: row.id,
      source: row.source,
      createdAt: row.created_at,
      segments,
      piiCount: piiSegs.length,
      maskedCount: piiSegs.filter((s) => s.kind === 'pii' && s.masked).length,
    },
    meta: {
      latencyMs: result.latencyMs,
      model: result.model,
      candidates: result.candidates,
      spansFound: result.spans.length,
      remaining: rate.remaining,
    },
  })
}
