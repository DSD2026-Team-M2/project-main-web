import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { usePatient } from '../../context/PatientContext'
import { useI18n } from '../../i18n/I18nContext'
import { patientApiService } from '../../services/patientApiService'
import type { ApiPainLog } from '../../types/api'
import { painLevelMeta } from '../../utils/painLevel'
import { LoadingBlock } from '../common/LoadingBlock'

const PAGE_SIZE = 10

const SAMPLE_PAIN_LOGS: ApiPainLog[] = [
  {
    id: 901,
    user_id: 0,
    level: 8,
    notes: 'Strong pain after stair climbing exercise',
    created_at: '2026-06-06T10:02:00Z',
  },
  {
    id: 902,
    user_id: 0,
    level: 3,
    notes: null,
    created_at: '2026-06-07T08:40:00Z',
  },
  {
    id: 903,
    user_id: 0,
    level: 5,
    notes: 'Pain after morning session',
    created_at: '2026-06-08T09:15:00Z',
  },
  {
    id: 904,
    user_id: 0,
    level: 2,
    notes: null,
    created_at: '2026-06-09T07:30:00Z',
  },
  {
    id: 905,
    user_id: 0,
    level: 7,
    notes: 'Knee stiffness in the evening',
    created_at: '2026-06-09T18:20:00Z',
  },
]

function formatPainTimestamp(iso: string, locale: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso.slice(0, 16).replace('T', ' · ')
  }
}

function sortPainLogsNewestFirst(logs: ApiPainLog[]): ApiPainLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function PainHistoryPanel() {
  const { patientId } = usePatient()
  const { t, locale } = useI18n()
  const uid = Number(patientId)
  const isApiPatient = !isNaN(uid) && uid > 0

  const [logs, setLogs] = useState<ApiPainLog[]>([])
  const [loading, setLoading] = useState(false)
  const [apiPending, setApiPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const loadPain = useCallback(async () => {
    if (!isApiPatient) {
      setLogs([])
      return
    }
    setLoading(true)
    setError(null)
    setApiPending(false)
    try {
      const data = await patientApiService.listPainLogs(uid)
      setLogs(sortPainLogsNewestFirst(data))
      setVisibleCount(PAGE_SIZE)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('loadFailed')
      if (msg.includes('404') || msg.includes('Not Found')) {
        setApiPending(true)
        setLogs([])
      } else {
        setError(msg)
        setLogs([])
      }
    } finally {
      setLoading(false)
    }
  }, [isApiPatient, t, uid])

  useEffect(() => {
    void loadPain()
  }, [loadPain])

  function handleLoadSample() {
    setLogs(sortPainLogsNewestFirst(SAMPLE_PAIN_LOGS))
    setApiPending(false)
    setError(null)
    setVisibleCount(PAGE_SIZE)
  }

  const visibleLogs = logs.slice(0, visibleCount)
  const chartOption = useMemo(() => {
    const recent = [...logs]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-30)
    if (recent.length < 2) return null
    return {
      grid: { left: 36, right: 12, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: recent.map((l) => formatPainTimestamp(l.created_at, locale).slice(0, 11)),
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'value' as const,
        min: 1,
        max: 10,
        interval: 1,
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          type: 'line' as const,
          data: recent.map((l) => l.level),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#BA7517', width: 2 },
          itemStyle: { color: '#BA7517' },
        },
      ],
    }
  }, [locale, logs])

  if (!isApiPatient) {
    return (
      <section className="card pain-card">
        <h3 className="card-title">{t('painHistoryTitle')}</h3>
        <p className="muted small">{t('sessionsInvalidId')}</p>
      </section>
    )
  }

  return (
    <section className="card pain-card">
      <div className="pain-card-header">
        <h3 className="card-title">{t('painHistoryTitle')}</h3>
        <div className="pain-card-actions">
          {import.meta.env.DEV ? (
            <button
              type="button"
              className="btn ghost small"
              disabled={loading}
              onClick={handleLoadSample}
              title={t('painHistoryPreviewSampleTitle')}
            >
              {t('painHistoryPreviewSample')}
            </button>
          ) : null}
          <button type="button" className="btn ghost small" onClick={() => void loadPain()} disabled={loading}>
            {t('refresh')}
          </button>
        </div>
      </div>

      {loading ? <LoadingBlock label={t('loading')} /> : null}

      {!loading && apiPending ? (
        <p className="muted small pain-pending">{t('painHistoryPending')}</p>
      ) : null}

      {!loading && error ? (
        <p className="small pain-error">{error}</p>
      ) : null}

      {!loading && !apiPending && !error && logs.length === 0 ? (
        <p className="muted small">{t('painHistoryEmpty')}</p>
      ) : null}

      {!loading && visibleLogs.length > 0 ? (
        <ul className="pain-log-list">
          {visibleLogs.map((log) => {
            const meta = painLevelMeta(log.level)
            return (
              <li
                key={log.id}
                className={`pain-log-row${meta.alert ? ' pain-log-row--alert' : ''}`}
              >
                <span
                  className="pain-level-badge"
                  style={{ backgroundColor: meta.color }}
                  title={t(meta.labelKey)}
                >
                  {meta.level}
                </span>
                <div className="pain-log-body">
                  <p className="pain-log-head">
                    <span className="pain-log-label" style={{ color: meta.color }}>
                      {t(meta.labelKey)}
                    </span>
                    <span className="muted small">
                      {formatPainTimestamp(log.created_at, locale)}
                    </span>
                  </p>
                  {log.notes ? <p className="pain-log-notes muted small">{log.notes}</p> : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {!loading && logs.length > visibleCount ? (
        <button
          type="button"
          className="btn ghost small pain-load-more"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          {t('painHistoryLoadMore')}
        </button>
      ) : null}

      {!loading && chartOption ? (
        <div className="pain-trend-chart">
          <p className="muted small pain-trend-label">{t('painHistoryTrend')}</p>
          <ReactECharts option={chartOption} style={{ height: 160 }} />
        </div>
      ) : null}
    </section>
  )
}
