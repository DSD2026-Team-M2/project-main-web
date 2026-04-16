import { Link, NavLink, Outlet } from 'react-router-dom'
import { usePatient } from '../../context/PatientContext'
import { ClinicalNotes } from '../../components/common/ClinicalNotes'
import { ErrorBanner } from '../../components/common/ErrorBanner'
import { LoadingBlock } from '../../components/common/LoadingBlock'
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher'
import { ViewShareBar } from '../../components/common/ViewShareBar'
import { useI18n } from '../../i18n/I18nContext'

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

  const navItems = [
    { to: 'clinical', label: t('navClinical') },
    { to: 'trends', label: t('navTrends') },
    { to: 'history', label: t('navHistory') },
    { to: 'limb', label: t('navLimb') },
  ] as const

  const recordLabel = currentPatient
    ? `${currentPatient.displayName} · ${currentPatient.diagnosisShort}`
    : t('appTitle')

  return (
    <div className="dossier-shell">
      <header className="dossier-header">
        <div className="dossier-tab">
          <span className="dossier-tab-kicker">{t('patient')}</span>
          <strong>{recordLabel}</strong>
          <span className="muted small dossier-tab-meta">
            {currentPatient
              ? `${patientId} · ${
                  currentPatient.limbSide === 'left' ? t('sideLeft') : t('sideRight')
                }`
              : t('appSubtitle')}
          </span>
        </div>
        <div className="dossier-header-tools">
          <ViewShareBar />
          <Link className="btn ghost" to="/roles" aria-label={t('backToRoles')}>
            {t('backToRoles')}
          </Link>
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

        <div className="dossier-content">
          <Outlet />
          <ClinicalNotes />
        </div>
      </main>
    </div>
  )
}
