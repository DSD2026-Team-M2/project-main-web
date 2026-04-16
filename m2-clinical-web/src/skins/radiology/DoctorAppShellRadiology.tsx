import { Link, NavLink, Outlet } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../../components/common/ClinicalNotes'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'
import { ViewShareBar } from '../../components/common/ViewShareBar'
import { useI18n } from '../../i18n/I18nContext'

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

  const navItems = [
    { to: 'clinical', label: t('navClinical') },
    { to: 'trends', label: t('navTrends') },
    { to: 'history', label: t('navHistory') },
    { to: 'limb', label: t('navLimb') },
  ] as const

  const patientMeta = currentPatient
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
            <h1 className="radiology-title">
              {currentPatient ? currentPatient.displayName : t('patientLoading')}
            </h1>
            <p className="radiology-subtitle">{patientMeta}</p>
          </div>
          <div className="radiology-header-tools">
            <ViewShareBar />
            <Link className="btn ghost" to="/roles" aria-label={t('backToRoles')}>
              {t('backToRoles')}
            </Link>
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
              <strong>{currentPatient?.displayName ?? t('patient')}</strong>
            </div>

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

            <dl className="radiology-summary-list">
              <div>
                <dt>{t('patient')}</dt>
                <dd>{patientId}</dd>
              </div>
              <div>
                <dt>{t('navClinical')}</dt>
                <dd>{currentPatient?.diagnosisShort ?? '--'}</dd>
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
