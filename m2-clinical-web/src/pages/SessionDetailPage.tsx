import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { patientApiService } from '../services/patientApiService'
import type {
  ApiMeasurement,
  ApiSession,
  ApiSessionRecommendation,
  ApiEngineRecommendation,
} from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'
import { extractJointAnglesFromMeasurement } from '../utils/measurementJointAngles'

const PRIORITY_CLASS: Record<string, string> = {
  high: 'fail',
  medium: 'idle',
  low: 'pass',
}

export function SessionDetailPage() {
  const { patientId = '1', sessionId = '1' } = useParams<{
    patientId: string
    sessionId: string
  }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const uid = Number(patientId)
  const sid = Number(sessionId)

  // ── measurements ──────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState<ApiMeasurement[]>([])
  const [sessionMeta, setSessionMeta] = useState<ApiSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // ── AI recommendations ────────────────────────────────────────────────────
  const [sessionRecs, setSessionRecs] = useState<ApiSessionRecommendation[] | null>(null)
  const [engineRecs, setEngineRecs] = useState<ApiEngineRecommendation | null>(null)
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsErr, setRecsErr] = useState<string | null>(null)

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [ms, sessions] = await Promise.all([
        patientApiService.listMeasurements(sid),
        Number.isFinite(uid) && uid > 0
          ? patientApiService.listSessions(uid)
          : Promise.resolve([] as ApiSession[]),
      ])
      setMeasurements(ms)
      setSessionMeta(sessions.find((s) => s.id === sid) ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [sid, uid, t])

  useEffect(() => { void load() }, [load])

  // ── AI helpers ────────────────────────────────────────────────────────────
  async function fetchSessionRecs() {
    setRecsLoading(true)
    setRecsErr(null)
    try {
      setSessionRecs(await patientApiService.getSessionRecommendations(sid))
    } catch (e) {
      setRecsErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setRecsLoading(false)
    }
  }

  async function fetchEngineRecs() {
    setRecsLoading(true)
    setRecsErr(null)
    try {
      setEngineRecs(await patientApiService.getEngineRecommendations(uid))
    } catch (e) {
      setRecsErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setRecsLoading(false)
    }
  }

  // ── chart ─────────────────────────────────────────────────────────────────
  const chartOption = useMemo(() => {
    // Flatten all target angles across all measurements (session timeline).
    type Pt = { ts: string; joint: string; angle: number }
    const points: Pt[] = []
    measurements.forEach((m) => {
      extractJointAnglesFromMeasurement(m).forEach((j) => {
        points.push({ ts: j.timestamp, joint: j.angleID, angle: j.angle })
      })
    })

    if (points.length === 0) {
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: [] as string[] },
        xAxis: { type: 'category', data: [] as string[] },
        yAxis: { type: 'value', name: 'Angle (°)' },
        series: [] as any[],
      }
    }

    // Sort by timestamp and build unique x-axis labels.
    points.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    const xFull = Array.from(new Set(points.map((p) => p.ts)))
    const xLabels = xFull.map((ts) => ts.slice(11, 19))

    const joints = Array.from(new Set(points.map((p) => p.joint)))

    // Build a timestamp->index map for fast fill.
    const idx = new Map<string, number>()
    xFull.forEach((ts, i) => idx.set(ts, i))

    // If multiple samples land on same (joint,timestamp), average them.
    const acc = new Map<string, { sum: number; n: number }>() // key: `${joint}@@${ts}`
    points.forEach((p) => {
      const k = `${p.joint}@@${p.ts}`
      const cur = acc.get(k)
      if (!cur) acc.set(k, { sum: p.angle, n: 1 })
      else { cur.sum += p.angle; cur.n += 1 }
    })

    const series = joints.map((joint) => {
      const data = new Array<number | null>(xFull.length).fill(null)
      for (const [k, v] of acc.entries()) {
        const [j, ts] = k.split('@@')
        if (j !== joint) continue
        const i = idx.get(ts)
        if (i == null) continue
        data[i] = parseFloat((v.sum / v.n).toFixed(2))
      }
      return { type: 'line', name: joint, smooth: true, data }
    })

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: joints },
      xAxis: { type: 'category', data: xLabels, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: 'Angle (°)' },
      grid: { top: 30, left: 50, right: 20, bottom: 80, containLabel: true },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, height: 22, bottom: 22, filterMode: 'none' },
      ],
      series,
    }
  }, [measurements])

  const startedAtTitle = useMemo(() => {
    const raw = sessionMeta?.started_at
    if (!raw) return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })
  }, [sessionMeta, locale])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.2rem' }}>
            {startedAtTitle ?? (loading ? '…' : t('sessionDetailTimeUnknown'))}
          </h1>
          <p className="muted">{t('sessionDetailSessionLine', { id: sessionId })}</p>
          <p className="muted">{t('sessionDetailPatientLine', { patientId })}</p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate(`/doctor/p/${patientId}/sessions`)}
        >
          {t('sessionDetailBack')}
        </button>
      </header>

      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

      {loading ? (
        <LoadingBlock label={t('sessionDetailLoading')} />
      ) : (
        <>
          {/* ── Motion Data Chart ── */}
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 className="card-title">{t('sessionChartTitle')}</h2>
            {measurements.length === 0 ? (
              <p className="muted">{t('sessionChartEmpty')}</p>
            ) : (
              <ReactECharts option={chartOption} style={{ height: 300 }} />
            )}
          </section>

          {/* ── AI Recommendations ── */}
          <section className="card">
            <h2 className="card-title">{t('sessionAiTitle')}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                disabled={recsLoading}
                onClick={() => void fetchSessionRecs()}
              >
                {t('sessionAiSessionBtn')} #{sessionId}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={recsLoading}
                onClick={() => void fetchEngineRecs()}
              >
                {t('sessionAiEngineBtn')} #{patientId}
              </button>
            </div>

            {recsLoading && <LoadingBlock label={t('sessionAiLoading')} />}
            {recsErr && <ErrorBanner message={recsErr} />}

            {sessionRecs != null && (
              <div style={{ marginBottom: engineRecs ? '1rem' : 0 }}>
                <p className="muted small" style={{ marginBottom: '0.5rem' }}>
                  {t('sessionAiSessionLabel')} ({sessionRecs.length})
                </p>
                {sessionRecs.length === 0 ? (
                  <p className="muted">{t('sessionAiSessionEmpty')}</p>
                ) : (
                  <div className="task-list">
                    {sessionRecs.map((r) => (
                      <div key={r.id} className="task-row">
                        <div className="task-main">
                          <p className="task-title" style={{ textTransform: 'capitalize' }}>
                            {r.movement.replaceAll('_', ' ')}
                          </p>
                          <p className="muted small">
                            {new Date(r.created_at).toLocaleString()}
                            {r.notes ? ` · ${r.notes}` : ''}
                          </p>
                        </div>
                        <span className="check-state idle">
                          {(r.confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {engineRecs != null && (
              <div>
                <p className="muted small" style={{ marginBottom: '0.5rem' }}>
                  {t('sessionAiEngineLabel')} · {engineRecs.sessions_analysed} sessions · {new Date(engineRecs.generated_at).toLocaleString()}
                </p>
                <div className="task-list">
                  {engineRecs.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="task-row"
                      style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s.joint}</span>
                        <span className={`check-state ${PRIORITY_CLASS[s.priority] ?? 'idle'}`}>{s.priority}</span>
                        <span className="muted small" style={{ marginLeft: 'auto' }}>
                          {s.accuracy_percent}% · {s.total_measurements} {t('sessionMeasurements').toLowerCase()}
                        </span>
                      </div>
                      <p className="muted small">{s.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
