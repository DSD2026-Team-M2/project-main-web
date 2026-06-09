import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { patientApiService } from '../services/patientApiService'
import type { ApiMeasurement, ApiSession } from '../types/api'
import { LoadingBlock } from '../components/common/LoadingBlock'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useI18n } from '../i18n/I18nContext'
import { extractJointAnglesFromMeasurement } from '../utils/measurementJointAngles'
import { AiCurveAnalysisCard } from '../components/doctor/AiCurveAnalysisCard'
import { aiRecommendationApiService } from '../services/aiRecommendationApiService'
import type { AiCurveAction, StandardCurveOverlayResponse } from '../types/aiRecommendation'
import {
  sessionActionTypeLabelKey,
  sessionActionTypeToAiCurve,
} from '../utils/sessionActionType'

const OVERLAY_ACTIONS: AiCurveAction[] = ['walking', 'squat', 'upstairs']
/** Match dashed standard line + band fill on chart */
const STANDARD_LINE_COLOR = '#e67e22'
const STANDARD_BAND_FILL = 'rgba(230, 126, 34, 0.18)'
const STANDARD_BAND_LEGEND = 'rgba(230, 126, 34, 0.45)'

const OVERLAY_REFERENCE_JOINTS = ['left_knee', 'right_knee'] as const

function getJointTimeRange(
  measurements: ApiMeasurement[],
  jointId: string,
): [number, number] | null {
  let tMin = Infinity
  let tMax = -Infinity
  measurements.forEach((m) => {
    extractJointAnglesFromMeasurement(m).forEach((j) => {
      if (j.angleID !== jointId) return
      const t = new Date(j.timestamp).getTime()
      if (!Number.isFinite(t)) return
      tMin = Math.min(tMin, t)
      tMax = Math.max(tMax, t)
    })
  })
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return null
  return [tMin, tMax]
}

/** Bilateral knee standard — prefer left_knee timeline, else right_knee, else whole session. */
function getOverlayTimeRange(measurements: ApiMeasurement[]): [number, number] | null {
  for (const jointId of OVERLAY_REFERENCE_JOINTS) {
    const range = getJointTimeRange(measurements, jointId)
    if (range) return range
  }
  let tMin = Infinity
  let tMax = -Infinity
  measurements.forEach((m) => {
    extractJointAnglesFromMeasurement(m).forEach((j) => {
      const t = new Date(j.timestamp).getTime()
      if (!Number.isFinite(t)) return
      tMin = Math.min(tMin, t)
      tMax = Math.max(tMax, t)
    })
  })
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return null
  return [tMin, tMax]
}

function overlayPointsToLineData(
  points: StandardCurveOverlayResponse['points'],
  valueKey: 'angle' | 'bandLow' | 'bandHigh',
): [number, number][] {
  return points.map((p) => {
    const t = p.timeMs
    const v = p[valueKey]
    if (t == null || v == null) return [Number.NaN, Number.NaN]
    return [t, v] as [number, number]
  })
}

function splitOverlayRuns(points: StandardCurveOverlayResponse['points']) {
  const runs: StandardCurveOverlayResponse['points'][] = []
  let current: StandardCurveOverlayResponse['points'] = []
  for (const point of points) {
    if (point.timeMs == null || point.angle == null) {
      if (current.length > 0) {
        runs.push(current)
        current = []
      }
      continue
    }
    current.push(point)
  }
  if (current.length > 0) runs.push(current)
  return runs
}

