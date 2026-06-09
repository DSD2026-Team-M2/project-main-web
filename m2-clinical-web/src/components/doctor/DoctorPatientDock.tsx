import { ClinicalNotes } from '../common/ClinicalNotes'
import { PainHistoryPanel } from './PainHistoryPanel'
import { PatientPrescriptionPanel } from './PatientPrescriptionPanel'

/** 患者页底部：临床备注 + 疼痛记录 + 康复医嘱 */
export function DoctorPatientDock() {
  return (
    <div className="doctor-patient-dock">
      <ClinicalNotes />
      <PainHistoryPanel />
      <PatientPrescriptionPanel />
    </div>
  )
}
