'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Sparkles, Zap } from 'lucide-react'
import { ROLES, SENSITIVITY, type MessageDTO, type PiiType, type Role, type Segment } from '@/lib/pii'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'

const TYPE_LABEL: Record<PiiType, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  id_number: 'ID / financial',
}
const SENS_LABEL = ['none', 'low', 'medium', 'high']
const ROLE_ORDER: Role[] = ['guest', 'agent', 'admin']

type PasteMeta = {
  latencyMs: number
  model: string
  candidates: number
  spansFound: number
  remaining: number
}

export default function Page() {
  const [role, setRole] = useState<Role>('guest')
  const [messages, setMessages] = useState<MessageDTO[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (r: Role) => {
    setLoading(true)
    const res = await fetch(`/api/messages?role=${r}`, { cache: 'no-store' })
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load(role)
  }, [role, load])

  const totalPii = messages.reduce((n, m) => n + m.piiCount, 0)
  const totalMasked = messages.reduce((n, m) => n + m.maskedCount, 0)
  const clearance = ROLES[role].clearance

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Header />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="order-2 lg:order-1">
          <PasteBox role={role} onDone={() => load(role)} />

          <div className="mt-5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Live from Neon Postgres
              <span className="mono ml-2 text-muted-foreground/60">messages ↓ id</span>
            </h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="mt-3 space-y-3">
            {loading && messages.length === 0
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
              : messages.map((m) => <MessageCard key={m.id} m={m} role={role} clearance={clearance} />)}
          </div>
        </section>

        <aside className="order-1 space-y-5 lg:order-2 lg:sticky lg:top-6 lg:self-start">
          <RolePanel role={role} setRole={setRole} />
          <StatsPanel messages={messages.length} totalPii={totalPii} totalMasked={totalMasked} revealed={totalPii - totalMasked} />
          <LegendPanel clearance={clearance} />
        </aside>
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-5 text-xs text-muted-foreground">
        <span>PII detection by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/typesafe-logo.png" alt="TypeSafe" className="h-4 w-4 rounded-full" />
        <span className="text-foreground">Jev</span>
        <span>·</span>
        <span>redaction and storage in</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/neon-logomark.svg" alt="Neon" className="h-3.5 w-auto" />
        <span className="text-foreground">Neon Postgres</span>
      </footer>
    </main>
  )
}

function Header() {
  return (
    <header className="relative">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/neon-logo.svg" alt="Neon" className="h-7 w-auto" />
        <span className="text-lg text-muted-foreground/50">×</span>
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/typesafe-logo.png" alt="TypeSafe" className="h-7 w-7 rounded-full" />
          <span className="text-lg font-semibold tracking-tight">Jev</span>
        </span>
      </div>
      <h1 className="mono mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
        pg_redact<span className="text-primary">()</span>
      </h1>
      <p className="mt-2 text-sm font-medium text-foreground/90">Content-aware PII redaction, enforced in Postgres.</p>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        A support inbox in Postgres. Jev flags the personal data in each message, and Neon redacts or reveals it by your role.{' '}
        <em className="text-foreground/90">Not a blanket rule on a column</em>: masking is <em className="text-foreground font-semibold">content-aware</em>, so{' '}
        <em className="text-green-600">the front office</em> stays visible while a <em className="font-semibold text-yellow-600">phone number</em> in the same field does not.
      </p>
    </header>
  )
}

