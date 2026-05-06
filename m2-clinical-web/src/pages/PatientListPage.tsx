import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { patientApiService } from '../services/patientApiService'
import type { ApiPatient } from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'

export function PatientListPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [patients, setPatients] = useState<ApiPatient[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      setPatients(await patientApiService.listPatients())
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = patients.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.email.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="patient-list-shell">
      <header className="top-bar">
        <div className="patient-row top-left">
          <span className="brand-mark" style={{ marginRight: '0.5rem' }}>M2</span>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t('patientListTitle')}</span>
        </div>
        <div className="patient-row top-right">
          <Link className="btn ghost" to="/roles">{t('backToRoles')}</Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1.25rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>{t('patientListTitle')}</h1>
          <p className="muted">{t('patientListDesc')}</p>
        </div>

        <section className="card" style={{ marginBottom: '1rem' }}>
          <input
            className="patient-select"
            style={{ width: '100%', boxSizing: 'border-box' }}
            placeholder={t('patientListSearch')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>

        {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

        {loading ? (
          <LoadingBlock label={t('patientListLoading')} />
        ) : (
          <section className="card">
            {filtered.length === 0 ? (
              <p className="muted" style={{ padding: '0.5rem 0' }}>
                {query
                  ? t('patientListEmpty')
                  : t('patientListEmpty')}
              </p>
            ) : (
              <div className="task-list">
                {filtered.map((p) => (
                  <article
                    key={p.id}
                    className="task-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/doctor/p/${p.id}/sessions`)}
                  >
                    <div className="task-main">
                      <p className="task-title">{p.name}</p>
                      <p className="muted small">
                        {p.email} · ID {p.id}
                        {p.age != null ? ` · Age ${p.age}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className={`check-state ${p.status === 'active' ? 'pass' : p.status === 'pending' ? 'idle' : 'fail'}`}
                      >
                        {p.status}
                      </span>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/doctor/p/${p.id}/sessions`)
                        }}
                      >
                        {t('patientListOpen')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
