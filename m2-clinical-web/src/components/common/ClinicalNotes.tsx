import { useRef, useState } from 'react'
import { usePatient } from '../../context/PatientContext'
import { useI18n } from '../../i18n/I18nContext'

const keyFor = (patientId: string) => `m2_clinical_notes_${patientId}`
const versionKeyFor = (patientId: string) => `m2_clinical_notes_versions_${patientId}`
const readStored = (patientId: string) => { try { return localStorage.getItem(keyFor(patientId)) || '' } catch { return '' } }
const readVersions = (patientId: string) => {
  try {
    const raw = localStorage.getItem(versionKeyFor(patientId))
    return raw ? (JSON.parse(raw) as Array<{ at: string; html: string }>) : []
  } catch {
    return []
  }
}

function NotesForPatient({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const [html, setHtml] = useState(() => readStored(patientId))
  const [versions, setVersions] = useState(() => readVersions(patientId))
  const [saved, setSaved] = useState(false)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const save = () => {
    try {
      localStorage.setItem(keyFor(patientId), html)
      const next = [{ at: new Date().toISOString(), html }, ...versions].slice(0, 8)
      setVersions(next)
      localStorage.setItem(versionKeyFor(patientId), JSON.stringify(next))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const applyCmd = (cmd: 'bold' | 'insertUnorderedList') => {
    document.execCommand(cmd)
    setHtml(editorRef.current?.innerHTML || '')
  }

  const addImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result || '')
      const img = `<p><img src="${src}" alt="临床备注图片" style="max-width:100%;border-radius:8px;" /></p>`
      const next = (editorRef.current?.innerHTML || '') + img
      if (editorRef.current) editorRef.current.innerHTML = next
      setHtml(next)
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="card notes-card">
      <header className="card-head"><h3>{t('notesTitle')}</h3><p className="muted small">{t('notesDesc')}</p></header>
      <div className="notes-toolbar">
        <button type="button" className="btn ghost" onClick={() => applyCmd('bold')}>{t('notesBold')}</button>
        <button type="button" className="btn ghost" onClick={() => applyCmd('insertUnorderedList')}>{t('notesList')}</button>
        <label className="btn ghost">
          {t('notesInsertImage')}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) addImage(file)
            }}
          />
        </label>
      </div>
      <div
        ref={editorRef}
        className="notes-rich"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)}
        dangerouslySetInnerHTML={{ __html: html || `<p>${t('notesPh')}</p>` }}
      />
      <div className="notes-actions"><button type="button" className="btn primary" onClick={save}>{t('saveNotes')}</button>{saved ? <span className="muted small">{t('saved')}</span> : null}</div>
      {versions.length ? (
        <div className="notes-versions">
          <p className="small muted">{t('notesHistoryVersions')}</p>
          <div className="role-actions">
            {versions.map((v) => (
              <button
                key={v.at}
                type="button"
                className="btn ghost"
                onClick={() => {
                  setHtml(v.html)
                  if (editorRef.current) editorRef.current.innerHTML = v.html
                }}
              >
                {new Date(v.at).toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function ClinicalNotes() {
  const { patientId } = usePatient()
  return <NotesForPatient key={patientId} patientId={patientId} />
}
