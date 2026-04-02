import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/patient/home', label: '康复首页' },
  { to: '/patient/training', label: '训练计划' },
  { to: '/patient/recovery', label: '恢复数据' },
  { to: '/patient/follow-up', label: '复诊与随访' },
  { to: '/patient/limb-3d', label: '3D肢体视图' },
  { to: '/patient/profile', label: '个人中心' },
]

export function PatientPortalLayout() {
  return (
    <div className="patient-shell">
      <header className="patient-nav-header">
        <div className="patient-nav-inner">
          <div className="patient-nav-brand">
            <span className="patient-brand-dot" aria-hidden>
              ●
            </span>
            ACL 术后康复中心
          </div>
          <nav className="patient-nav" aria-label="患者端导航">
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
        </div>
      </header>
      <main className="patient-main-content">
        <Outlet />
      </main>
    </div>
  )
}
