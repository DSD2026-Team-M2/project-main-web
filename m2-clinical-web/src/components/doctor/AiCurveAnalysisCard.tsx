/**
 * AiCurveAnalysisCard — session detail card for Borges curve-based AI recommendations.
 */

import { useMemo, useState } from 'react'
import { aiRecommendationApiService } from '../../services/aiRecommendationApiService'
import type {
  AiCurveAction,
  AiCurveRecommendation,
  AiCurveStatus,
} from '../../types/aiRecommendation'
import { LoadingBlock } from '../common/LoadingBlock'
import { ErrorBanner } from '../common/ErrorBanner'
import { useI18n } from '../../i18n/I18nContext'

const STATUS_CLASS: Record<AiCurveStatus, string> = {
  normal: 'pass',
  mild_deviation: 'idle',
  significant_deviation: 'fail',
}

const ACTION_OPTIONS: AiCurveAction[] = ['walking', 'squat', 'upstairs']

const COMPONENT_KEYS = [
  'overall',
  'shape',
  'rangeOfMotion',
  'verticalOffset',
  'standardBand',
] as const

type Props = {
  sessionId: number
}

export function AiCurveAnalysisCard({ sessionId }: Props) {
  const { t } = useI18n()
  const [action, setAction] = useState<AiCurveAction>('walking')
  const [data, setData] = useState<AiCurveRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const statusLabel = useMemo(
    () =>
      ({
        normal: t('aiCurveStatusNormal'),
        mild_deviation: t('aiCurveStatusMild'),
        significant_deviation: t('aiCurveStatusSignificant'),
      }) satisfies Record<AiCurveStatus, string>,
    [t],
  )

  const actionLabel = useMemo(
    () =>
      ({
        walking: t('aiCurveActionWalking'),
        squat: t('aiCurveActionSquat'),
        upstairs: t('aiCurveActionUpstairs'),
      }) satisfies Record<AiCurveAction, string>,
    [t],
  )

  const componentLabel = useMemo(
    () =>
      ({
        overall: t('aiCurveCompOverall'),
        shape: t('aiCurveCompShape'),
        rangeOfMotion: t('aiCurveCompRangeOfMotion'),
        verticalOffset: t('aiCurveCompVerticalOffset'),
        standardBand: t('aiCurveCompStandardBand'),
      }) satisfies Record<(typeof COMPONENT_KEYS)[number], string>,
    [t],
  )

  async function handleGenerate() {
    setLoading(true)
    setErr(null)
    try {
      const r = await aiRecommendationApiService.generate(action, sessionId)
      setData(r)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleLoadSample() {
    setErr(null)
    setData(SAMPLE_RECOMMENDATION)
  }

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <h2 className="card-title">{t('aiCurveTitle')}</h2>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="muted small">{t('aiCurveAction')}</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AiCurveAction)}
            disabled={loading}
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {actionLabel[a]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn primary"
          disabled={loading}
          onClick={() => void handleGenerate()}
        >
          {data ? t('aiCurveRegenerate') : t('aiCurveGenerate')}
        </button>
        {import.meta.env.DEV ? (
          <button
            type="button"
            className="btn ghost"
            disabled={loading}
            onClick={handleLoadSample}
            title={t('aiCurvePreviewSampleTitle')}
          >
            {t('aiCurvePreviewSample')}
          </button>
        ) : null}
      </div>

      {loading && <LoadingBlock label={t('aiCurveLoading')} />}
      {err && <ErrorBanner message={err} />}

      {data && !loading && (
        <Result
          data={data}
          statusLabel={statusLabel}
          actionLabel={actionLabel}
          componentLabel={componentLabel}
          t={t}
        />
      )}
    </section>
  )
}

