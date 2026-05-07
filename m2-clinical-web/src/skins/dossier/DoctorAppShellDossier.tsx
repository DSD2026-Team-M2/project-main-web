import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../../components/common/ClinicalNotes'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'
import { ViewShareBar } from '../../components/common/ViewShareBar'
import { useI18n } from '../../i18n/I18nContext'
import { useApiPatientInfo } from '../../hooks/useApiPatientInfo'
import { authStore } from '../../services/authStore'

export function DoctorAppShellDossier({
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
    { to: 'sessions',  label: t('navSessions') },
    // clinical / trends / history temporarily hidden per request
  ] as const

  const recordLabel = isApiPatient
    ? apiPatientName
    : currentPatient
      ? `${currentPatient.displayName} · ${currentPatient.diagnosisShort}`
      : t('appTitle')

  const metaLabel = isApiPatient
    ? `ID ${patientId}`
    : currentPatient
      ? `${patientId} · ${currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')}`
      : t('appSubtitle')

  return (
    <div className="dossier-shell">
      <header className="dossier-header">
        <div className="dossier-tab">
          <span className="dossier-tab-kicker">{t('patient')}</span>
          <strong>{recordLabel}</strong>
          <span className="muted small dossier-tab-meta">{metaLabel}</span>
        </div>
        <div className="dossier-header-tools" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <ViewShareBar />
          {isApiPatient ? (
            <Link className="btn ghost" to="/doctor/patients">
              {t('backToPatients')}
            </Link>
          ) : (
            <button type="button" className="btn ghost" onClick={logout}>
              {t('logout')}
            </button>
          )}
          <span className="muted small" style={{ fontWeight: 700 }}>
            👨‍⚕️ {me?.name ?? 'Doctor'}
          </span>
          <LanguageSwitcher />
        </div>
        <nav className="dossier-nav" aria-label={t('navMain')}>
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              className={({ isActive }) => `dossier-nav-link${isActive ? ' active' : ''}`}
              to={`/doctor/p/${patientId}/${it.to}`}
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="dossier-main">
        {/* Patient selector: only for legacy mock patients */}
        {!isApiPatient && (
          <section className="dossier-patient-sheet">
            <div className="dossier-field">
              <label className="muted small" htmlFor="dossier-patient-select">
                {t('patient')}
              </label>
              {loadingList ? (
                <LoadingBlock label={t('patientLoading')} />
              ) : listError ? (
                <ErrorBanner message={listError} onRetry={() => void reloadPatients()} />
              ) : (
                <select
                  id="dossier-patient-select"
                  className="patient-select dossier-patient-select"
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
            {currentPatient ? (
              <div className="dossier-patient-meta muted small">
                {patientId} · {currentPatient.diagnosisShort} ·{' '}
                {currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')}
              </div>
            ) : null}
          </section>
        )}

        <div className="dossier-content">
          <Outlet />
          <ClinicalNotes />
        </div>
      </main>
    </div>
  )
}
