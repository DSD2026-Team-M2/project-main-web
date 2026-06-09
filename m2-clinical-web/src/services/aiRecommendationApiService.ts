/**
 * aiRecommendationApiService — calls the local FastAPI wrapper (ai-service).
 *
 * Dev: Vite proxies /ai-api → localhost:8001 (see vite.config.ts).
 * Prod: set VITE_AI_URL, e.g. http://113.44.220.94:8001
 */

import type {
  AiCurveAction,
  AiCurveRecommendation,
  StandardCurveResponse,
} from '../types/aiRecommendation'

const AI_BASE_URL: string =
  (import.meta.env.VITE_AI_URL as string | undefined) ??
  (import.meta.env.DEV ? '/ai-api' : 'http://113.44.220.94:8001')

async function aiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AI_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[AI] ${init?.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  return (await res.json()) as T
}

export const aiRecommendationApiService = {
  async getStandardCurve(action: AiCurveAction): Promise<StandardCurveResponse> {
    const q = new URLSearchParams({ action })
    return aiFetch<StandardCurveResponse>(`/ai/standard-curve?${q}`)
  },

  async generate(
    action: AiCurveAction,
    sessionId: number,
  ): Promise<AiCurveRecommendation> {
    return aiFetch<AiCurveRecommendation>('/ai/recommend', {
      method: 'POST',
      body: JSON.stringify({ action, sessionId }),
    })
  },
}
