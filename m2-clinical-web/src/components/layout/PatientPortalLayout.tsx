import { Link, NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { LanguageSwitcher } from '../common/LanguageSwitcher'

export function PatientPortalLayout() {
  const { t } = useI18n()
  const navItems = [
    { to: '/patient/home', label: t('patientNavHome') },
    { to: '/patient/training', label: t('patientNavTraining') },
    { to: '/patient/recovery', label: t('patientNavRecovery') },
    { to: '/patient/follow-up', label: t('patientNavFollowUp') },
    { to: '/patient/limb-3d', label: t('patientNavLimb') },
    { to: '/patient/profile', label: t('patientNavProfile') },
  ]
  return (
    <div className="patient-shell">
      <header className="patient-nav-header">
        <div className="patient-nav-inner">
          <div className="patient-nav-brand">
            <span className="patient-brand-dot" aria-hidden>
              ●
            </span>
            {t('patientNavTitle')}
          </div>
          <nav className="patient-nav" aria-label={t('patientNavAria')}>
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                className={({ isActive }) => `patient-nav-link${isActive ? ' active' : ''}`}
                to={it.to}
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="patient-nav-tools">
            <Link className="btn ghost role-link" to="/roles">
              {t('backToRoleEntry')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="patient-main-content">
        <Outlet />
      </main>
    </div>
  )
}
