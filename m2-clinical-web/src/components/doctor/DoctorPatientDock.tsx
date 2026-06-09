import { ClinicalNotes } from '../common/ClinicalNotes'
import { PainHistoryPanel } from './PainHistoryPanel'
import { PatientPrescriptionPanel } from './PatientPrescriptionPanel'

/** 患者页底部：疼痛记录 → 康复计划 → 临床备注 */
export function DoctorPatientDock() {
  return (
    <div className="doctor-patient-dock">
      <PainHistoryPanel />
      <PatientPrescriptionPanel />
      <ClinicalNotes />
    </div>
  )
}
