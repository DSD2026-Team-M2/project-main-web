# M2 Doctor Dashboard — Requirements from M1

**From:** M1 Team (Patient Mobile App — Diogo Pinhel)  
**To:** M2 Team (Doctor Dashboard)  
**Date:** 2026-06-08  
**Status:** Requirements for M2 implementation  
**Context:** V2 backend is shared infrastructure. All endpoints listed here already exist or are
requested in separate V2 spec files. This document focuses on **what M2 must build** and **which
endpoints to call**.

---

## Overview

There are two main areas M2 needs to implement for the patient-facing workflow to function end-to-end:

| Area | Priority | Description |
|---|---|---|
| **A. Pain Level Panel** | High | View a patient's daily pain history (1–10 scale) |
| **B. Exercise Prescription** | Critical | Create rehab plans and assign exercises from the library |

Both areas are directly visible to the patient in the M1 app. If M2 does not implement them,
patients cannot see their exercises and doctors cannot monitor pain trends.

---

## A — Pain Level Panel

### What the patient does (M1 side)

Every day, the patient opens the Home screen and taps **"Register Pain Level"**. They choose a
number from 1 to 10 and optionally add a note. The entry is saved locally and — once V2 implements
the endpoint — synced to the server.

The V2 schema change needed for this is described in `V2_PainLog_Request.md` (in this same folder).
Once V2 creates the `pain_logs` table and endpoints, M2 can read the data.

### What M2 must display

On the **patient detail page**, add a **Pain History** section:

```
┌─────────────────────────────────────────────────────────┐
│  PAIN HISTORY                                            │
│                                                          │
│  [5]  Mild       08 Jun 2026 · 09:15                    │
│       "Pain after morning session"                       │
│                                                          │
│  [3]  Minimal    07 Jun 2026 · 08:40                    │
│                                                          │
│  [8]  Severe     06 Jun 2026 · 10:02                    │
│       "Strong pain after stair climbing exercise"       │
│                                                          │
│  [Load more...]                                          │
└─────────────────────────────────────────────────────────┘
```

**Color coding (match M1 exactly):**

| Level | Color | Label |
|---|---|---|
| 1 | Green `#1D9E75` | No pain |
| 2–3 | Green `#1D9E75` | Minimal |
| 4–5 | Amber `#BA7517` | Mild |
| 6–7 | Amber `#BA7517` | Moderate |
| 8–9 | Red `#E24B4A` | Severe |
| 10 | Red `#E24B4A` | Worst possible |

### Endpoint to call

```
GET /pain/{userId}
Authorization: Bearer <clinician token>
```

**Response:**
```json
[
  {
    "id": 42,
    "user_id": 5,
    "level": 5,
    "notes": "Pain after morning session",
    "created_at": "2026-06-08T09:15:00Z"
  }
]
```

> ⚠️ **This endpoint does not exist yet.** It is being requested separately in
> `V2_PainLog_Request.md`. Once V2 implements it, M2 should use it here.

### Optional: Pain trend chart

If M2 has a charting component, showing a simple line chart of `level` over time (last 7 or 30
days) would significantly help the doctor spot patterns. This is optional but strongly recommended.

---

## B — Exercise Prescription

### Full workflow

```
Doctor opens patient profile
  └── Doctor goes to "Rehab Plans" tab for this patient
        ├── [View existing plans] — see exercises already assigned
        └── [Create New Plan] → fill plan details
              └── [Add Exercise] button (repeatable)
                    └── Exercise Picker modal
                          └── Select exercise from library → fill prescription form
                                └── [Save] → POST /schedule/{scheduleId}/exercises
```

---

### B.1 — Create a New Plan

When the doctor wants to create a new rehab plan for a patient, M2 calls:

```
POST /schedule
Authorization: Bearer <clinician token>
Content-Type: application/json
```