function interpolateOverlayAt(
  points: StandardCurveOverlayResponse['points'],
  timeMs: number,
  valueKey: 'angle' | 'bandLow' | 'bandHigh',
): number | null {
  for (const run of splitOverlayRuns(points)) {
    if (run.length === 0) continue
    const tMin = run[0].timeMs!
    const tMax = run[run.length - 1].timeMs!
    if (timeMs < tMin || timeMs > tMax) continue

    if (timeMs <= tMin) {
      const v = run[0][valueKey]
      return v == null ? null : v
    }
    if (timeMs >= tMax) {
      const v = run[run.length - 1][valueKey]
      return v == null ? null : v
    }

    for (let i = 1; i < run.length; i++) {
      const t0 = run[i - 1].timeMs!
      const t1 = run[i].timeMs!
      const y0 = run[i - 1][valueKey]
      const y1 = run[i][valueKey]
      if (y0 == null || y1 == null) continue
      if (timeMs <= t1) {
        const w = (timeMs - t0) / (t1 - t0)
        return y0 + w * (y1 - y0)
      }
    }
  }
  return null
}

function interpolateLineAt(data: [number, number][], timeMs: number): number | null {
  if (data.length === 0) return null
  if (timeMs <= data[0][0]) return data[0][1]
  const last = data[data.length - 1]
  if (timeMs >= last[0]) return last[1]
  for (let i = 1; i < data.length; i++) {
    const [t0, y0] = data[i - 1]
    const [t1, y1] = data[i]
    if (timeMs <= t1) {
      const w = (timeMs - t0) / (t1 - t0)
      return y0 + w * (y1 - y0)
    }
  }
  return null
}

/** Display API (UTC) timestamps in China standard time for chart axis & tooltips. */
const CHART_DISPLAY_TZ = 'Asia/Shanghai'

