import type { AiCurveAction } from '../types/aiRecommendation'
import type { SessionActionType } from '../types/api'

export function normalizeSessionActionType(raw: unknown): SessionActionType {
  if (raw == null || raw === '') return 'unknown'
  const v = String(raw).trim().toLowerCase().replace(/-/g, '_')
  if (v === 'walk' || v === 'walking') return 'walk'
  if (v === 'squat') return 'squat'
  if (v === 'climb_stairs' || v === 'upstairs' || v === 'climb') return 'climb_stairs'
  if (v === 'unknown') return 'unknown'
  return 'unknown'
}

export function sessionActionTypeToAiCurve(action: SessionActionType | string | null | undefined): AiCurveAction | null {
  const normalized = normalizeSessionActionType(action)
  if (normalized === 'walk') return 'walking'
  if (normalized === 'squat') return 'squat'
  if (normalized === 'climb_stairs') return 'upstairs'
  return null
}

export type SessionActionLabelKey =
  | 'sessionActionWalk'
  | 'sessionActionSquat'
  | 'sessionActionClimbStairs'
  | 'sessionActionUnknown'

export function sessionActionTypeLabelKey(
  action: SessionActionType | string | null | undefined,
): SessionActionLabelKey {
  const normalized = normalizeSessionActionType(action)
  if (normalized === 'walk') return 'sessionActionWalk'
  if (normalized === 'squat') return 'sessionActionSquat'
  if (normalized === 'climb_stairs') return 'sessionActionClimbStairs'
  return 'sessionActionUnknown'
}
