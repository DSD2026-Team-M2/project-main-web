import { Link, Outlet } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../common/ClinicalNotes'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingBlock } from '../common/LoadingBlock'
import { ViewShareBar } from '../common/ViewShareBar'
import { LanguageSwitcher } from '../common/LanguageSwitcher'
import { Sidebar } from './Sidebar'
import { useI18n } from '../../i18n/I18nContext'

export function AppLayout({
  onPatientChange,
}: {
  onPatientChange: (id: string) => void
}) {
  const {
    patientId,
    patients,
    currentPatient,
    loadingList,
    listError,
    reloadPatients,
  } = usePatient()
  const { t } = useI18n()

  return (
    <div className="app-shell">
      <Sidebar patientId={patientId} />
      <div className="main-column">
        <header className="top-bar">
          <div className="patient-row top-left">
            <label className="muted small" htmlFor="patient-select">
              {t('patient')}
            </label>
            {loadingList ? (
              <LoadingBlock label={t('patientLoading')} />
            ) : listError ? (
              <ErrorBanner message={listError} onRetry={() => void reloadPatients()} />
            ) : (
              <select
                id="patient-select"
                className="patient-select"
                value={patientId}
                onChange={(e) => onPatientChange(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            )}
            {currentPatient ? (
              <span className="patient-meta muted small">
                <span className="patient-avatar" aria-hidden>👤</span>
                {patientId} ·{' '}
                {currentPatient.diagnosisShort} ·{' '}
                {currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')}
              </span>
            ) : null}
          </div>
          <div className="patient-row top-center">
            <ViewShareBar />
          </div>
          <div className="patient-row top-right">
            <Link className="btn ghost" to="/roles" aria-label={t('backToRoles')}>
              {t('backToRoles')}
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <ClinicalNotes />
      </div>
    </div>
  )
}