**Request body:**
```json
{
  "user_id": 5,
  "exercise": "Post-Op Knee Recovery — Phase 1",
  "date": "2026-06-09",
  "duration": 30,
  "notes": "Focus on low-impact exercises. Avoid full knee bend.",
  "status": "pending"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | integer | Yes | The patient's user ID |
| `exercise` | string | Yes | Plan name / description (free text) |
| `date` | string | Yes | ISO 8601 date — when the plan starts |
| `duration` | integer | No | Estimated minutes per session (default 30) |
| `notes` | string | No | Doctor's overall notes for this plan |
| `status` | string | No | `pending` by default |

**Response:** the created schedule object including its `id`. This `id` is the `scheduleId` used in
all subsequent exercise endpoints.

> If V2 does not yet have `POST /schedule`, coordinate with the V2 team to add it.

---

### B.2 — Add Exercises to a Plan

After creating a plan, the doctor adds individual exercises. M2 must show an **Exercise Picker**
that loads the 10 exercises from the V2 catalog.

#### Step 1 — Load the exercise library

```
GET /exercises
```

This endpoint is **public** (no auth required). Call it once when the picker opens — no need to
cache it between sessions.

**Response:**
```json
[
  { "id": 1, "name": "Squat", "category": "Lower Body",
    "description": "3 reps, ~5 s each. Feet shoulder-width apart, knees aligned with toes.",
    "gif_url": null },
  { "id": 2, "name": "Walking Test", "category": "Gait",
    "description": "Walk forward 5 m. Natural pace, eyes forward.",
    "gif_url": null },
  ...
]
```

**The 10 seeded exercises:**

| ID | Name | Category |
|---|---|---|
| 1 | Squat | Lower Body |
| 2 | Walking Test | Gait |
| 3 | Stair Climbing | Lower Body |
| 4 | Straight Leg Raise | Lower Body |
| 5 | Knee Extension | Lower Body |
| 6 | Ankle Pumps | Lower Body |
| 7 | Hip Abduction | Lower Body |
| 8 | Calf Raises | Lower Body |
| 9 | Hamstring Stretch | Flexibility |
| 10 | Single-Leg Balance | Balance |

#### Step 2 — Exercise Picker UI

Display the exercises in a list or modal. Each row shows:
- Exercise name (bold)
- Category (small label)
- Description (one line, truncated)
- A **Select** button

The doctor taps **Select** on the exercise they want to assign.

```
┌─────────────────────────────────────────────────────────┐
│  Add Exercise                                    [✕]    │
│                                                          │
│  🔍 Search exercises...                                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Squat                         Lower Body        │  │
│  │  Feet shoulder-width, knees aligned with toes.   │  │
│  │                               [Select]           │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Ankle Pumps                   Lower Body        │  │
│  │  Flex/point ankle repeatedly.                    │  │
│  │                               [Select]           │  │
│  └──────────────────────────────────────────────────┘  │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

#### Step 3 — Prescription Form

After the doctor selects an exercise, show a form pre-filled with the exercise details. The doctor
fills in the prescription specifics:

```
┌─────────────────────────────────────────────────────────┐
│  Prescribe: Squat                                        │
│                                                          │
│  Phase:        [ Warm Up ▾ ]                            │
│                  Warm Up / Strength / Mobility / Cooldown│
│                                                          │
│  Sets:         [  3  ]                                   │
│  Reps:         [ 10  ]                                   │
│  Hold (sec):   [  2  ]   (0 if not applicable)          │
│                                                          │
│  Doctor's note:                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Stop immediately if you feel sharp knee pain.    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  GIF URL (optional):                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ https://...                                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [ Cancel ]                       [ Assign to Patient ] │
└─────────────────────────────────────────────────────────┘
```

**Form fields:**

| Field | Input type | Required | Notes |
|---|---|---|---|
| Phase | Dropdown | Yes | `Warm Up`, `Strength`, `Mobility`, `Cooldown` |
| Sets | Number input | Yes | Integer ≥ 1 |
| Reps | Number input | Yes | Integer ≥ 1 |
| Hold (seconds) | Number input | No | Integer ≥ 0, default 0 |
| Notes | Text area | No | Doctor's clinical note for the patient |
| GIF URL | Text input | No | Animated GIF of exercise demo (optional for now, all null at seeding time) |

#### Step 4 — Save the Exercise

```
POST /schedule/{scheduleId}/exercises
Authorization: Bearer <clinician token>
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Squat",
  "phase": "Strength",
  "sets": 3,
  "reps": 10,
  "hold_seconds": 2,
  "notes": "Stop immediately if you feel sharp knee pain.",
  "gif_url": null,
  "description": "3 reps, ~5 s each. Feet shoulder-width apart, knees aligned with toes."
}
```

