import { Link } from 'react-router-dom'
import { usePatientPortal } from '../context/PatientPortalContext'

export function PatientTrainingPlanPage() {
  const { tasks } = usePatientPortal()

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>训练计划（第 1-12 周）</h1>
          <p className="muted">按阶段查看康复动作、视频教程与注意事项。</p>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">当前阶段：第 8 周重点训练</h2>
        <div className="task-list">
          {tasks.map((task) => (
            <article key={task.id} className="task-row task-row-upgraded">
              <div className="task-main">
                <p className="task-title">{task.title}</p>
                <p className="muted small">{task.week} · {task.target}</p>
                <p className="small">{task.caution}</p>
              </div>
              <div className="role-actions">
                <Link className="btn primary" to={`/patient/training/${task.id}`}>
                  开始训练
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
