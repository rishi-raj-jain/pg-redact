import { ipAddress } from '@vercel/functions'
import { sql } from './db'

export const DAILY_LIMIT = 10

/**
 * Resolve the client IP. On Vercel `ipAddress()` reads the platform header;
 * elsewhere we fall back to the first x-forwarded-for hop, then to a shared
 * "local" bucket for development.
 */
export function clientIp(req: Request): string {
  const fromVercel = ipAddress(req)
  if (fromVercel) return fromVercel
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return 'local'
}

export type RateResult = {
  ok: boolean
  count: number
  remaining: number
  limit: number
}

/**
 * Atomically count one request against today's per-IP budget and report whether
 * it is still within the daily limit. The counter resets each calendar day.
 */
export async function rateLimit(ip: string): Promise<RateResult> {
  const rows = (await sql`
    insert into rate_limits (ip, day, count)
    values (${ip}, current_date, 1)
    on conflict (ip, day) do update set count = rate_limits.count + 1
    returning count
  `) as { count: number }[]

  const count = rows[0]?.count ?? 1
  return {
    ok: count <= DAILY_LIMIT,
    count,
    remaining: Math.max(0, DAILY_LIMIT - count),
    limit: DAILY_LIMIT,
  }
}
