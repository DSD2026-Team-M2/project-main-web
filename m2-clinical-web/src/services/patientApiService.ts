/**
 * patientApiService — all HTTP-related operations for the doctor portal.
 * Every exported function maps 1-to-1 with a backend endpoint in docs/apis.md.
 */

import type {
  ApiPatient,
  ApiSession,
  ApiMeasurement,
  ApiSessionRecommendation,
  ApiEngineRecommendation,
  ApiScheduleItem,
  CreateScheduleInput,
} from '../types/api'
import type { HistoryRecord, TrendSeries } from '../types/clinical'
import { authStore } from './authStore'

// ─── config ──────────────────────────────────────────────────────────────────
const BASE_URL = 'http://113.44.220.94:3000'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authStore.getAuthHeaders(),
    },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[API] ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

// ─── service ─────────────────────────────────────────────────────────────────
export const patientApiService = {
  // GET /patients
  async listPatients(): Promise<ApiPatient[]> {
    return apiFetch<ApiPatient[]>('/patients')
  },

  // GET /sessions?userId=X
  async listSessions(userId: number): Promise<ApiSession[]> {
    return apiFetch<ApiSession[]>(`/sessions?userId=${userId}`)
  },

  // GET /measurements/:sessionId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  async listMeasurements(sessionId: number, range?: { startDate?: string; endDate?: string }): Promise<ApiMeasurement[]> {
    const qs = new URLSearchParams()
    if (range?.startDate) qs.set('startDate', range.startDate)
    if (range?.endDate) qs.set('endDate', range.endDate)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch<ApiMeasurement[]>(`/measurements/${sessionId}${suffix}`)
  },

  // GET /recommendations/session/:sessionId
  async getSessionRecommendations(sessionId: number): Promise<ApiSessionRecommendation[]> {
    const res = await apiFetch<ApiSessionRecommendation[] | null>(`/recommendations/session/${sessionId}`)
    return res ?? []
  },

  // GET /recommendations/engine/:userId
  async getEngineRecommendations(userId: number): Promise<ApiEngineRecommendation> {
    return apiFetch<ApiEngineRecommendation>(`/recommendations/engine/${userId}`)
  },

  // POST /schedule
  async createScheduleItem(input: CreateScheduleInput): Promise<ApiScheduleItem> {
    return apiFetch<ApiScheduleItem>('/schedule', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  // GET /schedule/:userId
  async listSchedule(userId: number): Promise<ApiScheduleItem[]> {
    return apiFetch<ApiScheduleItem[]>(`/schedule/${userId}`)
  },

  /**
   * Aggregate sessions + measurements into TrendSeries for the TrendsPage.
   * Each session date becomes an x-axis point; y is the average angle per joint.
   */
  async getTrendsFromSessions(userId: number): Promise<TrendSeries[]> {
    const sessions = await patientApiService.listSessions(userId)
    const allMeasurements = await Promise.all(
      sessions.map((s) => patientApiService.listMeasurements(s.id)),
    )

    // Collect all joint IDs
    const jointIds = new Set<string>()
    allMeasurements.forEach((ms) =>
      ms.forEach((m) => m.targetAngles.forEach((j) => jointIds.add(j.angleID))),
    )

    // Build series: one per joint, points indexed by session order
    return [...jointIds].map((joint) => ({
      metricKey: joint,
      points: sessions.map((session, idx) => {
        const ms = allMeasurements[idx]
        const angles = ms.flatMap((m) =>
          m.targetAngles.filter((j) => j.angleID === joint).map((j) => j.angle),
        )
        const avg = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : 0
        return {
          t: session.started_at.slice(0, 10),
          value: parseFloat(avg.toFixed(1)),
          source: 'measured' as const,
        }
      }),
    }))
  },

  /**
   * Convert sessions into HistoryRecord[] for the HistoryPage.
   */
  async getSessionsAsHistory(userId: number): Promise<HistoryRecord[]> {
    const sessions = await patientApiService.listSessions(userId)
    const allMeasurements = await Promise.all(
      sessions.map((s) => patientApiService.listMeasurements(s.id)),
    )

    return sessions.map((session, idx) => {
      const ms = allMeasurements[idx]
      const metrics: HistoryRecord['metrics'] = {}

      // Compute average for each joint across this session's measurements
      const jointMap = new Map<string, number[]>()
      ms.forEach((m) =>
        m.targetAngles.forEach((j) => {
          if (!jointMap.has(j.angleID)) jointMap.set(j.angleID, [])
          jointMap.get(j.angleID)!.push(j.angle)
        }),
      )
      jointMap.forEach((angles, joint) => {
        const avg = angles.reduce((a, b) => a + b, 0) / angles.length
        metrics[joint] = { value: parseFloat(avg.toFixed(1)), unit: '°', source: 'measured' }
      })

      return {
        id: String(session.id),
        t: session.started_at.slice(0, 10),
        type: 'training',
        title: `Session #${session.id}`,
        summary: `${ms.length} measurements`,
        metrics,
      }
    })
  },
}

