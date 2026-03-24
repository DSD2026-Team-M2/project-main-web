import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ComparisonPanel } from '../components/history/ComparisonPanel'
import { HistoryMetricsPreview, HistoryTable } from '../components/history/HistoryTable'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import type { HistoryRecord } from '../types/clinical'

export function HistoryPage() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { t, locale } = useI18n()
  const [rows, setRows] = useState<HistoryRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    void locale
    setLoading(true); setErr(null)
    try { setRows(await clinicalApi.getHistory(patientId)); setSelected(new Set()) }
    catch (e) { setErr(e instanceof Error ? e.message : 'load failed') }
    finally { setLoading(false) }
  }, [patientId, locale])
  useEffect(() => { void load() }, [load])

  const toggle = (id: string, checked: boolean) => setSelected((prev) => {
    const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n
  })
  const selectedRecords = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{t('navHistory')}</h1>
          <p className="muted">{t('historyDesc')}</p>
        </div>
      </header>
      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}
      {loading ? <LoadingBlock label={t('loadingHistory')} /> : (
        <>
          <section className="card"><HistoryTable rows={rows} selectedIds={selected} onToggle={toggle} /></section>
          <section className="card"><h2 className="card-title">{t('metricCompare')}</h2><ComparisonPanel records={selectedRecords} /></section>
          {selectedRecords.length ? (
            <section className="card">
              <h2 className="card-title">{t('selectedSummary')}</h2>
              <ul className="selected-records">{selectedRecords.map((r) => (
                <li key={r.id}><div className="sel-head"><strong>{r.title}</strong><span className="muted small">{r.t}</span></div><HistoryMetricsPreview record={r} /></li>
              ))}</ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
