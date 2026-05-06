/**
 * patientApiService — all HTTP-related operations for the doctor portal.
 *
 * This version stores data in localStorage for demo purposes.
 * To switch to the real API, set USE_REAL_API = true.
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

// ─── config ──────────────────────────────────────────────────────────────────
const USE_REAL_API = false
const BASE_URL = 'https://dsd2026-teamv2-production.up.railway.app'

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEY = {
  patients: 'm2:mock:patients',
  sessions: (uid: number) => `m2:mock:sessions:${uid}`,
  measurements: (sid: number) => `m2:mock:measurements:${sid}`,
  schedule: (uid: number) => `m2:mock:schedule:${uid}`,
}

// ─── seed data ────────────────────────────────────────────────────────────────
const SEED_PATIENTS: ApiPatient[] = [
  { id: 1, name: 'Alice Wang', email: 'alice@example.com', role: 'patient', age: 32, status: 'active', created_at: '2026-04-01T08:00:00Z' },
  { id: 2, name: 'Bob Li',     email: 'bob@example.com',   role: 'patient', age: 45, status: 'active', created_at: '2026-04-05T09:00:00Z' },
  { id: 3, name: 'Carol Zhang',email: 'carol@example.com', role: 'patient', age: 28, status: 'active', created_at: '2026-04-10T10:00:00Z' },
  { id: 4, name: 'David Chen', email: 'david@example.com', role: 'patient', age: 55, status: 'active', created_at: '2026-04-15T11:00:00Z' },
]

function makeSeedSessions(userId: number): ApiSession[] {
  return Array.from({ length: 5 }, (_, i) => {
    const daysAgo = 4 - i
    const start = new Date(Date.now() - daysAgo * 86_400_000)
    return {
      id: userId * 100 + i + 1,
      user_id: userId,
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + 30 * 60_000).toISOString(),
      user_name: `Patient ${userId}`,
      measurement_count: 5 + i,
    }
  })
}

function makeSeedMeasurements(sessionId: number): ApiMeasurement[] {
  return Array.from({ length: 6 }, (_, i) => {
    const ts = new Date(Date.now() - (6 - i) * 60_000).toISOString()
    const knee = parseFloat((40 + Math.random() * 40).toFixed(1))
    const hip   = parseFloat((20 + Math.random() * 30).toFixed(1))
    return {
      id: sessionId * 1000 + i + 1,
      session_id: sessionId,
      timestamp: ts,
      joint_angles: [
        { timestamp: ts, angleID: 'knee', angle: knee },
        { timestamp: ts, angleID: 'hip',  angle: hip  },
      ],
      is_correct: Math.random() > 0.4,
    }
  })
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function ls<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function lsSet(key: string, val: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* quota ignore */ }
}

