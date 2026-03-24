# M2 Clinical Web Workstation

A rehabilitation data workstation for clinicians (doctors and physical therapists), not for patient self-use. Tech stack: **React 19**, **TypeScript**, **Vite**, **ECharts**, and **Three.js** (**@react-three/fiber** + **drei**).

## Quick Start

```bash
cd m2-clinical-web
npm install
npm run dev
```

Open the local URL shown in the terminal (default: `http://localhost:5173`). The app uses **Hash routing** (for example: `#/p/p-001/trends`), which is convenient for static hosting.

- `npm run build`: production build  
- `npm run preview`: preview production build output  

## Feature Overview

| Module | Description |
|------|------|
| **Long-term Recovery Trends** | Multi-metric time series, Week/Month/All filtering, event markers (surgery/assessment), measured vs AI-inferred series, anomaly markers with tooltip notes |
| **History & Comparison** | Chronological training/assessment records, multi-selection comparison table, clear delta and direction (improved/declined/flat) |
| **3D Limb Reconstruction** | Rotate/zoom/pan controls, segment heat overlay and angle annotations, canvas remount on patient switch/refresh to help release GPU resources |
| **REST Integration** | Currently backed by **Mock** data (`USE_MOCK` in `src/services/clinicalApi.ts`); data contracts are defined in `src/types/clinical.ts` |

## Project Structure

```
src/
  components/     # layout, charts, 3D, shared UI
  context/        # global state (e.g., current patient)
  pages/          # feature pages
  services/       # API layer and mock providers
  types/          # domain types
```

## Connect to a Real Backend

1. Set `USE_MOCK` to `false` in `src/services/clinicalApi.ts` (or switch it to an environment flag).  
2. Implement real `fetch` calls with the same method signatures; recommended base URL source: `import.meta.env.VITE_API_BASE`.  
3. Suggested response fields include `source: "measured" | "ai_inferred"`; trend points can optionally include `isAnomaly` and `anomalyNote`.

## Clinical Notes and View Sharing

- **Notes**: stored per patient in browser `localStorage` (not an official medical record).  
- **Share**: top bar action copies the full current URL (including hash route), so teammates can open the same view directly.

## Performance Notes

- Charts use **LTTB sampling** (`sampling: 'lttb'`) and **dataZoom** for long sequences.  
- The 3D page remounts canvas via **`key`** and clears cache on unmount (`THREE.Cache.clear()`); this helps reduce long-lived memory usage. A future optimization is a single persistent canvas with incremental geometry/material updates.

## License

This is a demo project. Add your license and compliance notes as needed (including patient data governance and medical-device-related regulations).
