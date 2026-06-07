/**
 * aiRecommendationApiService — chama o wrapper FastAPI que corre o script do Borges.
 * Endpoint único: POST {AI_BASE_URL}/ai/recommend
 *
 * A URL base pode ser definida via VITE_AI_URL no .env do projeto.
 * Fallback: http://113.44.220.94:8001 (servidor de produção, porta do wrapper).
 */

import type {
  AiCurveAction,
  AiCurveRecommendation,
} from '../types/aiRecommendation'

const AI_BASE_URL: string =
  (import.meta.env.VITE_AI_URL as string | undefined) ?? 'http://113.44.220.94:8001'

export const aiRecommendationApiService = {
  /**
   * Pede ao wrapper para gerar a recomendação para uma sessão.
   * Lança Error em caso de falha HTTP ou erro do script.
   */
  async generate(
    action: AiCurveAction,
    sessionId: number,
  ): Promise<AiCurveRecommendation> {
    const res = await fetch(`${AI_BASE_URL}/ai/recommend`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, sessionId }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`[AI] POST /ai/recommend → ${res.status}: ${body}`)
    }
    return (await res.json()) as AiCurveRecommendation
  },
}
