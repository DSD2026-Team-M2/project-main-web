import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
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
  const compareOption = useMemo(() => {
    const list = selectedRecords.slice().sort((a, b) => a.t.localeCompare(b.t))
    const labels = list.map((x) => x.t.slice(5, 10))
    const romData = list.map((x) => x.metrics.knee_flexion_rom?.value ?? null)
    const mmtData = list.map((x) => x.metrics.quadriceps_mmt?.value ?? null)
    return {
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: [
        { type: 'line', name: 'ROM', data: romData, smooth: true },
        { type: 'line', name: 'MMT', data: mmtData, smooth: true },
      ],
    }
  }, [selectedRecords])

  const compareSummary = useMemo(() => {
    if (selectedRecords.length < 2) return ''
    const list = selectedRecords.slice().sort((a, b) => a.t.localeCompare(b.t))
    const first = list[0]
    const last = list[list.length - 1]
    const romDelta =
      (last.metrics.knee_flexion_rom?.value ?? 0) - (first.metrics.knee_flexion_rom?.value ?? 0)
    const mmtDelta =
      (last.metrics.quadriceps_mmt?.value ?? 0) - (first.metrics.quadriceps_mmt?.value ?? 0)
    const rom = `${romDelta >= 0 ? '+' : ''}${romDelta}`
    const mmt = `${mmtDelta >= 0 ? '+' : ''}${mmtDelta}`
    return t('historyAutoAnalyzeResult', { rom, mmt })
  }, [selectedRecords, t])

  return (
    <div className="page doctor-workspace-page">
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
          <section className="card">
            <p className="muted small">{t('historyAutoAnalyzePrompt')}</p>
            {selectedRecords.length >= 2 ? (
              <>
                <ReactECharts option={compareOption} style={{ height: 260 }} />
                <p className="small">{compareSummary}</p>
              </>
            ) : null}
          </section>
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
