import { Link, Outlet } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../../components/common/ClinicalNotes'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'
import { ViewShareBar } from '../../components/common/ViewShareBar'
import { Sidebar } from '../../components/layout/Sidebar'
import { useI18n } from '../../i18n/I18nContext'

export function DoctorAppShellNeo({
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
    <div className="neo-app-shell">
      <header className="neo-app-topbar">
        <div className="neo-app-top-left">
          <strong>M2 Studio</strong>
          <span className="muted small">
            {currentPatient ? `${patientId} · ${currentPatient.diagnosisShort}` : patientId}
          </span>
        </div>
        <div className="neo-app-top-center">
          <ViewShareBar />
        </div>
        <div className="neo-app-top-right">
          <Link className="btn ghost" to="/roles" aria-label={t('backToRoles')}>
            {t('backToRoles')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="neo-app-body">
        <aside className="neo-app-side">
          <div className="neo-patient-select-wrap">
            <label className="muted small" htmlFor="neo-patient-select">
              {t('patient')}
            </label>
            {loadingList ? (
              <LoadingBlock label={t('patientLoading')} />
            ) : listError ? (
              <ErrorBanner message={listError} onRetry={() => void reloadPatients()} />
            ) : (
              <select
                id="neo-patient-select"
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
          </div>
          <Sidebar patientId={patientId} />
        </aside>

        <div className="neo-app-main">
          <main className="main-content neo-main-content">
            <Outlet />
          </main>
          <ClinicalNotes />
        </div>
      </div>
    </div>
  )
}
