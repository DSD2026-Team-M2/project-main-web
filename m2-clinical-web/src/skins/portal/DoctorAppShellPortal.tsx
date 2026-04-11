import { Link, NavLink, Outlet } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../../components/common/ClinicalNotes'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'
import { ViewShareBar } from '../../components/common/ViewShareBar'
import { useI18n } from '../../i18n/I18nContext'

export function DoctorAppShellPortal({
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

  const navItems = [
    { to: 'clinical', label: t('navClinical') },
    { to: 'trends', label: t('navTrends') },
    { to: 'history', label: t('navHistory') },
    { to: 'limb', label: t('navLimb') },
  ] as const

  return (
    <div className="patient-shell doctor-shell-portal">
      <header className="patient-nav-header">
        <div className="patient-nav-inner">
          <div className="patient-nav-brand">
            <span className="patient-brand-dot" aria-hidden>
              ●
            </span>
            {t('appTitle')}
          </div>
          <nav className="patient-nav" aria-label={t('navMain')}>
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                className={({ isActive }) =>
                  `patient-nav-link${isActive ? ' active' : ''}`
                }
                to={`/doctor/p/${patientId}/${it.to}`}
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="patient-nav-tools">
            <ViewShareBar />
            <Link className="btn ghost role-link" to="/roles" aria-label={t('backToRoles')}>
              {t('backToRoles')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="doctor-portal-patient-strip">
        <div className="patient-nav-inner doctor-portal-patient-inner">
          <label className="muted small" htmlFor="doctor-portal-patient-select">
            {t('patient')}
          </label>
          {loadingList ? (
            <LoadingBlock label={t('patientLoading')} />
          ) : listError ? (
            <ErrorBanner message={listError} onRetry={() => void reloadPatients()} />
          ) : (
            <select
              id="doctor-portal-patient-select"
              className="patient-select doctor-portal-patient-select"
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
            <span className="muted small doctor-portal-patient-meta">
              <span aria-hidden>👤</span> {patientId} · {currentPatient.diagnosisShort} ·{' '}
              {currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')}
            </span>
          ) : null}
        </div>
      </div>

      <main className="patient-main-content doctor-portal-main">
        <div className="patient-portal doctor-portal-content">
          <Outlet />
        </div>
      </main>

      <ClinicalNotes />
    </div>
  )
}
