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

export function DoctorAppShellRadiology({
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

  const displayName = isApiPatient
    ? apiPatientName
    : currentPatient?.displayName ?? t('patientLoading')

  const patientMeta = isApiPatient
    ? `ID ${patientId}`
    : currentPatient
      ? `${patientId} · ${currentPatient.diagnosisShort} · ${
          currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')
        }`
      : t('appSubtitle')

  return (
    <div className="radiology-shell">
      <header className="radiology-header">
        <div className="radiology-header-main">
          <div>
            <p className="radiology-kicker">{t('appTitle')}</p>
            <h1 className="radiology-title">{displayName}</h1>
            <p className="radiology-subtitle">{patientMeta}</p>
          </div>
          <div className="radiology-header-tools" style={{ justifyContent: 'flex-end', gap: 10 }}>
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
        </div>
        <nav className="radiology-nav" aria-label={t('navMain')}>
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              className={({ isActive }) => `radiology-nav-link${isActive ? ' active' : ''}`}
              to={`/doctor/p/${patientId}/${it.to}`}
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="radiology-workspace">
        <aside className="radiology-side-column">
          <section className="radiology-panel radiology-patient-panel">
            <div className="radiology-panel-head">
              <span className="radiology-panel-kicker">{t('patient')}</span>
              <strong>{displayName}</strong>
            </div>

            {/* Patient selector: only for legacy mock patients */}
            {!isApiPatient && (
              <div className="radiology-field">
                <label className="muted small" htmlFor="radiology-patient-select">
                  {t('patient')}
                </label>
                {loadingList ? (
                  <LoadingBlock label={t('patientLoading')} />
                ) : listError ? (
                  <ErrorBanner message={listError} onRetry={() => void reloadPatients()} />
                ) : (
                  <select
                    id="radiology-patient-select"
                    className="patient-select radiology-patient-select"
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
            )}

            <dl className="radiology-summary-list">
              <div>
                <dt>{t('patient')}</dt>
                <dd>{patientId}</dd>
              </div>
              <div>
                <dt>{t('navClinical')}</dt>
                <dd>{isApiPatient ? '—' : (currentPatient?.diagnosisShort ?? '--')}</dd>
              </div>
              <div>
                <dt>{t('navHistory')}</dt>
                <dd>{t('historyDesc')}</dd>
              </div>
              <div>
                <dt>{t('navTrends')}</dt>
                <dd>{t('trendsDesc')}</dd>
              </div>
            </dl>
          </section>

          <ClinicalNotes />
        </aside>

        <section className="radiology-main-column">
          <Outlet />
        </section>
      </main>
    </div>
  )
}
