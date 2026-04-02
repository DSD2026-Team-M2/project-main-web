import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatientPortal } from '../context/PatientPortalContext'

export function PatientFollowUpPage() {
  const { followUps } = usePatientPortal()
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setShowReminder(true), 2200)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>复诊与随访</h1>
          <p className="muted">查看历史与未来复诊安排，支持线上预约与远程复诊入口。</p>
        </div>
      </header>

      {showReminder ? (
        <section className="card risk-list">
          <strong>复诊提醒：</strong>您在 2026-04-06 14:30 有随访安排。
          <div className="role-actions">
            <button type="button" className="btn primary" onClick={() => setShowReminder(false)}>
              我知道了
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2 className="card-title">复诊日程</h2>
        <div className="task-list">
          {followUps.map((item) => (
            <article key={item.id} className="task-row">
              <div>
                <p className="task-title">{item.dateTime}</p>
                <p className="muted small">{item.doctor} · {item.mode === 'online' ? '线上远程' : '线下门诊'}</p>
              </div>
              <span className={`tag ${item.status === 'upcoming' ? 'tag-blue' : 'tag-gray'}`}>
                {item.status === 'upcoming' ? '待复诊' : '已完成'}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">在线操作</h2>
        <div className="role-actions">
          <button type="button" className="btn primary">线上预约</button>
          <button type="button" className="btn ghost">进入远程复诊</button>
          <Link className="btn ghost" to="/patient/home">返回首页</Link>
        </div>
      </section>
    </div>
  )
}
