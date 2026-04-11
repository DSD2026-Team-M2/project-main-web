import { useSkin } from './SkinContext'

export function DoctorAppShellSkin({
  onPatientChange,
}: {
  onPatientChange: (id: string) => void
}) {
  const { skinId, skins } = useSkin()
  const Shell = skins[skinId].shells.DoctorAppShell
  return <Shell onPatientChange={onPatientChange} />
}

export function DoctorClinicalSkinPage() {
  const { skinId, skins } = useSkin()
  const Page = skins[skinId].pages.DoctorClinicalPage
  return <Page />
}

export function DoctorTrendsSkinPage() {
  const { skinId, skins } = useSkin()
  const Page = skins[skinId].pages.DoctorTrendsPage
  return <Page />
}

export function DoctorHistorySkinPage() {
  const { skinId, skins } = useSkin()
  const Page = skins[skinId].pages.DoctorHistoryPage
  return <Page />
}
