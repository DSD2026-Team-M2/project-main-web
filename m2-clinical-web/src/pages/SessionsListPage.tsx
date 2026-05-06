import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patientApiService } from '../services/patientApiService'
import type { ApiSession } from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'

export function SessionsListPage() {
  const { patientId = '1' } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const uid = Number(patientId)

  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isNaN(uid)) { setSessions([]); setLoading(false); return }
    setLoading(true)
    setErr(null)
    try {
      setSessions(await patientApiService.listSessions(uid))
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [uid, t])

  useEffect(() => { void load() }, [load])

  function formatDuration(start: string, end: string | null): string {
    if (!end) return t('sessionsOngoing')
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const mins = Math.round(ms / 60_000)
    return `${mins} min`
  }

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
        <section className="card">
          {sessions.length === 0 ? (
            <p className="muted">{t('sessionsEmpty')}</p>
          ) : (
            <div className="task-list">
              {sessions.map((s) => (
                <article
                  key={s.id}
                  className="task-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/doctor/p/${patientId}/session/${s.id}`)}
                >
                  <div className="task-main">
                    <p className="task-title">Session #{s.id}</p>
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
      )}
    </div>
  )
}
