import { JEV_CRITERIA, type PiiType, type Span } from './pii'

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const MODEL = 'jev-latest'
const CONF_THRESHOLD = 0.5

type ChoiceAnswer = {
  type: 'choice'
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

type JevResponse = {
  model: string
  answers: Record<string, ChoiceAnswer>
  usage?: { input_tokens: number; output_tokens: number }
}

export type ClassifyResult = {
  spans: Span[]
  latencyMs: number
  model: string
  candidates: number
}

/**
 * Ask Jev to classify each candidate span in the context of the full text.
 * One System One request, one choice question per candidate, all decided in a
 * single parallel pass. Jev returns a typed label and calibrated probabilities,
 * so we keep the spans it is confident are PII.
 */
export async function classify(text: string, candidates: string[]): Promise<ClassifyResult> {
  const apiKey = process.env.TYPESAFE_API_KEY
  if (!apiKey) throw new Error('TYPESAFE_API_KEY is not set')

  if (candidates.length === 0) return { spans: [], latencyMs: 0, model: MODEL, candidates: 0 }

  const questions: Record<string, unknown> = {}
  candidates.forEach((c, i) => {
    questions[`q${i}`] = {
      type: 'choice',
      instructions: `In the text, classify the span "${c}". Pick "none" unless it identifies a specific real individual.`,
      criteria: JEV_CRITERIA,
    }
  })

  const started = Date.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, state: text, questions }),
  })
  const latencyMs = Date.now() - started

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Jev request failed (${res.status}): ${detail.slice(0, 500)}`)
  }

  const data = (await res.json()) as JevResponse

  const bestByText = new Map<string, Span>()
  candidates.forEach((c, i) => {
    const a = data.answers[`q${i}`]
    if (!a || a.choice === 'none') return
    const type = a.choice as PiiType
    const conf = a.probabilities?.[a.choice] ?? a.confidence ?? 0
    if (conf < CONF_THRESHOLD) return
    const existing = bestByText.get(c)
    if (!existing || conf > existing.conf) bestByText.set(c, { text: c, type, conf })
  })

  return {
    spans: [...bestByText.values()],
    latencyMs,
    model: data.model || MODEL,
    candidates: candidates.length,
  }
}
