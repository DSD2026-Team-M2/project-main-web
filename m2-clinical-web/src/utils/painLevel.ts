/** M1 pain scale colours — see M2_Dashboard_Requirements.md */

export type PainLevelLabelKey =
  | 'painLabelNone'
  | 'painLabelMinimal'
  | 'painLabelMild'
  | 'painLabelModerate'
  | 'painLabelSevere'
  | 'painLabelWorst'

export type PainLevelMeta = {
  level: number
  labelKey: PainLevelLabelKey
  color: string
  alert: boolean
}

export function painLevelMeta(level: number): PainLevelMeta {
  const lv = Math.round(Math.max(1, Math.min(10, level)))
  if (lv === 1) {
    return { level: lv, labelKey: 'painLabelNone', color: '#1D9E75', alert: false }
  }
  if (lv <= 3) {
    return { level: lv, labelKey: 'painLabelMinimal', color: '#1D9E75', alert: false }
  }
  if (lv <= 5) {
    return { level: lv, labelKey: 'painLabelMild', color: '#BA7517', alert: false }
  }
  if (lv <= 7) {
    return { level: lv, labelKey: 'painLabelModerate', color: '#BA7517', alert: lv >= 7 }
  }
  if (lv <= 9) {
    return { level: lv, labelKey: 'painLabelSevere', color: '#E24B4A', alert: true }
  }
  return { level: lv, labelKey: 'painLabelWorst', color: '#E24B4A', alert: true }
}
