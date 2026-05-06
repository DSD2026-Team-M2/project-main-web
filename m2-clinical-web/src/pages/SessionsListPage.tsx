import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { patientApiService } from '../services/patientApiService'
import type { ApiMeasurement, ApiScheduleItem, ApiSession } from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'

export function SessionsListPage() {
  const { patientId = '1' } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const uid = Number(patientId)

  // ── data ──────────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [allMeasurements, setAllMeasurements] = useState<ApiMeasurement[][]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // ── prescription state ────────────────────────────────────────────────────
  const [schedule, setSchedule] = useState<ApiScheduleItem[]>([])
  const [exercise, setExercise] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    if (isNaN(uid)) { setSessions([]); setLoading(false); return }
    setLoading(true)
    setErr(null)
    try {
      const [sess, sched] = await Promise.all([
        patientApiService.listSessions(uid),
        patientApiService.listSchedule(uid),
      ])
      setSessions(sess)
      setSchedule(sched)
      const ms = await Promise.all(sess.map((s) => patientApiService.listMeasurements(s.id)))
      setAllMeasurements(ms)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [uid, t])

  useEffect(() => { void load() }, [load])

  // ── trend chart across sessions ───────────────────────────────────────────
  const trendOption = useMemo(() => {
    if (sessions.length === 0 || allMeasurements.length === 0) return null

    const jointIds = new Set<string>()
    allMeasurements.forEach((ms) =>
      ms.forEach((m) => m.joint_angles.forEach((j) => jointIds.add(j.angleID))),
    )
    if (jointIds.size === 0) return null

    // X labels: "Session #N\nYYYY-MM-DD"
    const xLabels = sessions.map((s, i) => `Session #${i + 1}\n${s.started_at.slice(0, 10)}`)

    const series = [...jointIds].map((joint) => ({
      type: 'line',
      name: joint,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: allMeasurements.map((ms) => {
        const angles = ms.flatMap((m) =>
          m.joint_angles.filter((j) => j.angleID === joint).map((j) => j.angle),
        )
        return angles.length
          ? parseFloat((angles.reduce((a, b) => a + b, 0) / angles.length).toFixed(1))
          : null
      }),
    }))

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: [...jointIds], bottom: 0 },
      grid: { top: 20, bottom: 60, left: 50, right: 20, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: { fontSize: 11, interval: 0, lineHeight: 16 },
      },
      yAxis: { type: 'value', name: 'Avg (°)', nameTextStyle: { fontSize: 11 } },
      series,
    }
  }, [sessions, allMeasurements])

  // ── helpers ───────────────────────────────────────────────────────────────
  function formatDuration(start: string, end: string | null): string {
    if (!end) return t('sessionsOngoing')
    const ms = new Date(end).getTime() - new Date(start).getTime()
    return `${Math.round(ms / 60_000)} min`
  }

  function statusLabel(s: string) {
    if (s === 'pending') return t('statusPending')
    if (s === 'completed') return t('statusCompleted')
    if (s === 'skipped') return t('statusSkipped')
    return s
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

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1>{t('sessionsTitle')}</h1>
          <p className="muted">{t('sessionsDesc', { patientId })}</p>
        </div>
      </header>

      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

      {loading ? (
        <LoadingBlock label={t('sessionsLoading')} />
      ) : isNaN(uid) ? (
        <section className="card">
          <p className="muted">{t('sessionsInvalidId')}</p>
        </section>
      ) : (
        <>
          {/* ── Cross-session Trend Chart ── */}
          {trendOption ? (
            <section className="card" style={{ marginBottom: '1rem' }}>
              <h2 className="card-title">{t('patientDashboardTrend')}</h2>
              <ReactECharts option={trendOption} style={{ height: 320 }} />
            </section>
          ) : null}

          {/* ── Sessions List ── */}
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2 className="card-title">{t('patientDashboardSessions')}</h2>
            {sessions.length === 0 ? (
              <p className="muted">{t('sessionsEmpty')}</p>
            ) : (
              <div className="task-list">
                {sessions.map((s, i) => (
                  <article
                    key={s.id}
                    className="task-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/doctor/p/${patientId}/session/${s.id}`)}
                  >
                    <div className="task-main">
                      <p className="task-title">Session #{i + 1}</p>
                      <p className="muted small">
                        {new Date(s.started_at).toLocaleString()}
                        {' · '}
                        {formatDuration(s.started_at, s.ended_at)}
                        {' · '}
                        {s.measurement_count} {t('sessionMeasurements').toLowerCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/doctor/p/${patientId}/session/${s.id}`)
                      }}
                    >
                      {t('sessionsView')}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ── Prescription / Schedule ── */}
          <section className="card">
            <h2 className="card-title">{t('patientDashboardPrescription')}</h2>

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
                  {t('sessionExercisePh')} *
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
                {submitMsg ? (
                  <span className="small" style={{ color: submitMsg.ok ? '#22c55e' : '#ef4444' }}>
                    {submitMsg.text}
                  </span>
                ) : null}
              </div>
            </form>

            {schedule.length > 0 ? (
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
                        item.status === 'completed'
                          ? 'pass'
                          : item.status === 'skipped'
                          ? 'fail'
                          : 'idle'
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
