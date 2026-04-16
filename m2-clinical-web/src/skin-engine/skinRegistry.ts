import type { ComponentType } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { DoctorClinicalPageClassic } from '../skins/classic/DoctorClinicalPageClassic'
import { DoctorHistoryPageClassic } from '../skins/classic/DoctorHistoryPageClassic'
import { DoctorTrendsPageClassic } from '../skins/classic/DoctorTrendsPageClassic'
import { DoctorAppShellDossier } from '../skins/dossier/DoctorAppShellDossier'
import { DoctorAppShellNeo } from '../skins/neo/DoctorAppShellNeo'
import { DoctorAppShellRadiology } from '../skins/radiology/DoctorAppShellRadiology'
import { DoctorClinicalPageNeo } from '../skins/neo/DoctorClinicalPageNeo'
import { DoctorHistoryPageNeo } from '../skins/neo/DoctorHistoryPageNeo'
import { DoctorTrendsPageNeo } from '../skins/neo/DoctorTrendsPageNeo'
import { DoctorAppShellPortal } from '../skins/portal/DoctorAppShellPortal'

export type SkinId = 'classic' | 'neo' | 'portal' | 'dossier' | 'radiology'

type SkinDefinition = {
  id: SkinId
  label: string
  pages: {
    DoctorClinicalPage: ComponentType
    DoctorTrendsPage: ComponentType
    DoctorHistoryPage: ComponentType
  }
  shells: {
    DoctorAppShell: ComponentType<{ onPatientChange: (id: string) => void }>
  }
}

export const skinRegistry: Record<SkinId, SkinDefinition> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    pages: {
      DoctorClinicalPage: DoctorClinicalPageClassic,
      DoctorTrendsPage: DoctorTrendsPageClassic,
      DoctorHistoryPage: DoctorHistoryPageClassic,
    },
    shells: {
      DoctorAppShell: AppLayout,
    },
  },
  neo: {
    id: 'neo',
    label: 'Neo',
    pages: {
      DoctorClinicalPage: DoctorClinicalPageNeo,
      DoctorTrendsPage: DoctorTrendsPageNeo,
      DoctorHistoryPage: DoctorHistoryPageNeo,
    },
    shells: {
      DoctorAppShell: DoctorAppShellNeo,
    },
  },
  portal: {
    id: 'portal',
    label: 'Portal (patient-style)',
    pages: {
      DoctorClinicalPage: DoctorClinicalPageClassic,
      DoctorTrendsPage: DoctorTrendsPageClassic,
      DoctorHistoryPage: DoctorHistoryPageClassic,
    },
    shells: {
      DoctorAppShell: DoctorAppShellPortal,
    },
  },
  dossier: {
    id: 'dossier',
    label: 'Dossier',
    pages: {
      DoctorClinicalPage: DoctorClinicalPageClassic,
      DoctorTrendsPage: DoctorTrendsPageClassic,
      DoctorHistoryPage: DoctorHistoryPageClassic,
    },
    shells: {
      DoctorAppShell: DoctorAppShellDossier,
    },
  },
  radiology: {
    id: 'radiology',
    label: 'Radiology Reading Room',
    pages: {
      DoctorClinicalPage: DoctorClinicalPageClassic,
      DoctorTrendsPage: DoctorTrendsPageClassic,
      DoctorHistoryPage: DoctorHistoryPageClassic,
    },
    shells: {
      DoctorAppShell: DoctorAppShellRadiology,
    },
  },
}

export const defaultSkin: SkinId = 'portal'
