import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendChart } from '../components/charts/TrendChart'
import { HistoryTable } from '../components/history/HistoryTable'
import { usePatient } from '../context/PatientContext'
import { usePatientPortal } from '../context/PatientPortalContext'
import { clinicalApi } from '../services/clinicalApi'
import type { ClinicalEvent, HistoryRecord, TimeRangePreset, TrendSeries } from '../types/clinical'

export function PatientRecoveryDataPage() {
  const { patientId } = usePatient()
  const { painHistory } = usePatientPortal()
  const [range, setRange] = useState<TimeRangePreset>('month')
  const [series, setSeries] = useState<TrendSeries[]>([])
  const [events, setEvents] = useState<ClinicalEvent[]>([])
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [s, e, h] = await Promise.all([
        clinicalApi.getTrends(patientId, range),
        clinicalApi.getClinicalEvents(patientId, range),
        clinicalApi.getHistory(patientId),
      ])
      setSeries(s)
      setEvents(e)
      setHistory(h)
    } catch (error) {
      setErr(error instanceof Error ? error.message : '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [patientId, range])

  useEffect(() => {
    void load()
  }, [load])

  const painSeries = useMemo<TrendSeries>(
    () => ({
      metricKey: 'pain_score',
      points: painHistory.map((p) => ({
        t: p.at.slice(0, 10),
        value: p.score,
        source: 'measured',
      })),
    }),
    [painHistory],
  )

  const exportReport = () => {
    const payload = { range, generatedAt: new Date().toISOString(), series, history }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recovery-report-${patientId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="role-page portal-page patient-portal">
      <header className="page-header">
        <div>
          <h1>恢复数据</h1>
          <p className="muted">按周/月查看达成率、疼痛评分、关节活动度与肌力变化趋势。</p>
        </div>
        <div className="role-actions">
          <div className="range-toggle">
            {(['week', 'month', 'all'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`btn ${range === k ? 'primary' : 'ghost'}`}
                onClick={() => setRange(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <button type="button" className="btn ghost" onClick={exportReport}>导出报告</button>
        </div>
      </header>

      {loading ? <section className="card">数据加载中...</section> : null}
      {err ? <section className="card risk-list risk-high">{err}</section> : null}

      {!loading && !err ? (
        <>
          <section className="card">
            <h2 className="card-title">核心趋势图</h2>
            <TrendChart seriesList={[...series, painSeries]} events={events} height={420} />
          </section>
          <section className="card">
            <h2 className="card-title">历史记录</h2>
            <HistoryTable rows={history} selectedIds={new Set()} onToggle={() => {}} />
          </section>
        </>
      ) : null}
    </div>
  )
}