> The `description` field comes from the exercise catalog entry. Send it verbatim so M1 can show
> it to the patient in the exercise detail screen (the "How to do it" section).

**Response `201`:** the created exercise object. M2 should append it to the displayed list without
reloading the full plan.

The doctor can add multiple exercises by repeating steps 2–4. The order in which they are added
becomes the display order on the M1 patient app.

---

### B.3 — View a Patient's Existing Plan

```
GET /schedule/{scheduleId}/exercises
Authorization: Bearer <clinician token>
```

**Response:**
```json
{
  "scheduleId": 1,
  "exercise": "Post-Op Knee Recovery — Phase 1",
  "date": "2026-06-09T00:00:00Z",
  "duration": 30,
  "notes": "Focus on low-impact exercises.",
  "status": "pending",
  "doctorName": "Dr. Ana Rodrigues",
  "exercises": [
    {
      "id": 101,
      "name": "Squat",
      "phase": "Strength",
      "sets": 3,
      "reps": 10,
      "holdSeconds": 2,
      "notes": "Stop immediately if you feel sharp knee pain.",
      "gif_url": null,
      "description": "3 reps, ~5 s each. Feet shoulder-width apart.",
      "completed": false,
      "lastPainLevel": null
    }
  ]
}
```

M2 should display each exercise row with:
- Name + phase tag
- Sets × reps (hold if > 0)
- Doctor note (if present)
- Status: `✓ Completed` or `Pending`
- Patient's last reported pain level (if `lastPainLevel` is not null)

---

## C — Patient Plan List

The M2 patient detail page should also list all plans for that patient:

```
GET /schedule/{userId}
Authorization: Bearer <clinician token>
```

Each plan item in the response has:
- `id` — use this as `scheduleId` to fetch exercises
- `exercise` — the plan name/description
- `date` — plan date
- `status` — `pending` / `completed` / `skipped`
- `doctor_name` — the bound doctor's name

M2 should show a **plan card** for each entry with a button to open the exercise list
(`GET /schedule/{scheduleId}/exercises`).

---

## D — GIF URLs (Future)

Currently all exercises in the catalog have `gif_url: null`. The M1 app shows a placeholder when
this is null. When the M2 team or the clinical team finds appropriate exercise demonstration GIFs,
M2 should provide a way to update the `gif_url` on each exercise in the catalog. This could be:

1. A simple admin form in M2 that calls `PATCH /exercises/{exerciseId}` (V2 would need to add this)
2. Direct database seeding by the V2 team

When `gif_url` is set, M1 will automatically start showing the GIF animation in the exercise detail
sheet — no M1 code change is needed.

---

## Summary of Endpoints M2 Calls

| Step | Method | Endpoint | Purpose |
|---|---|---|---|
| Load exercise library | `GET` | `/exercises` | Populate exercise picker (no auth) |
| List patient's plans | `GET` | `/schedule/{userId}` | Show plans on patient profile |
| Create a new plan | `POST` | `/schedule` | Create a new rehab plan for a patient |
| View exercises in plan | `GET` | `/schedule/{scheduleId}/exercises` | See assigned exercises + completion |
| Assign exercise to plan | `POST` | `/schedule/{scheduleId}/exercises` | Add an exercise prescription |
| View pain history | `GET` | `/pain/{userId}` | Show patient's daily pain log ⚠️ pending V2 |

---

## Key Notes

1. **`scheduleId` vs `userId`** — `GET /schedule/{userId}` uses the patient's user ID. All other
   schedule endpoints use the schedule's own `id` returned in the list. Do not confuse these.

2. **Phase values must be exact** — M1 renders section headers from the `phase` field. Use exactly:
   `"Warm Up"`, `"Strength"`, `"Mobility"`, `"Cooldown"`. Other values will still display but break
   the expected grouping.

3. **`description` is from the catalog, `notes` is from the doctor** — always send both separately.
   `description` is what the exercise is; `notes` is the doctor's clinical instruction for this
   specific patient.

4. **Pain log endpoint is pending** — the `GET /pain/{userId}` endpoint does not exist yet. Check
   with V2 before implementing section A.
