import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'pg_redact — content-aware PII redaction in Postgres',
    short_name: 'pg_redact',
    description: 'Role-based, content-aware PII redaction with Neon Postgres and Jev.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#fafafa',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