function delay(base = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, base + Math.random() * 200))
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
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
    if (USE_REAL_API) {
      return apiFetch<ApiPatient[]>('/patients')
    }
    await delay()
    const cached = ls<ApiPatient[] | null>(KEY.patients, null)
    if (cached == null) {
      lsSet(KEY.patients, SEED_PATIENTS)
      return SEED_PATIENTS
    }
    return cached
  },

  // GET /sessions?userId=X  (uses query param per API docs)
  async listSessions(userId: number): Promise<ApiSession[]> {
    if (USE_REAL_API) {
      return apiFetch<ApiSession[]>(`/sessions?userId=${userId}`)
    }
    await delay()
    const key = KEY.sessions(userId)
    const cached = ls<ApiSession[] | null>(key, null)
    if (cached == null) {
      const seed = makeSeedSessions(userId)
      lsSet(key, seed)
      return seed
    }
    return cached
  },

  // GET /measurements/:sessionId
  async listMeasurements(sessionId: number): Promise<ApiMeasurement[]> {
    if (USE_REAL_API) {
      return apiFetch<ApiMeasurement[]>(`/measurements/${sessionId}`)
    }
    await delay()
    const key = KEY.measurements(sessionId)
    const cached = ls<ApiMeasurement[] | null>(key, null)
    if (cached == null) {
      const seed = makeSeedMeasurements(sessionId)
      lsSet(key, seed)
      return seed
    }
    return cached
  },

  // GET /recommendations/session/:sessionId
  async getSessionRecommendations(sessionId: number): Promise<ApiSessionRecommendation[]> {
    if (USE_REAL_API) {
      const res = await apiFetch<ApiSessionRecommendation[] | null>(`/recommendations/session/${sessionId}`)
      return res ?? []
    }
    await delay(500)
    return [
      { id: sessionId * 10 + 1, session_id: sessionId, movement: 'knee_flexion',   confidence: 0.82, created_at: new Date().toISOString() },
      { id: sessionId * 10 + 2, session_id: sessionId, movement: 'hip_extension',  confidence: 0.67, created_at: new Date().toISOString() },
      { id: sessionId * 10 + 3, session_id: sessionId, movement: 'ankle_dorsiflexion', confidence: 0.55, created_at: new Date().toISOString() },
    ]
  },

  // GET /recommendations/engine/:userId
  async getEngineRecommendations(userId: number): Promise<ApiEngineRecommendation> {
    if (USE_REAL_API) {
      return apiFetch<ApiEngineRecommendation>(`/recommendations/engine/${userId}`)
    }
    await delay(600)
    return {
      userId,
      sessions_analysed: 5,
      generated_at: new Date().toISOString(),
      suggestions: [
        { joint: 'knee', accuracy_percent: 62, total_measurements: 18, priority: 'high',   suggestion: 'Focus on full knee extension range; current ROM shows significant limitation.' },
        { joint: 'hip',  accuracy_percent: 78, total_measurements: 12, priority: 'medium', suggestion: 'Hip abductor strengthening recommended to improve gait stability.' },
        { joint: 'ankle',accuracy_percent: 85, total_measurements: 10, priority: 'low',    suggestion: 'Ankle mobility within acceptable range; maintain current protocol.' },
      ],
    }
  },

  // POST /schedule
  async createScheduleItem(input: CreateScheduleInput): Promise<ApiScheduleItem> {
    if (USE_REAL_API) {
      return apiFetch<ApiScheduleItem>('/schedule', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    }
    await delay()
    const key = KEY.schedule(input.userId)
    const existing = ls<ApiScheduleItem[]>(key, [])
    const newItem: ApiScheduleItem = {
      id: Date.now(),
      user_id: input.userId,
      exercise: input.exercise,
      date: input.date,
      duration: input.duration,
      notes: input.notes,
      status: 'pending',
    }
    lsSet(key, [newItem, ...existing])
    return newItem
  },

  // GET /schedule/:userId
  async listSchedule(userId: number): Promise<ApiScheduleItem[]> {
    if (USE_REAL_API) {
      return apiFetch<ApiScheduleItem[]>(`/schedule/${userId}`)
    }
    await delay()
    return ls<ApiScheduleItem[]>(KEY.schedule(userId), [])
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
      ms.forEach((m) => m.joint_angles.forEach((j) => jointIds.add(j.angleID))),
    )

    // Build series: one per joint, points indexed by session order
    return [...jointIds].map((joint) => ({
      metricKey: joint,
      points: sessions.map((session, idx) => {
        const ms = allMeasurements[idx]
        const angles = ms.flatMap((m) =>
          m.joint_angles.filter((j) => j.angleID === joint).map((j) => j.angle),
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
        m.joint_angles.forEach((j) => {
          if (!jointMap.has(j.angleID)) jointMap.set(j.angleID, [])
          jointMap.get(j.angleID)!.push(j.angle)
        }),
      )
      jointMap.forEach((angles, joint) => {
        const avg = angles.reduce((a, b) => a + b, 0) / angles.length
        metrics[joint] = { value: parseFloat(avg.toFixed(1)), unit: '°', source: 'measured' }
      })

      // Add accuracy as a pseudo-metric
      const correct = ms.filter((m) => m.is_correct).length
      const accuracy = ms.length ? Math.round((correct / ms.length) * 100) : 0
      metrics['accuracy'] = { value: accuracy, unit: '%', source: 'measured' }

      return {
        id: String(session.id),
        t: session.started_at.slice(0, 10),
        type: 'training',
        title: `Session #${session.id}`,
        summary: `${ms.length} measurements · ${accuracy}% accuracy`,
        metrics,
      }
    })
  },
}
