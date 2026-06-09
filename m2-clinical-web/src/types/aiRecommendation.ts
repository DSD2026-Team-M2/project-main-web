/**
 * Types do output do `generate_recommendation_from_curves.py` (Team V1 / Borges).
 * Espelha o JSON gerado pelo script — campos opcionais marcados com `?`.
 */

export type AiCurveAction = 'walking' | 'squat' | 'upstairs'

export type StandardCurvePoint = {
  percent: number
  angle: number
  bandLow?: number
  bandHigh?: number
}

export type StandardCurveResponse = {
  action: AiCurveAction
  angleID: string
  source: string
  points: StandardCurvePoint[]
}

export type StandardCurveOverlayPoint = {
  timeMs: number | null
  angle: number | null
  bandLow?: number | null
  bandHigh?: number | null
}

export type StandardCurveOverlayMode =
  | 'segmented'
  | 'full_session'
  | 'full_session_fallback'

export type StandardCurveOverlayResponse = {
  action: AiCurveAction
  angleID: string
  overlayMode: StandardCurveOverlayMode
  segmentsUsed: number
  standardSource: string
  sessionStartMs: number
  segmentation?: AiCurveSegmentation
  points: StandardCurveOverlayPoint[]
}

export type AiCurveStatus = 'normal' | 'mild_deviation' | 'significant_deviation'
export type AiCurveConfidence = 'high' | 'medium' | 'low'

export type AiCurveComponentStatus = {
  overall: AiCurveStatus
  shape: AiCurveStatus
  rangeOfMotion: AiCurveStatus
  verticalOffset: AiCurveStatus
  standardBand: AiCurveStatus
}

export type AiCurveMetrics = {
  patientPeakAngle: number
  standardPeakAngle: number
  peakAngleDifference: number
  patientPeakPercent: number
  standardPeakPercent: number
  peakTimingDifferencePercent: number
  patientMinAngle: number
  standardMinAngle: number
  minAngleDifference: number
  patientAmplitude: number
  standardAmplitude: number
  amplitudeDifference: number
  amplitudeRatio: number
  rangeOfMotionPercentOfStandard: number
  mae: number
  rmse: number
  shapeRmseAfterOffsetCorrection: number
  maxAbsoluteDeviation: number
  meanSignedDeviation: number
  correlation: number
  outsideStandardBandPercent: number
}

export type AiCurveClinicalAdvice = {
  reviewPriority: string
  focusAreas: string[]
  draftAdvice: string
  safetyNote: string
  rangeOfMotionPercentOfStandard?: number
}

export type AiCurveSegmentMetric = {
  index: number
  status: AiCurveStatus
  metrics: {
    rmse: number
    mae: number
    peakAngleDifference: number
    amplitudeDifference: number
    outsideStandardBandPercent: number
  }
}

export type AiCurveSegmentation = {
  requestedMode: string
  attempted: boolean
  used: boolean
  method: string
  label: string
  segmentsDetected: number
  segmentsUsed: number
  segmentsRejected: number
  rejectedReasonCounts?: Record<string, number>
  averageSegmentDurationSeconds?: number
  segmentDurationSeconds?: number[]
  fallbackReason?: string | null
  extremaCount?: number
  segments?: unknown[]
  aggregationMethod?: string
  segmentMetricSummary?: Record<string, number>
  segmentMetrics?: AiCurveSegmentMetric[]
}

export type AiCurveRecommendation = {
  action: AiCurveAction
  angleID: string
  comparisonVersion: string
  inputType: string
  patientSource: string
  standardSource: string
  comparisonMode: string
  segmentation?: AiCurveSegmentation
  status: AiCurveStatus
  confidence: AiCurveConfidence
  componentStatus: AiCurveComponentStatus
  engineeringThresholds?: Record<string, unknown>
  metrics: AiCurveMetrics
  qualityNotes?: string[]
  observations: string[]
  recommendationText: string
  clinicalAdviceDraft: AiCurveClinicalAdvice
  doctorReviewNote: string
  limitations: string[]
}
