import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultSkin, skinRegistry, type SkinId } from './skinRegistry'

type SkinContextValue = {
  skinId: SkinId
  setSkinId: (skinId: SkinId) => void
  skins: typeof skinRegistry
}

const SKIN_KEY = 'm2.skin-id'
const SkinContext = createContext<SkinContextValue | null>(null)

function isSkinId(value: string | null): value is SkinId {
  return value === 'classic' || value === 'neo' || value === 'portal'
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skinId, setSkinId] = useState<SkinId>(() => {
    if (typeof window === 'undefined') return defaultSkin
    const saved = window.localStorage.getItem(SKIN_KEY)
    return isSkinId(saved) ? saved : defaultSkin
  })

  useEffect(() => {
    window.localStorage.setItem(SKIN_KEY, skinId)
    document.documentElement.dataset.skin = skinId
  }, [skinId])

  const value = useMemo(
    () => ({
      skinId,
      setSkinId,
      skins: skinRegistry,
    }),
    [skinId],
  )

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSkin() {
  const ctx = useContext(SkinContext)
  if (!ctx) throw new Error('useSkin must be used inside SkinProvider')
  return ctx
}