/** Axis: wall time in Asia/Shanghai, no date — HH:mm:ss */
function formatChartAxisTime(ms: number, loc: string): string {
  if (!Number.isFinite(ms)) return ''
  return new Date(ms).toLocaleString(loc, {
    timeZone: CHART_DISPLAY_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Tooltip: same zone with milliseconds (no calendar date). */
function formatChartTooltipTime(ms: number, loc: string): string {
  if (!Number.isFinite(ms)) return ''
  try {
    return new Intl.DateTimeFormat(loc, {
      timeZone: CHART_DISPLAY_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString(loc, {
      timeZone: CHART_DISPLAY_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }
}

export function SessionDetailPage() {
  const { patientId = '1', sessionId = '1' } = useParams<{
    patientId: string
    sessionId: string
  }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const uid = Number(patientId)
  const sid = Number(sessionId)

  // ── measurements ──────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState<ApiMeasurement[]>([])
  const [sessionMeta, setSessionMeta] = useState<ApiSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const sessionDefaultAction = useMemo(
    () => sessionActionTypeToAiCurve(sessionMeta?.action_type),
    [sessionMeta?.action_type],
  )

  // ── standard curve overlay — defaults to session action_type when known ─
  const [showStandardOverlay, setShowStandardOverlay] = useState(false)
  const [overlayAction, setOverlayAction] = useState<AiCurveAction>('walking')
  const [standardOverlay, setStandardOverlay] = useState<StandardCurveOverlayResponse | null>(null)
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [overlayErr, setOverlayErr] = useState<string | null>(null)

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [ms, sessions] = await Promise.all([
        patientApiService.listMeasurements(sid),
        Number.isFinite(uid) && uid > 0
          ? patientApiService.listSessions(uid)
          : Promise.resolve([] as ApiSession[]),
      ])
      setMeasurements(ms)
      setSessionMeta(sessions.find((s) => s.id === sid) ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [sid, uid, t])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (sessionDefaultAction) setOverlayAction(sessionDefaultAction)
  }, [sessionMeta?.id, sessionDefaultAction])

  const sessionActionLabel = useMemo(() => {
    const key = sessionActionTypeLabelKey(sessionMeta?.action_type)
    return t(key)
  }, [sessionMeta?.action_type, t])

  useEffect(() => {
    if (!showStandardOverlay || !Number.isFinite(sid) || sid <= 0) {
      setStandardOverlay(null)
      setOverlayErr(null)
      setOverlayLoading(false)
      return
    }

    let cancelled = false
    const requestedAction = overlayAction
    setStandardOverlay(null)
    setOverlayLoading(true)
    setOverlayErr(null)

    void aiRecommendationApiService
      .getStandardCurveOverlay(requestedAction, sid)
      .then((curve) => {
        if (cancelled || curve.action !== requestedAction) return
        setStandardOverlay(curve)
      })
      .catch((e) => {
        if (cancelled) return
        setStandardOverlay(null)
        setOverlayErr(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setOverlayLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showStandardOverlay, overlayAction, sid])

  const overlayActionLabel = useMemo(
    () =>
      ({
        walking: t('aiCurveActionWalking'),
        squat: t('aiCurveActionSquat'),
        upstairs: t('aiCurveActionUpstairs'),
      }) satisfies Record<AiCurveAction, string>,
    [t],
  )

  const overlayHint = useMemo(() => {
    if (!standardOverlay) return null
    if (standardOverlay.overlayMode === 'segmented') {
      return t('sessionChartOverlaySegments', { count: standardOverlay.segmentsUsed })
    }
    if (standardOverlay.overlayMode === 'full_session_fallback') {
      return t('sessionChartOverlayFallback')
    }
    return t('sessionChartOverlayFullSession')
  }, [standardOverlay, t])

  // ── chart (time axis: each joint keeps its own sample times; display UTC+8) ─
  const chartOption = useMemo(() => {
    type Pt = { t: number; joint: string; angle: number }
    const points: Pt[] = []
    measurements.forEach((m) => {
      extractJointAnglesFromMeasurement(m).forEach((j) => {
        const t = new Date(j.timestamp).getTime()
        if (!Number.isFinite(t)) return
        points.push({ t, joint: j.angleID, angle: j.angle })
      })
    })

    if (points.length === 0) {
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: [] as string[] },
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: 'Angle (°)' },
        series: [] as any[],
      }
    }

    const joints = Array.from(new Set(points.map((p) => p.joint)))
    const acc = new Map<string, Map<number, { sum: number; n: number }>>()
    points.forEach((p) => {
      let byT = acc.get(p.joint)
      if (!byT) {
        byT = new Map()
        acc.set(p.joint, byT)
      }
      const cur = byT.get(p.t)
      if (!cur) byT.set(p.t, { sum: p.angle, n: 1 })
      else {
        cur.sum += p.angle
        cur.n += 1
      }
    })

    const jointLineData = new Map<string, [number, number][]>()
    const series: Record<string, unknown>[] = joints.map((joint) => {
      const byT = acc.get(joint)
      if (!byT) return { type: 'line', name: joint, smooth: true, showSymbol: false, data: [] as [number, number][] }
      const data: [number, number][] = [...byT.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, v]) => [t, parseFloat((v.sum / v.n).toFixed(2))])
      jointLineData.set(joint, data)
      return { type: 'line', name: joint, smooth: true, showSymbol: false, data }
    })

    const legendNames = [...joints]
    const stdBandLabel = t('sessionChartStandardBand')
    let overlayPoints: StandardCurveOverlayResponse['points'] | null = null
    let overlayStdLabel: string | null = null

    const overlayActive =
      showStandardOverlay &&
      !overlayLoading &&
      standardOverlay != null &&
      standardOverlay.action === overlayAction

    if (overlayActive) {
      overlayPoints = standardOverlay.points
      const stdLine = overlayPointsToLineData(standardOverlay.points, 'angle')
      const stdLabel = t('sessionChartStandardLine', { action: overlayActionLabel[overlayAction] })
      overlayStdLabel = stdLabel
      const overlaySeriesKey = `${overlayAction}-${standardOverlay.segmentsUsed}-${standardOverlay.overlayMode}`

      const hasBand = standardOverlay.points.some(
        (p) => p.bandLow != null && p.bandHigh != null,
      )
      if (hasBand) {
        splitOverlayRuns(standardOverlay.points).forEach((run, runIndex) => {
          if (!run.every((p) => p.bandLow != null && p.bandHigh != null)) return
          const stackId = `${overlaySeriesKey}-band-${runIndex}`
          const bandLow: [number, number][] = run.map((p) => [p.timeMs!, p.bandLow!])
          const bandFill: [number, number][] = run.map((p) => [p.timeMs!, p.bandHigh! - p.bandLow!])

          series.push({
            id: `${stackId}-low`,
            name: runIndex === 0 ? stdBandLabel : `__std-band-low-${overlaySeriesKey}-${runIndex}`,
            type: 'line',
            data: bandLow,
            lineStyle: { opacity: 0, color: STANDARD_BAND_LEGEND },
            itemStyle: { color: STANDARD_BAND_LEGEND },
            stack: stackId,
            symbol: 'none',
            silent: true,
            tooltip: { show: false },
            showInLegend: runIndex === 0,
            z: 1,
          })
          series.push({
            id: `${stackId}-fill`,
            name: `__std-band-fill-${overlaySeriesKey}-${runIndex}`,
            type: 'line',
            data: bandFill,
            lineStyle: { opacity: 0 },
            areaStyle: { color: STANDARD_BAND_FILL },
            stack: stackId,
            symbol: 'none',
            silent: true,
            showInLegend: false,
            tooltip: { show: false },
            z: 1,
          })
        })
        legendNames.push(stdBandLabel)
      }

      series.push({
        id: `${overlaySeriesKey}-line`,
        name: stdLabel,
        type: 'line',
        smooth: false,
        showSymbol: false,
        data: stdLine,
        connectNulls: false,
        lineStyle: { type: 'dashed', width: 2.5, color: STANDARD_LINE_COLOR },
        itemStyle: { color: STANDARD_LINE_COLOR },
        tooltip: { show: false },
        z: 5,
      })
      legendNames.push(stdLabel)
    }

    return {
      replaceMerge: ['series'],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            formatter: (p: { axisDimension?: string; value?: number }) =>
              p.axisDimension === 'x' && p.value != null
                ? formatChartAxisTime(Number(p.value), locale)
                : String(p.value ?? ''),
          },
        },
        formatter: (params: unknown) => {
          const arr = params as {
            axisValue: number
            marker: string
            seriesName: string
          }[]
          if (!Array.isArray(arr) || arr.length === 0) return ''
          const axisTime = Number(arr[0].axisValue)
          if (!Number.isFinite(axisTime)) return ''
          const head = formatChartTooltipTime(axisTime, locale)
          const lines: string[] = []

          const markerByName = new Map(arr.map((p) => [p.seriesName, p.marker]))
          const palette = [
            '#5470c6',
            '#91cc75',
            '#fac858',
            '#ee6666',
            '#73c0de',
            '#3ba272',
            '#fc8452',
            '#9a60b4',
          ]
          const dotMarker = (color: string) =>
            `<span style="display:inline-block;margin-right:4px;border-radius:50%;width:10px;height:10px;background:${color}"></span>`
          const stdMarker = `<span style="display:inline-block;margin-right:4px;width:10px;height:0;border-top:2px dashed ${STANDARD_LINE_COLOR}"></span>`
          const bandMarker = `<span style="display:inline-block;margin-right:4px;border-radius:2px;width:10px;height:10px;background:${STANDARD_BAND_LEGEND}"></span>`

          joints.forEach((joint, i) => {
            const data = jointLineData.get(joint)
            if (!data) return
            const y = interpolateLineAt(data, axisTime)
            if (y == null) return
            const marker = markerByName.get(joint) ?? dotMarker(palette[i % palette.length])
            lines.push(`${marker}${joint}: ${y.toFixed(2)}°`)
          })

          if (overlayPoints && overlayStdLabel) {
            const y = interpolateOverlayAt(overlayPoints, axisTime, 'angle')
            if (y != null) {
              lines.push(`${stdMarker}${overlayStdLabel}: ${y.toFixed(2)}°`)
            }
          }

          if (overlayPoints) {
            const low = interpolateOverlayAt(overlayPoints, axisTime, 'bandLow')
            const high = interpolateOverlayAt(overlayPoints, axisTime, 'bandHigh')
            if (low != null && high != null) {
              lines.push(`${bandMarker}${stdBandLabel}: ${low.toFixed(2)}° ~ ${high.toFixed(2)}°`)
            }
          }

          if (lines.length === 0) return ''
          return `<div style="font-weight:600;margin-bottom:4px">${head}</div>${lines.join('<br/>')}`
        },
      },
      legend: { data: legendNames },
      xAxis: {
        type: 'time',
        axisLabel: {
          fontSize: 11,
          hideOverlap: true,
          formatter: (v: string | number) => formatChartAxisTime(Number(v), locale),
        },
      },
      yAxis: { type: 'value', name: 'Angle (°)' },
      grid: { top: 30, left: 50, right: 20, bottom: 80, containLabel: true },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, height: 22, bottom: 22, filterMode: 'none' },
      ],
      series,
    }
  }, [
    measurements,
    locale,
    showStandardOverlay,
    overlayLoading,
    standardOverlay,
    overlayAction,
    overlayActionLabel,
    t,
  ])

  const chartRenderKey = `${sid}-${overlayAction}-${showStandardOverlay ? 'on' : 'off'}`

  const canOverlayStandard = useMemo(
    () => getOverlayTimeRange(measurements) != null,
    [measurements],
  )

  const startedAtTitle = useMemo(() => {
    const raw = sessionMeta?.started_at
    if (!raw) return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })
  }, [sessionMeta, locale])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="page doctor-workspace-page">
      <header className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.2rem' }}>
            {startedAtTitle ?? (loading ? '…' : t('sessionDetailTimeUnknown'))}
          </h1>
          <p className="muted">{t('sessionDetailSessionLine', { id: sessionId })}</p>
          <p className="muted">{t('sessionDetailPatientLine', { patientId })}</p>
          {sessionMeta ? (
            <p className="muted">
              {t('sessionActionType')}: {sessionActionLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate(`/doctor/p/${patientId}/sessions`)}
        >
          {t('sessionDetailBack')}
        </button>
      </header>

      {err ? <ErrorBanner message={err} onRetry={() => void load()} /> : null}

      {/* Chart loads from V2 API; AI panels stay visible so actions are not blocked by slow/hung fetches. */}
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title">{t('sessionChartTitle')}</h2>
        {!loading && measurements.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="checkbox"
                checked={showStandardOverlay}
                disabled={!canOverlayStandard}
                onChange={(e) => setShowStandardOverlay(e.target.checked)}
              />
              <span className="small">{t('sessionChartOverlayEnable')}</span>
            </label>
            {showStandardOverlay ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="muted small">{t('sessionChartOverlayAction')}</span>
                <select
                  value={overlayAction}
                  onChange={(e) => setOverlayAction(e.target.value as AiCurveAction)}
                >
                  {OVERLAY_ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {overlayActionLabel[a]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
        {overlayLoading && showStandardOverlay ? (
          <LoadingBlock label={t('sessionChartOverlayLoading')} />
        ) : null}
        {overlayErr && showStandardOverlay ? <ErrorBanner message={overlayErr} /> : null}
        {showStandardOverlay && overlayHint && !overlayLoading && !overlayErr ? (
          <p className="muted small" style={{ marginBottom: '0.5rem' }}>
            {overlayHint}
          </p>
        ) : null}
        {loading ? (
          <LoadingBlock label={t('sessionDetailLoading')} />
        ) : measurements.length === 0 ? (
          <p className="muted">{t('sessionChartEmpty')}</p>
        ) : (
          <ReactECharts
            key={chartRenderKey}
            option={chartOption}
            notMerge
            lazyUpdate={false}
            style={{ height: 300 }}
          />
        )}
      </section>

      {/* ── AI Curve Analysis (Borges/V1 motion module) ── */}
      <AiCurveAnalysisCard sessionId={sid} defaultAction={sessionDefaultAction ?? undefined} />
    </div>
  )
}
