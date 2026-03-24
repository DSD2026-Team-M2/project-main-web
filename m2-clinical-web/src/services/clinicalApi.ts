import type {
  ClinicalEvent,
  HistoryRecord,
  LimbModelState,
  PatientSummary,
  TimeRangePreset,
  TrendSeries,
} from '../types/clinical'
import {
  mockEventsForPatient,
  mockHistoryForPatient,
  mockLimbState,
  mockTrendsForPatient,
  mockPatients,
} from './mock/clinicalMock'

const MOCK_LATENCY_MS = { min: 280, max: 720 }

function delay(): Promise<void> {
  const ms =
    MOCK_LATENCY_MS.min +
    Math.random() * (MOCK_LATENCY_MS.max - MOCK_LATENCY_MS.min)
  return new Promise((r) => setTimeout(r, ms))
}

function filterByRange(
  series: TrendSeries[],
  range: TimeRangePreset,
): TrendSeries[] {
  const now = new Date()
  const cutoff = new Date(now)
  if (range === 'week') cutoff.setDate(cutoff.getDate() - 7)
  else if (range === 'month') cutoff.setMonth(cutoff.getMonth() - 1)
  else return series

  const cut = cutoff.toISOString().slice(0, 10)
  return series.map((s) => ({
    ...s,
    points: s.points.filter((p) => p.t >= cut),
  }))
}

/** 预留：生产环境可改为 fetch(`${API_BASE}/patients/...`) */
const USE_MOCK = true

export const clinicalApi = {
  async listPatients(): Promise<PatientSummary[]> {
    if (!USE_MOCK) throw new Error('请配置 REST 基地址并实现 listPatients')
    await delay()
    return mockPatients()
  },

  async getTrends(
    patientId: string,
    range: TimeRangePreset,
  ): Promise<TrendSeries[]> {
    if (!USE_MOCK) throw new Error('请实现 GET /patients/:id/trends')
    await delay()
    const raw = mockTrendsForPatient(patientId, range)
    return filterByRange(raw, range)
  },

  async getClinicalEvents(
    patientId: string,
    range: TimeRangePreset,
  ): Promise<ClinicalEvent[]> {
    if (!USE_MOCK) throw new Error('请实现 GET /patients/:id/events')
    await delay()
    const events = mockEventsForPatient(patientId)
    if (range === 'all') return events
    const now = new Date()
    const cutoff = new Date(now)
    if (range === 'week') cutoff.setDate(cutoff.getDate() - 7)
    else cutoff.setMonth(cutoff.getMonth() - 1)
    const cut = cutoff.toISOString().slice(0, 10)
    return events.filter((e) => e.t >= cut)
  },

  async getHistory(patientId: string): Promise<HistoryRecord[]> {
    if (!USE_MOCK) throw new Error('请实现 GET /patients/:id/sessions')
    await delay()
    return mockHistoryForPatient(patientId)
  },

  async getLimbOverlay(patientId: string): Promise<LimbModelState> {
    if (!USE_MOCK) throw new Error('请实现 GET /patients/:id/limb-overlay')
    await delay()
    return mockLimbState(patientId)
  },
}

export type ClinicalApi = typeof clinicalApi
