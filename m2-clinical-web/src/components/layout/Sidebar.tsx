import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'

export function Sidebar({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const items = [
    { to: 'trends', label: t('navTrends') },
    { to: 'history', label: t('navHistory') },
    { to: 'limb', label: t('navLimb') },
  ] as const
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">M2</span>
        <div>
          <div className="brand-title">{t('appTitle')}</div>
          <div className="brand-sub muted small">{t('appSubtitle')}</div>
        </div>
      </div>
      <nav className="nav" aria-label={t('navMain')}>
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={`/p/${patientId}/${it.to}`}
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
      <footer className="sidebar-foot muted small">
        {t('sidebarFooter')} <code>src/services/clinicalApi.ts</code>
      </footer>
    </aside>
  )
}
