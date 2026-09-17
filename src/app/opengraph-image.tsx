import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'pg_redact — content-aware PII redaction with Neon Postgres and Jev'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const logoDir = join(process.cwd(), 'public', 'logos')
const neonLogo = `data:image/svg+xml;base64,${readFileSync(join(logoDir, 'neon-logo.svg')).toString('base64')}`
const typesafeLogo = `data:image/png;base64,${readFileSync(join(logoDir, 'typesafe-logo.png')).toString('base64')}`

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#fafafa',
        padding: '72px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* top row: brand line with real logos */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          fontSize: 34,
          color: '#999999',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={neonLogo} width={157} height={45} alt="Neon" />
        <span>×</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={typesafeLogo} width={46} height={46} style={{ borderRadius: 999 }} alt="TypeSafe" />
          <span style={{ color: '#0a0a0a', fontWeight: 700 }}>Jev</span>
        </div>
      </div>

      {/* title block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: '#0a0a0a' }}>pg_redact</span>
          <span style={{ color: '#15803d' }}>()</span>
        </div>
        <div
          style={{
            fontSize: 34,
            color: '#444444',
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          Content-aware PII redaction, enforced in Postgres. Jev classifies every field, your role decides what shows.
        </div>
      </div>

      {/* mock redacted line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: 30,
          color: '#0a0a0a',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '22px 26px',
        }}
      >
        <span>Hi, this is</span>
        <span style={{ borderBottom: '3px solid #7c3aed', paddingBottom: 2 }}>Maria Gomez</span>
        <span>, refund the card ending</span>
        <div
          style={{
            width: 90,
            height: 30,
            background: '#0a0a0a',
            borderRadius: 5,
          }}
        />
        <span>and email</span>
        <span style={{ borderBottom: '3px solid #2563eb', paddingBottom: 2 }}>maria@…</span>
      </div>
    </div>,
    size,
  )
}
