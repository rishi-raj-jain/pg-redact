import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Google_Sans, JetBrains_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'

const googleSans = Google_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pg-redact.vercel.app'
const TITLE = 'pg_redact — Content-aware PII redaction, enforced in Postgres'
const DESCRIPTION =
  'A live demo of content-aware PII redaction: a support inbox in Neon Postgres where Jev (TypeSafe System One) classifies every field, and a redact() SQL function reveals or seals it by your clearance level. Switch roles and watch the data mask in real time.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s — pg_redact',
  },
  description: DESCRIPTION,
  applicationName: 'pg_redact',
  category: 'technology',
  keywords: [
    'pg_redact',
    'PII redaction',
    'PII masking',
    'data masking',
    'PII detection',
    'Neon Postgres',
    'Postgres',
    'redact SQL function',
    'Jev',
    'TypeSafe',
    'System One model',
    'row-level security',
    'dynamic data masking',
    'redaction',
    'data privacy',
    'GDPR',
    'serverless Postgres',
  ],
  authors: [{ name: 'Rishi Raj Jain', url: 'https://rishi.app' }],
  creator: 'Rishi Raj Jain',
  publisher: 'Rishi Raj Jain',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'pg_redact',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    creator: '@rishi_raj_jain_',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: '#fafafa',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'pg_redact',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: {
    '@type': 'Person',
    name: 'Rishi Raj Jain',
    url: 'https://rishi.app',
  },
  about: [
    { '@type': 'Thing', name: 'PII masking' },
    { '@type': 'Thing', name: 'Neon Postgres' },
    { '@type': 'Thing', name: 'Jev by TypeSafe' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', googleSans.variable, jetbrainsMono.variable)}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </head>
      <body className="min-h-screen">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
