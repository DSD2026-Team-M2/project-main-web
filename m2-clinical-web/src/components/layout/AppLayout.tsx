import { Link, Outlet } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../common/ClinicalNotes'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingBlock } from '../common/LoadingBlock'
import { ViewShareBar } from '../common/ViewShareBar'
import { LanguageSwitcher } from '../common/LanguageSwitcher'
import { Sidebar } from './Sidebar'
import { useI18n } from '../../i18n/I18nContext'
import { useApiPatientInfo } from '../../hooks/useApiPatientInfo'

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
  const { isApiPatient, apiPatientName } = useApiPatientInfo(patientId)

  return (
    <div className="app-shell">
      <Sidebar patientId={patientId} />
      <div className="main-column">
        <header className="top-bar">

          {/* Left: patient selector (legacy only) */}
          <div className="patient-row top-left">
            {!isApiPatient && (
              <>
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
                    {patientId} · {currentPatient.diagnosisShort} ·{' '}
                    {currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')}
                  </span>
                ) : null}
              </>
            )}
          </div>

          {/* Center */}
          <div className="patient-row top-center">
            <ViewShareBar />
          </div>

          {/* Right: patient name + back button (API) or back to roles (legacy) */}
          <div className="patient-row top-right">
            {isApiPatient ? (
              <>
                <span className="patient-meta muted small" style={{ fontWeight: 600 }}>
                  <span className="patient-avatar" aria-hidden>👤</span>
                  {apiPatientName}
                </span>
                <Link className="btn ghost" to="/doctor/patients">
                  {t('backToPatients')}
                </Link>
              </>
            ) : (
              <Link className="btn ghost" to="/roles" aria-label={t('backToRoles')}>
                {t('backToRoles')}
              </Link>
            )}
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
