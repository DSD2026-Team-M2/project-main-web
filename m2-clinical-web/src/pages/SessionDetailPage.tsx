import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { patientApiService } from '../services/patientApiService'
import type {
  ApiMeasurement,
  ApiSessionRecommendation,
  ApiEngineRecommendation,
  ApiScheduleItem,
} from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'

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
  const { t } = useI18n()
  const uid = Number(patientId)
  const sid = Number(sessionId)

  // ── measurements ──────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState<ApiMeasurement[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // ── AI recommendations ────────────────────────────────────────────────────
  const [sessionRecs, setSessionRecs] = useState<ApiSessionRecommendation[] | null>(null)
  const [engineRecs, setEngineRecs] = useState<ApiEngineRecommendation | null>(null)
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsErr, setRecsErr] = useState<string | null>(null)

  // ── schedule / prescription ───────────────────────────────────────────────
  const [schedule, setSchedule] = useState<ApiScheduleItem[]>([])
  const [exercise, setExercise] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [m, s] = await Promise.all([
        patientApiService.listMeasurements(sid),
        patientApiService.listSchedule(uid),
      ])
      setMeasurements(m)
      setSchedule(s)
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

  // ── prescription submit ───────────────────────────────────────────────────
  async function submitSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!exercise.trim()) {
      setSubmitMsg({ text: t('sessionPrescriptionRequired'), ok: false })
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const item = await patientApiService.createScheduleItem({
        userId: uid,
        exercise,
        date,
        duration: Number(duration) || 30,
        notes,
      })
      setSchedule((prev) => [item, ...prev])
      setExercise('')
      setNotes('')
      setSubmitMsg({ text: t('sessionPrescriptionAdded'), ok: true })
    } catch (e) {
      setSubmitMsg({ text: e instanceof Error ? e.message : t('loadFailed'), ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  // ── chart ─────────────────────────────────────────────────────────────────
  const chartOption = useMemo(() => {
    const allJoints = new Set<string>()
    measurements.forEach((m) => m.joint_angles.forEach((j) => allJoints.add(j.angleID)))
    const timestamps = measurements.map((m) => m.timestamp.slice(11, 19))
    const series = [...allJoints].map((joint) => ({
      type: 'line',
      name: joint,
      smooth: true,
      data: measurements.map((m) => {
        const ja = m.joint_angles.find((j) => j.angleID === joint)
        return ja ? ja.angle : null
      }),
    }))
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: [...allJoints] },
      xAxis: { type: 'category', data: timestamps, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', name: 'Angle (°)' },
      series,
    }
  }, [measurements])

  const correctCount = measurements.filter((m) => m.is_correct).length
  const accuracy = measurements.length
    ? Math.round((correctCount / measurements.length) * 100)
    : 0

  function statusLabel(status: string): string {
    if (status === 'pending')   return t('statusPending')
    if (status === 'completed') return t('statusCompleted')
    if (status === 'skipped')   return t('statusSkipped')
    return status
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1>Session #{sessionId}</h1>
          <p className="muted">Patient #{patientId}</p>
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
          {/* ── Stats ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            {[
              { label: t('sessionMeasurements'), value: measurements.length,              color: 'var(--accent)' },
              { label: t('sessionCorrect'),      value: correctCount,                     color: '#22c55e'       },
              { label: t('sessionIncorrect'),    value: measurements.length - correctCount, color: '#ef4444'     },
              { label: t('sessionAccuracy'),     value: `${accuracy}%`,                  color: 'var(--accent)' },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
                <div className="muted small">{stat.label}</div>
              </div>
            ))}
          </div>

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
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 className="card-title">{t('sessionAiTitle')}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                disabled={recsLoading}
                onClick={() => void fetchSessionRecs()}
              >
                Session Analysis (#{sessionId})
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={recsLoading}
                onClick={() => void fetchEngineRecs()}
              >
                Engine #{patientId}
              </button>
            </div>

            {recsLoading && <LoadingBlock label={t('sessionAiLoading')} />}
            {recsErr && <ErrorBanner message={recsErr} />}

            {sessionRecs != null && (
              <div style={{ marginBottom: engineRecs ? '1rem' : 0 }}>
                <p className="muted small" style={{ marginBottom: '0.5rem' }}>
                  Session Recommendations ({sessionRecs.length})
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
                  Engine · {engineRecs.sessions_analysed} sessions · {new Date(engineRecs.generated_at).toLocaleString()}
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

          {/* ── Prescription / Schedule ── */}
          <section className="card">
            <h2 className="card-title">{t('sessionScheduleTitle')}</h2>

            <form
              onSubmit={(e) => void submitSchedule(e)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="muted small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {t('navClinical').includes('临床') ? '训练动作 *' : 'Exercise *'}
                </label>
                <input
                  className="patient-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder={t('sessionExercisePh')}
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="muted small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {t('sessionDate')}
                </label>
                <input
                  type="date"
                  className="patient-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="muted small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {t('sessionDuration')}
                </label>
                <input
                  type="number"
                  className="patient-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={duration}
                  min="1"
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="muted small" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {t('sessionNotes')}
                </label>
                <textarea
                  className="patient-select"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: '64px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                  placeholder={t('sessionNotesPh')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? t('sessionSaving') : t('sessionAddPrescription')}
                </button>
                {submitMsg && (
                  <span className="small" style={{ color: submitMsg.ok ? '#22c55e' : '#ef4444' }}>
                    {submitMsg.text}
                  </span>
                )}
              </div>
            </form>

            {schedule.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--fg)' }}>
                  Patient #{patientId}
                </h3>
                <div className="task-list">
                  {schedule.map((item) => (
                    <div key={item.id} className="task-row">
                      <div className="task-main">
                        <p className="task-title">{item.exercise}</p>
                        <p className="muted small">
                          {item.date} · {item.duration} min
                          {item.notes ? ` · ${item.notes}` : ''}
                        </p>
                      </div>
                      <span
                        className={`check-state ${
                          item.status === 'completed' ? 'pass' : item.status === 'skipped' ? 'fail' : 'idle'
                        }`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
