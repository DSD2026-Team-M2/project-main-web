import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/role-entry.css'

type RoleKey = 'doctor' | 'patient' | 'developer'

type RoleCard = {
  key: RoleKey
  title: string
  subtitle: string
  desc: string
  points: string[]
  route: string
  action: string
}

const roleCards: RoleCard[] = [
  {
    key: 'doctor',
    title: '医生端',
    subtitle: 'Clinical Workstation',
    desc: '面向临床团队的专业入口，聚焦评估、康复管理与决策支持。',
    points: ['临床评估', '康复管理', '专业决策'],
    route: '/doctor',
    action: '进入医生端',
  },
  {
    key: 'patient',
    title: '患者端',
    subtitle: 'Recovery Companion',
    desc: '面向患者的康复入口，提供居家训练、恢复进度和日常健康陪伴。',
    points: ['居家训练', '恢复进度', '健康陪伴'],
    route: '/patient',
    action: '进入患者端',
  },
  {
    key: 'developer',
    title: '开发者端',
    subtitle: 'DevOps Console',
    desc: '面向技术团队的运维入口，覆盖环境巡检、服务监控与发布调试。',
    points: ['环境巡检', '服务监控', '开发调试'],
    route: '/developer',
    action: '进入开发者端',
  },
]

export function RoleHomePage() {
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<RoleCard | null>(null)

  return (
    <div className="role-page role-entry-page">
      <header className="entry-hero">
        <div className="entry-hero-brand">
          <span className="brand-logo" aria-hidden="true">M2</span>
          <div>
            <h1>M2 多端入口</h1>
            <p className="entry-subtitle">统一入口 · 分角色赋能</p>
          </div>
        </div>
        <p className="entry-desc">
          一套产品体系，三种角色体验：医生端强调临床专业，患者端强调关怀易用，开发者端强调运维与技术效率。
        </p>
      </header>

      <section className="role-grid role-entry-grid">
        {roleCards.map((card, idx) => (
          <article key={card.key} className={`card role-entry-card ${card.key}`} style={{ animationDelay: `${idx * 90}ms` }}>
            <div className="role-icon-wrap" aria-hidden="true">
              <span className="role-icon-core">{card.key === 'doctor' ? 'DR' : card.key === 'patient' ? 'PT' : 'DEV'}</span>
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
              直接进入
            </Link>
          </article>
        ))}
      </section>

      <footer className="entry-footer">
        <p>M2 Clinical Suite · Version 0.9.4</p>
        <p>Medical AI Platform | Powered by M2 Product Team</p>
      </footer>

      {activeRole ? (
        <div className="entry-modal-mask" role="dialog" aria-modal="true">
          <div className={`entry-modal ${activeRole.key}`}>
            <h3>{activeRole.title} · 角色说明</h3>
            <p>{activeRole.desc}</p>
            <ul>
              {activeRole.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="role-actions">
              <button type="button" className="btn ghost" onClick={() => setActiveRole(null)}>
                返回选择
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
                确认进入
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