function RolePanel({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  const clearance = ROLES[role].clearance
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your role</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-1">
          {ROLE_ORDER.map((r) => (
            <Button key={r} size="sm" variant={role === r ? 'default' : 'ghost'} onClick={() => setRole(r)} className="text-xs">
              {ROLES[r].label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{ROLES[role].blurb}</p>
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Clearance level</span>
            <span className="mono text-foreground">{clearance} / 3</span>
          </div>
          <div className="mt-1.5 flex gap-1">
            {[1, 2, 3].map((lvl) => (
              <div
                key={lvl}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  background: clearance >= lvl ? 'var(--primary)' : 'var(--border)',
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsPanel({ messages, totalPii, totalMasked, revealed }: { messages: number; totalPii: number; totalMasked: number; revealed: number }) {
  const stats = [
    { label: 'Messages', value: messages, hue: 'var(--foreground)' },
    { label: 'Identifiers', value: totalPii, hue: 'var(--primary)' },
    { label: 'Redacted now', value: totalMasked, hue: 'var(--destructive)' },
    { label: 'Visible now', value: revealed, hue: 'var(--primary)' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="px-4">
            <div className="mono text-2xl font-semibold" style={{ color: s.hue }}>
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LegendPanel({ clearance }: { clearance: number }) {
  const types = (Object.keys(SENSITIVITY) as PiiType[]).sort((a, b) => SENSITIVITY[a] - SENSITIVITY[b])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PII types &amp; sensitivity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {types.map((t) => {
            const visible = SENSITIVITY[t] <= clearance
            return (
              <li key={t} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--pii-${t})` }} />
                  {TYPE_LABEL[t]}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {SENS_LABEL[SENSITIVITY[t]]}
                  {visible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <Lock className="h-3.5 w-3.5 text-destructive" />}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function MessageCard({ m, role, clearance }: { m: MessageDTO; role: Role; clearance: number }) {
  const [dbOpen, setDbOpen] = useState(false)
  const [dbText, setDbText] = useState<string | null>(null)
  const [dbLoading, setDbLoading] = useState(false)

  const fetchDb = useCallback(async () => {
    setDbLoading(true)
    const res = await fetch(`/api/reveal?id=${m.id}&role=${role}`, {
      cache: 'no-store',
    })
    const data = await res.json()
    setDbText(data.dbMasked ?? '')
    setDbLoading(false)
  }, [m.id, role])

  const toggleDb = async () => {
    const next = !dbOpen
    setDbOpen(next)
    if (next) await fetchDb()
  }

  useEffect(() => {
    if (dbOpen) fetchDb()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="mono">
            #{m.id}
          </Badge>
          <Badge variant="outline">{m.source}</Badge>
          {m.piiCount > 0 && (
            <span className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="text-primary">
                {m.piiCount} PII
              </Badge>
              {m.maskedCount > 0 && <Badge variant="destructive">{m.maskedCount} sealed</Badge>}
            </span>
          )}
        </div>

        <p className="leading-relaxed">
          {m.segments.map((seg, i) => (seg.kind === 'text' ? <span key={i}>{seg.value}</span> : <PiiMark key={i} seg={seg} clearance={clearance} />))}
        </p>

        {m.piiCount > 0 && (
          <div className="mt-3 border-t border-border/60 pt-2">
            <button onClick={toggleDb} className="text-xs text-muted-foreground/70 transition hover:text-muted-foreground">
              {dbOpen ? '▾' : '▸'} what Postgres returns for this role
            </button>
            {dbOpen && (
              <div className="pop mono mt-2 rounded-md border border-border/60 bg-background p-3 text-xs text-muted-foreground">
                {dbLoading ? (
                  <span>running redact() in Postgres…</span>
                ) : (
                  <>
                    <div className="mb-1 text-muted-foreground/60">
                      select redact(body, spans, {clearance}) from messages where id = {m.id};
                    </div>
                    <div className="whitespace-pre-wrap wrap-break-word text-foreground">{dbText}</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PiiMark({ seg, clearance }: { seg: Extract<Segment, { kind: 'pii' }>; clearance: number }) {
  const type = seg.type
  const sensitivity = SENSITIVITY[type]

  const trigger = seg.masked ? (
    <span className="redaction mono align-middle text-[0.9em]" title="Redacted">
      {'█'.repeat(Math.min(Math.max(seg.len, 3), 22))}
    </span>
  ) : (
    <span className="reveal-mark" style={{ ['--mark' as string]: `var(--pii-${type})` }}>
      {seg.value}
    </span>
  )

  return (
    <Popover>
      <PopoverTrigger nativeButton={false} render={trigger} />
      <PopoverContent align="center" className="flex w-64 flex-col gap-1.5 leading-normal">
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: `var(--pii-${type})` }}>
          {seg.masked ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {TYPE_LABEL[type]}
        </div>
        <div className="text-xs text-muted-foreground">
          Jev confidence <span className="mono text-foreground">{(seg.conf * 100).toFixed(0)}%</span>
        </div>
        <div className="text-xs text-muted-foreground">
          sensitivity <span className="text-foreground">{SENS_LABEL[sensitivity]}</span> · needs clearance <span className="mono text-foreground">{sensitivity}</span>, you have{' '}
          <span className="mono text-foreground">{clearance}</span>
        </div>
        <div className={`text-xs font-medium ${seg.masked ? 'text-destructive' : 'text-primary'}`}>{seg.masked ? 'Redacted by Neon for this role' : 'Cleared to view'}</div>
      </PopoverContent>
    </Popover>
  )
}

function PasteBox({ role, onDone }: { role: Role; onDone: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState<PasteMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    setMeta(null)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, role }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Something went wrong')
      else {
        setMeta(data.meta)
        setText('')
        onDone()
      }
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Add your own message
        </div>
        <p className="text-xs text-muted-foreground">
          Try obfuscated data (&ldquo;my email is jane dot doe at gmail dot com&rdquo;) or a decoy (&ldquo;meet at the corner of Hope and Main&rdquo;).
        </p>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
          }}
          rows={3}
          placeholder="Paste a support message, chat log, or intake note…"
          className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs">
            {meta && (
              <span className="flex items-center gap-1.5 text-primary">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  <span className="mono">{meta.model}</span> classified {meta.candidates} spans in <span className="mono">{meta.latencyMs}ms</span> · found {meta.spansFound} PII ·{' '}
                  {meta.remaining} left today
                </span>
              </span>
            )}
            {error && <span className="text-destructive">{error}</span>}
          </div>
          <Button onClick={submit} disabled={busy || !text.trim()} size="lg">
            {busy ? <Loader2 className="animate-spin" /> : <EyeOff />}
            Detect &amp; store
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
