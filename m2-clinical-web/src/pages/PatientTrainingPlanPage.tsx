import { Link } from 'react-router-dom'
import { usePatientPortal } from '../context/PatientPortalContext'
import { useI18n } from '../i18n/I18nContext'

export function PatientTrainingPlanPage() {
  const { t } = useI18n()
  const { tasks } = usePatientPortal()

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>{t('trainingPlanTitle')}</h1>
          <p className="muted">{t('trainingPlanDesc')}</p>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">{t('trainingCurrentPhase')}</h2>
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
                  {t('startTraining')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
