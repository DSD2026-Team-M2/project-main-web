import { usePatient } from '../context/PatientContext'

export function PatientProfilePage() {
  const { currentPatient, patientId } = usePatient()

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>个人中心</h1>
          <p className="muted">患者信息、康复档案、系统设置与帮助中心。</p>
        </div>
      </header>

      <section className="portal-two-col premium-grid">
        <article className="card">
          <h2 className="card-title">基本信息</h2>
          <p>患者编号：<strong>{patientId}</strong></p>
          <p>姓名：{currentPatient?.displayName ?? '-'}</p>
          <p>诊断：{currentPatient?.diagnosisShort ?? '-'}</p>
        </article>
        <article className="card">
          <h2 className="card-title">帮助中心</h2>
          <ul className="simple-list">
            <li>账户与安全</li>
            <li>康复数据说明</li>
            <li>联系康复团队</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
