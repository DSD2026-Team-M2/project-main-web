import { usePatient } from '../context/PatientContext'
import { useI18n } from '../i18n/I18nContext'

export function PatientProfilePage() {
  const { t } = useI18n()
  const { currentPatient, patientId } = usePatient()

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>{t('profileTitle')}</h1>
          <p className="muted">{t('profileDesc')}</p>
        </div>
      </header>

      <section className="portal-two-col premium-grid">
        <article className="card">
          <h2 className="card-title">{t('basicInfo')}</h2>
          <p>{t('patientNo')}：<strong>{patientId}</strong></p>
          <p>{t('name')}：{currentPatient?.displayName ?? '-'}</p>
          <p>{t('diagnosis')}：{currentPatient?.diagnosisShort ?? '-'}</p>
        </article>
        <article className="card">
          <h2 className="card-title">{t('helpCenter')}</h2>
          <ul className="simple-list">
            <li>{t('helpAccount')}</li>
            <li>{t('helpRecovery')}</li>
            <li>{t('helpContact')}</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