function Result({
  data,
  statusLabel,
  actionLabel,
  componentLabel,
  t,
}: {
  data: AiCurveRecommendation
  statusLabel: Record<AiCurveStatus, string>
  actionLabel: Record<AiCurveAction, string>
  componentLabel: Record<(typeof COMPONENT_KEYS)[number], string>
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <span className={`check-state ${STATUS_CLASS[data.status]}`}>
          {statusLabel[data.status]}
        </span>
        <span className="check-state idle">
          {t('aiCurveConfidence', { level: data.confidence })}
        </span>
        <span className="muted small" style={{ marginLeft: 'auto' }}>
          {actionLabel[data.action]} · {data.angleID} · v{data.comparisonVersion}
        </span>
      </div>

      <p style={{ marginBottom: '0.75rem' }}>{data.recommendationText}</p>

      <div
        className="card"
        style={{ marginBottom: '0.75rem', background: 'rgba(0,0,0,0.03)' }}
      >
        <p className="muted small" style={{ marginBottom: '0.25rem' }}>
          {t('aiCurveClinicalAdvice')} ·{' '}
          {t('aiCurveReviewPriority', { priority: data.clinicalAdviceDraft.reviewPriority })}
        </p>
        <p style={{ marginBottom: '0.5rem' }}>{data.clinicalAdviceDraft.draftAdvice}</p>
        {data.clinicalAdviceDraft.focusAreas?.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem',
              marginBottom: '0.5rem',
            }}
          >
            {data.clinicalAdviceDraft.focusAreas.map((f) => (
              <span
                key={f}
                className="check-state idle"
                style={{ fontSize: '0.75rem' }}
              >
                {f.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        )}
        <p className="muted small">{data.clinicalAdviceDraft.safetyNote}</p>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <p className="muted small" style={{ marginBottom: '0.25rem' }}>
          {t('aiCurveComponentStatus')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {COMPONENT_KEYS.map((k) => (
            <span
              key={k}
              className={`check-state ${STATUS_CLASS[data.componentStatus[k]]}`}
              style={{ fontSize: '0.75rem' }}
            >
              {componentLabel[k]}: {statusLabel[data.componentStatus[k]]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <p className="muted small" style={{ marginBottom: '0.25rem' }}>
          {t('aiCurveKeyMetrics')}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.5rem',
          }}
        >
          <Metric label={t('aiCurveMetricRmse')} value={`${data.metrics.rmse.toFixed(2)}°`} />
          <Metric
            label={t('aiCurveMetricAmplitudeDiff')}
            value={`${data.metrics.amplitudeDifference.toFixed(2)}°`}
          />
          <Metric
            label={t('aiCurveMetricPeakAngleDiff')}
            value={`${data.metrics.peakAngleDifference.toFixed(2)}°`}
          />
          <Metric
            label={t('aiCurveMetricRom')}
            value={`${data.metrics.rangeOfMotionPercentOfStandard.toFixed(1)}%`}
          />
          <Metric
            label={t('aiCurveMetricCorrelation')}
            value={data.metrics.correlation.toFixed(3)}
          />
          <Metric
            label={t('aiCurveMetricOutsideBand')}
            value={`${data.metrics.outsideStandardBandPercent.toFixed(1)}%`}
          />
        </div>
      </div>

      {data.observations.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p className="muted small" style={{ marginBottom: '0.25rem' }}>
            {t('aiCurveObservations')}
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {data.observations.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {data.qualityNotes && data.qualityNotes.length > 0 && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            border: '1px solid #f0c674',
            background: 'rgba(240,198,116,0.1)',
            borderRadius: '4px',
          }}
        >
          <p className="small" style={{ margin: 0, fontWeight: 600 }}>
            {t('aiCurveQualityNotes')}
          </p>
          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem' }}>
            {data.qualityNotes.map((q, i) => (
              <li key={i} className="small">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
        <p className="muted small" style={{ margin: 0, fontStyle: 'italic' }}>
          {data.doctorReviewNote}
        </p>
        <ul className="muted small" style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem' }}>
          {data.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '0.5rem 0.75rem',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '4px',
      }}
    >
      <p className="muted small" style={{ margin: 0 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontWeight: 600 }}>{value}</p>
    </div>
  )
}

const SAMPLE_RECOMMENDATION: AiCurveRecommendation = {
  action: 'walking',
  angleID: 'left_knee',
  comparisonVersion: 'v0.6-clinical-advice-accuracy',
  inputType: 'api',
  patientSource: 'http://113.44.220.94:3000/measurements/209',
  standardSource: 'outputs/walking/normal_knee_curve.csv',
  comparisonMode: 'segmented',
  status: 'significant_deviation',
  confidence: 'medium',
  componentStatus: {
    overall: 'significant_deviation',
    shape: 'mild_deviation',
    rangeOfMotion: 'mild_deviation',
    verticalOffset: 'mild_deviation',
    standardBand: 'significant_deviation',
  },
  metrics: {
    patientPeakAngle: 31.421772,
    standardPeakAngle: 61.363057,
    peakAngleDifference: -29.941285,
    patientPeakPercent: 43,
    standardPeakPercent: 54,
    peakTimingDifferencePercent: -11,
    patientMinAngle: 1.691236,
    standardMinAngle: 7.586953,
    minAngleDifference: -5.895717,
    patientAmplitude: 29.730537,
    standardAmplitude: 53.776104,
    amplitudeDifference: -24.045567,
    amplitudeRatio: 0.552858,
    rangeOfMotionPercentOfStandard: 55.285776,
    mae: 13.810963,
    rmse: 18.821302,
    shapeRmseAfterOffsetCorrection: 12.835918,
    maxAbsoluteDeviation: 40.051767,
    meanSignedDeviation: -13.765196,
    correlation: 0.766077,
    outsideStandardBandPercent: 83.168317,
  },
  qualityNotes: [
    'Many detected segments were rejected by engineering filters. Inspect the raw patient signal and segmentation settings.',
  ],
  observations: [
    'The comparison used 7 detected cycles from the patient curve.',
    'Lower peak knee angle may indicate reduced knee flexion during walking.',
    'Lower movement amplitude may suggest reduced walking range of motion.',
    'The walking curve differs from the standard curve shape.',
    'A notable portion of the curve is outside the healthy standard deviation band.',
    'The patient curve is generally below the standard curve.',
  ],
  recommendationText:
    'The walking curve shows significant deviation from the current healthy reference. The comparison used 7 detected cycles from the patient curve. Lower peak knee angle may indicate reduced knee flexion during walking. Lower movement amplitude may suggest reduced walking range of motion. The walking curve differs from the standard curve shape. A notable portion of the curve is outside the healthy standard deviation band. The patient curve is generally below the standard curve. This may indicate a movement difference, but it is not a final medical diagnosis and should be reviewed by a doctor.',
  clinicalAdviceDraft: {
    reviewPriority: 'clinical_review_recommended',
    focusAreas: [
      'range_of_motion',
      'movement_pattern',
      'angle_calibration_or_baseline_offset',
      'deviation_from_healthy_reference_band',
    ],
    draftAdvice:
      'The walking curve shows significant deviation from the healthy reference. A clinician or physiotherapist should review the movement before progression, especially if the patient reports pain, instability, swelling, or reduced function.',
    safetyNote:
      'This is a draft clinical-support message for qualified review. It is not a diagnosis, prescription, or standalone treatment plan.',
    rangeOfMotionPercentOfStandard: 55.285776,
  },
  doctorReviewNote: 'This is AI-assisted analysis and should be reviewed by a doctor.',
  limitations: [
    'This output is not a medical diagnosis.',
    'The analysis is based only on motion curve data.',
    'The result should be interpreted by a qualified clinician.',
  ],
}
