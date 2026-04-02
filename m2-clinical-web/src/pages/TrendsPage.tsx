import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TrendChart } from '../components/charts/TrendChart'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { useI18n } from '../i18n/I18nContext'
import { clinicalApi } from '../services/clinicalApi'
import type { ClinicalEvent, TimeRangePreset, TrendSeries } from '../types/clinical'

export function TrendsPage() {
  const { patientId = 'p-001' } = useParams<{ patientId: string }>()
  const { t, locale } = useI18n()
  const [range, setRange] = useState<TimeRangePreset>('month')
  const [series, setSeries] = useState<TrendSeries[]>([])
  const [events, setEvents] = useState<ClinicalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    void locale
    setLoading(true)
    setErr(null)
    try {
      const [ts, ev] = await Promise.all([
        clinicalApi.getTrends(patientId, range),
        clinicalApi.getClinicalEvents(patientId, range),
      ])
      setSeries(ts); setEvents(ev)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    } finally { setLoading(false) }
  }, [patientId, range, locale])

  useEffect(() => { void load() }, [load])

  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1>{t('navTrends')}</h1>
          <p className="muted">{t('trendsDesc')}</p>
        </div>
        <div className="range-toggle" role="group" aria-label={t('timeRange')}>
          {([['week', t('week')], ['month', t('month')], ['all', t('all')]] as const).map(([k, lab]) => (
            <button key={k} type="button" className={`btn ${range === k ? 'primary' : 'ghost'}`} onClick={() => setRange(k)}>{lab}</button>
          ))}
        </div>
      </header>
      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}
      {loading ? (
        <LoadingBlock label={t('loadingTrends')} />
      ) : (
        <section className="card">
          <TrendChart seriesList={series} events={events} height={440} />
          <p className="muted small chart-footnote">{t('trendsFoot')}</p>
        </section>
      )}
    </div>
  )
}
