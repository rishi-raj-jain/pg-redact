// Seeds realistic messages and classifies each one with Jev, so the table opens
// full of content-aware redactions. Run with: npm run db:seed
import { sql } from '../src/lib/db'
import { classify } from '../src/lib/jev'
import { generateCandidates } from '../src/lib/pii'

// Every message is a complete sentence that contains at least one identifier, so
// Guest sees redactions everywhere. Messages carrying an address or an id/DOB
// (sensitivity 3) stay partly sealed for Support Agent, while name/email/phone
// only ones open up fully. Admin sees all. A couple embed a non-PII decoy phrase
// ("the front office", "the downtown office") to show masking is content-aware.
const SEED: { source: string; body: string }[] = [
  {
    source: 'support',
    body: 'Hi, this is Maria Gomez and I was double charged, so please refund the card ending 4402 and email the receipt to maria.gomez@fastmail.com.',
  },
  {
    source: 'billing',
    body: 'Please credit invoice 88213 back to Daniel Brooks at daniel.brooks@acme.co, whose SSN on file is 402-11-9931.',
  },
  {
    source: 'intake',
    body: 'Patient David Okafor, born 03/14/1988, resides at 42 Elm Street in Denver and can be reached at d.okafor@clinicmail.org.',
  },
  {
    source: 'chat',
    body: 'My name is Wei Chen and you can reach me at 628-555-0170 about the downtown office move.',
  },
  {
    source: 'hr',
    body: 'Our new hire Priya Raman starts on Monday, so please send the welcome note to priya.raman@corp.io.',
  },
  {
    source: 'sales',
    body: 'Great call with the front office at Acme today, where the decision maker is Sandra Lee at sandra@acme.co.',
  },
  {
    source: 'support',
    body: 'Please update the mailing address for Rishi Jain to 900 Market Street, San Francisco, CA 94103.',
  },
  {
    source: 'finance',
    body: 'Wire the vendor payout to account 1234567890 for Thomas Nguyen at thomas@vendor.io.',
  },
  {
    source: 'intake',
    body: 'The caller would not leave a name but asked for a callback at (212) 555-0199 about the front office printer.',
  },
  {
    source: 'support',
    body: 'Please reset the password for Elena Petrova at elena.petrova@mail.com and verify her using the date of birth 09/12/1990.',
  },
]

async function main() {
  console.log(`Seeding ${SEED.length} messages through Jev...\n`)
  await sql`truncate table messages restart identity`
  let totalMs = 0
  for (const [i, m] of SEED.entries()) {
    const candidates = generateCandidates(m.body)
    const { spans, latencyMs, model } = await classify(m.body, candidates)
    totalMs += latencyMs
    await sql`
      insert into messages (source, body, spans)
      values (${m.source}, ${m.body}, ${JSON.stringify(spans)}::jsonb)
    `
    const summary = spans.map((s) => `${s.type}(${s.conf.toFixed(2)})`).join(', ') || 'none'
    console.log(`[${i + 1}/${SEED.length}] ${model} ${latencyMs}ms  ${candidates.length} candidates -> ${spans.length} PII: ${summary}`)
  }
  console.log(`\nDone. Avg Jev latency ${Math.round(totalMs / SEED.length)}ms.`)
}

main()
