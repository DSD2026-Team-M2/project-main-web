import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatientPortal } from '../context/PatientPortalContext'
import { useI18n } from '../i18n/I18nContext'

export function PatientFollowUpPage() {
  const { t } = useI18n()
  const { followUps } = usePatientPortal()
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setShowReminder(true), 2200)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>{t('followupTitle')}</h1>
          <p className="muted">{t('followupDesc')}</p>
        </div>
      </header>

      {showReminder ? (
        <section className="card risk-list">
          <strong>{t('followupReminderPrefix')}</strong>{t('followupReminderText')}
          <div className="role-actions">
            <button type="button" className="btn primary" onClick={() => setShowReminder(false)}>
              {t('gotIt')}
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2 className="card-title">{t('followupSchedule')}</h2>
        <div className="task-list">
          {followUps.map((item) => (
            <article key={item.id} className="task-row">
              <div>
                <p className="task-title">{item.dateTime}</p>
                <p className="muted small">{item.doctor} · {item.mode === 'online' ? t('onlineRemote') : t('offlineClinic')}</p>
              </div>
              <span className={`tag ${item.status === 'upcoming' ? 'tag-blue' : 'tag-gray'}`}>
                {item.status === 'upcoming' ? t('upcoming') : t('done')}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">{t('onlineActions')}</h2>
        <div className="role-actions">
          <button type="button" className="btn primary">{t('onlineAppointment')}</button>
          <button type="button" className="btn ghost">{t('enterRemoteVisit')}</button>
          <Link className="btn ghost" to="/patient/home">{t('backHome')}</Link>
        </div>
      </section>
    </div>
  )
}
