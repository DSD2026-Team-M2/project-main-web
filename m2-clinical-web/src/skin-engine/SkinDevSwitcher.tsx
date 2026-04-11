import { useSkin } from './SkinContext'
import type { SkinId } from './skinRegistry'

export function SkinDevSwitcher() {
  const { skinId, setSkinId, skins } = useSkin()
  if (!import.meta.env.DEV) return null

  return (
    <div className="skin-dev-switcher">
      <label htmlFor="skin-id-select">Skin</label>
      <select
        id="skin-id-select"
        value={skinId}
        onChange={(e) => setSkinId(e.target.value as SkinId)}
      >
        {Object.values(skins).map((skin) => (
          <option key={skin.id} value={skin.id}>
            {skin.label}
          </option>
        ))}
      </select>
    </div>
  )
}
