import { useState } from 'react'
import { usePatient } from '../../context/PatientContext'
import { useI18n } from '../../i18n/I18nContext'

const keyFor = (patientId: string) => `m2_clinical_notes_${patientId}`
const readStored = (patientId: string) => { try { return localStorage.getItem(keyFor(patientId)) || '' } catch { return '' } }

function NotesForPatient({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const [text, setText] = useState(() => readStored(patientId))
  const [saved, setSaved] = useState(false)
  const save = () => { try { localStorage.setItem(keyFor(patientId), text); setSaved(true); setTimeout(() => setSaved(false), 2000) } catch { /* ignore */ } }
  return (
    <section className="card notes-card">
      <header className="card-head"><h3>{t('notesTitle')}</h3><p className="muted small">{t('notesDesc')}</p></header>
      <textarea className="notes-area" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('notesPh')} />
      <div className="notes-actions"><button type="button" className="btn primary" onClick={save}>{t('saveNotes')}</button>{saved ? <span className="muted small">{t('saved')}</span> : null}</div>
    </section>
  )
}

export function ClinicalNotes() {
  const { patientId } = usePatient()
  return <NotesForPatient key={patientId} patientId={patientId} />
}
