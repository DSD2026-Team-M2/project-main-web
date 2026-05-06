import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/role-entry.css'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/common/LanguageSwitcher'

type RoleKey = 'doctor' | 'admin'

type RoleCard = {
  key: RoleKey
  title: string
  subtitle: string
  desc: string
  points: string[]
  route: string
  action: string
}

export function RoleHomePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<RoleCard | null>(null)
  const roleCards: RoleCard[] = [
    {
      key: 'doctor',
      title: t('roleDoctor'),
      subtitle: t('roleDoctorSubtitle'),
      desc: t('roleDoctorDesc'),
      points: [t('navTrends'), t('metricCompare'), t('navLimb')],
      route: '/auth/doctor',
      action: t('roleDoctorAction'),
    },
    {
      key: 'admin',
      title: t('roleAdmin'),
      subtitle: t('roleAdminSubtitle'),
      desc: t('roleAdminDesc'),
      points: [t('roleAdminKeyword1'), t('roleAdminKeyword2'), t('roleAdminKeyword3')],
      route: '/auth/admin',
      action: t('roleAdminAction'),
    },
  ]

  return (
    <div className="role-page role-entry-page">
      <header className="entry-hero">
        <div className="entry-tools">
          <LanguageSwitcher />
        </div>
        <div className="entry-hero-brand">
          <span className="brand-logo" aria-hidden="true">M2</span>
          <div>
            <h1>{t('roleEntryTitle')}</h1>
            <p className="entry-subtitle">{t('roleEntrySub')}</p>
          </div>
        </div>
        <p className="entry-desc">
          {t('roleEntryDesc')}
        </p>
      </header>

      <section className="role-grid role-entry-grid">
        {roleCards.map((card, idx) => (
          <article key={card.key} className={`card role-entry-card ${card.key}`} style={{ animationDelay: `${idx * 90}ms` }}>
            <div className="role-icon-wrap" aria-hidden="true">
              <span className="role-icon-core">{card.key === 'doctor' ? 'DR' : 'ADM'}</span>
            </div>
            <p className="role-en">{card.subtitle}</p>
            <h2 className="card-title">{card.title}</h2>
            <p className="role-entry-desc">{card.desc}</p>
            <div className="role-keywords">
              {card.points.map((point) => <span key={point}>{point}</span>)}
            </div>
            <button type="button" className="btn role-entry-btn" onClick={() => setActiveRole(card)}>
              {card.action}
            </button>
            <Link className="role-link role-link-inline" to={card.route}>
              {t('enterNow')}
            </Link>
          </article>
        ))}
      </section>

      <footer className="entry-footer">
        <p>{t('roleFooterLine1')}</p>
        <p>{t('roleFooterLine2')}</p>
      </footer>

      {activeRole ? (
        <div className="entry-modal-mask" role="dialog" aria-modal="true">
          <div className={`entry-modal ${activeRole.key}`}>
            <h3>{activeRole.title} · {t('roleModalTitleSuffix')}</h3>
            <p>{activeRole.desc}</p>
            <ul>
              {activeRole.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="role-actions">
              <button type="button" className="btn ghost" onClick={() => setActiveRole(null)}>
                {t('backSelect')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const target = activeRole.route
                  setActiveRole(null)
                  navigate(target)
                }}
              >
                {t('confirmEnter')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
