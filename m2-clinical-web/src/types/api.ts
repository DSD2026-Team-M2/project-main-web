/** API data types matching the backend at dsd2026-teamv2-production.up.railway.app */

export type ApiPatient = {
  id: number
  name: string
  email: string
  role: 'patient' | 'clinician' | 'admin'
  age: number | null
  status: 'active' | 'pending' | 'disabled'
  created_at: string
}

export type ApiSession = {
  id: number
  user_id: number
  started_at: string
  ended_at: string | null
  user_name: string
  measurement_count: number
}

export type ApiJointAngle = {
  timestamp: string
  angleID: string
  angle: number
}

/** Normalized shape used in the app after GET /measurements/:sessionId (backend may send snake_case). */
export type ApiMeasurement = {
  id: number
  sessionId: number
  /** Per-sample row time from the API when present */
  timestamp?: string
  /**
   * Canonical joint samples. Wire payloads may use `joint_angles` or `targetAngles`;
   * use `extractJointAnglesFromMeasurement` or `patientApiService.listMeasurements` so both work.
   */
  targetAngles: ApiJointAngle[]
  errors: unknown[]
  sensorData: unknown[]
  isCorrect?: boolean
}

export type ApiSessionRecommendation = {
  id: number
  session_id: number
  movement: string
  confidence: number
  created_at: string
  notes?: string
}

export type ApiEngineSuggestion = {
  joint: string
  accuracy_percent: number
  total_measurements: number
  priority: 'high' | 'medium' | 'low'
  suggestion: string
}

export type ApiEngineRecommendation = {
  userId: number
  sessions_analysed: number
  generated_at: string
  suggestions: ApiEngineSuggestion[]
}

export type ApiScheduleItem = {
  id: number
  user_id: number
  exercise: string
  date: string
  duration: number
  notes: string
  status: 'pending' | 'completed' | 'skipped'
}

export type CreateScheduleInput = {
  userId: number
  exercise: string
  date: string
  duration: number
  notes: string
}
