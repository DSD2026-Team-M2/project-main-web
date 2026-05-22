import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { DoctorPatientDock } from '../doctor/DoctorPatientDock'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingBlock } from '../common/LoadingBlock'
import { LanguageSwitcher } from '../common/LanguageSwitcher'
import { ViewShareBar } from '../common/ViewShareBar'
import { useI18n } from '../../i18n/I18nContext'
import { useApiPatientInfo } from '../../hooks/useApiPatientInfo'
import { authStore } from '../../services/authStore'

export function DoctorAppShell({
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
  const navigate = useNavigate()
  const me = authStore.getUser()

  function logout() {
    authStore.clearToken()
    navigate('/roles')
  }

  const navItems = [
    { to: 'sessions', label: t('navSessions') },
    // clinical / trends / history temporarily hidden per request
  ] as const

  return (
    <div className="patient-shell doctor-shell-portal">
      <header className="patient-nav-header">
        <div className="patient-nav-inner">
          <div className="patient-nav-brand">
            <span className="patient-brand-dot" aria-hidden>●</span>
            {t('appTitle')}
          </div>
          <nav className="patient-nav" aria-label={t('navMain')}>
            <NavLink
              className={({ isActive }) => `patient-nav-link${isActive ? ' active' : ''}`}
              to="/doctor/patients"
            >
              {t('navPatientList')}
            </NavLink>
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                className={({ isActive }) => `patient-nav-link${isActive ? ' active' : ''}`}
                to={`/doctor/p/${patientId}/${it.to}`}
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="patient-nav-tools">
            <ViewShareBar />
            {isApiPatient ? (
              <>
                <span className="muted small" style={{ fontWeight: 600 }}>
                  👤 {apiPatientName}
                </span>
                <Link className="btn ghost role-link" to="/doctor/patients">
                  {t('backToPatients')}
                </Link>
              </>
            ) : (
              <button type="button" className="btn ghost role-link" onClick={logout}>
                {t('logout')}
              </button>
            )}
            <span className="muted small" style={{ fontWeight: 700 }}>
              👨‍⚕️ {me?.name ?? 'Doctor'}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {!isApiPatient && (
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
      )}

      <main className="patient-main-content doctor-portal-main">
        <div className="patient-portal doctor-portal-content">
          <Outlet />
        </div>
      </main>

      <DoctorPatientDock />
    </div>
  )
}
