// The semantic core of the demo: what counts as PII, how sensitive each kind is,
// what each role is cleared to see, and how a stored message becomes a stream of
// render segments with the sensitive values stripped out for anyone under-cleared.

export type PiiType = 'email' | 'phone' | 'name' | 'address' | 'id_number'
export type Role = 'guest' | 'agent' | 'admin'

export type Span = { text: string; type: PiiType; conf: number }

export type Segment =
  | { kind: 'text'; value: string }
  | {
      kind: 'pii'
      type: PiiType
      conf: number
      masked: boolean
      // value is only ever populated for spans the viewer is cleared to see.
      value: string | null
      // length hint so a redaction bar can size itself without leaking content.
      len: number
    }

export type MessageDTO = {
  id: number
  source: string
  createdAt: string
  segments: Segment[]
  piiCount: number
  maskedCount: number
}

// How sensitive each PII kind is. Higher means more restricted.
export const SENSITIVITY: Record<PiiType, number> = {
  name: 1,
  email: 2,
  phone: 2,
  address: 3,
  id_number: 3,
}

// What each role is allowed to see. A viewer sees a span when their clearance is
// greater than or equal to the span's sensitivity.
export const ROLES: Record<Role, { label: string; clearance: number; blurb: string }> = {
  guest: {
    label: 'Guest',
    clearance: 0,
    blurb: 'No clearance. Every detected identifier is redacted.',
  },
  agent: {
    label: 'Support Agent',
    clearance: 2,
    blurb: 'Can see names, emails, and phone numbers. Addresses and IDs stay sealed.',
  },
  admin: {
    label: 'Admin',
    clearance: 3,
    blurb: 'Full clearance. Nothing is redacted.',
  },
}

export function clearanceFor(role: Role): number {
  return ROLES[role]?.clearance ?? 0
}

export function isRole(v: string): v is Role {
  return v === 'guest' || v === 'agent' || v === 'admin'
}

// The option set Jev classifies each candidate span into.
export const JEV_CRITERIA: Record<PiiType | 'none', string> = {
  email: 'an email address',
  phone: 'a phone or fax number',
  name: "a specific person's name",
  address: 'a physical or mailing address',
  id_number: 'a government id, financial account or card number, SSN, or date of birth',
  none: 'not personally identifiable information',
}

const MAX_CANDIDATES = 40
const STRUCTURED: RegExp[] = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, // email
  /\+?\d[\d\-.\s()]{6,}\d/g, // phone-ish runs
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b(?:\d[ -]?){13,16}\b/g, // card-ish
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // dates
  /\b\d{5,}\b/g, // long digit runs
  /@[A-Za-z0-9_]{2,}/g, // handles
]

function clean(tok: string): string {
  // Strip leading noise and any trailing punctuation (including a trailing dot),
  // while keeping internal dots so emails and handles stay intact.
  return tok.replace(/^[^A-Za-z0-9@#+]+/, '').replace(/[^A-Za-z0-9@]+$/, '')
}

/**
 * Generate candidate spans to hand to Jev. Deliberately broad and dumb: it is
 * just tokenization plus a few shape hints. Jev does the actual judging of which
 * candidates are PII and of what kind, which is the whole point of the demo.
 */
export function generateCandidates(text: string): string[] {
  const out = new Set<string>()

  // 1. Structured shapes first (highest priority, precise spans).
  for (const re of STRUCTURED) {
    for (const m of text.matchAll(re)) {
      const v = m[0].trim()
      if (v.length >= 3) out.add(v)
    }
  }

  // Tokenize with a light cleanup pass.
  const rawTokens = text.match(/\S+/g) ?? []
  const tokens = rawTokens.map(clean).filter((t) => t.length >= 2)
  const isCap = (t: string) => /^[A-Z][A-Za-z'.-]+$/.test(t)
  const isNum = (t: string) => /\d/.test(t)

  // 2. Capitalized runs (person and place names): "Maria Gomez", "Elm Street".
  for (let i = 0; i < tokens.length; i++) {
    if (!isCap(tokens[i])) continue
    let run = tokens[i]
    for (let j = i + 1; j < tokens.length && j - i < 4; j++) {
      if (!isCap(tokens[j])) break
      run += ' ' + tokens[j]
      out.add(run)
    }
    out.add(tokens[i])
  }

  // 3. Number-led runs (addresses): "42 Elm St".
  for (let i = 0; i < tokens.length; i++) {
    if (!isNum(tokens[i]) || tokens[i].length > 6) continue
    let run = tokens[i]
    for (let j = i + 1; j < tokens.length && j - i <= 3; j++) {
      if (!isCap(tokens[j]) && !/^(st|street|ave|avenue|rd|road|blvd|lane|ln|dr|drive|apt|suite)$/i.test(tokens[j])) break
      run += ' ' + tokens[j]
      out.add(run)
    }
  }

  // 4. Remaining single tokens that carry a digit, an @, or a dot (obfuscation).
  for (const t of tokens) {
    if (/[@]/.test(t) || (/\d/.test(t) && t.length >= 3) || /\w\.\w/.test(t)) out.add(t)
  }

  // 5. Backfill with any other alphabetic tokens so Jev gets a fair shot,
  //    ordered longest-first, until we hit the cap.
  const ranked = [...out]
  for (const t of tokens.sort((a, b) => b.length - a.length)) {
    if (ranked.length >= MAX_CANDIDATES) break
    if (!out.has(t) && /[A-Za-z]{3,}/.test(t)) {
      out.add(t)
      ranked.push(t)
    }
  }

  return [...out].slice(0, MAX_CANDIDATES)
}

/**
 * Turn a stored message body plus its classified spans into render segments,
 * stripping the value of any span the given clearance level cannot see.
 */
export function buildSegments(body: string, spans: Span[], clearance: number): Segment[] {
  type Iv = { start: number; end: number; type: PiiType; conf: number }
  const ivs: Iv[] = []

  for (const s of spans) {
    if (!s.text) continue
    let from = 0
    while (true) {
      const idx = body.indexOf(s.text, from)
      if (idx === -1) break
      ivs.push({
        start: idx,
        end: idx + s.text.length,
        type: s.type,
        conf: s.conf,
      })
      from = idx + s.text.length
    }
  }

  // Prefer earlier starts, then longer spans, and drop anything that overlaps
  // an already-accepted interval.
  ivs.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const accepted: Iv[] = []
  let guard = -1
  for (const iv of ivs) {
    if (iv.start < guard) continue
    accepted.push(iv)
    guard = iv.end
  }

  const segments: Segment[] = []
  let cursor = 0
  for (const iv of accepted) {
    if (iv.start > cursor) segments.push({ kind: 'text', value: body.slice(cursor, iv.start) })
    const masked = SENSITIVITY[iv.type] > clearance
    segments.push({
      kind: 'pii',
      type: iv.type,
      conf: iv.conf,
      masked,
      value: masked ? null : body.slice(iv.start, iv.end),
      len: iv.end - iv.start,
    })
    cursor = iv.end
  }
  if (cursor < body.length) segments.push({ kind: 'text', value: body.slice(cursor) })
  return segments
}
