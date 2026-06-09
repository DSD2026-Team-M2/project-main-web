# M2 Admin — Handoff Notes from M1

**From:** M1 Patient App  
**To:** M2 Admin Panel  
**Date:** 2026-06-09

---

## 1. Doctor–Patient Assignment

### Relationship
Each patient has **one assigned doctor**. One doctor can have **N patients**.

```
Doctor (1) ──── (N) Patient
```

The `doctor_id` field on the patient record is set by an admin through the Admin Panel.  
M1 reads this field to display the assigned doctor's name on the patient's plan cards.

### What M2 needs to implement
- A view listing all patients with their current assigned doctor (or unassigned)
- A control (dropdown / search) to assign or reassign a doctor to a patient
- This writes `doctor_id` to the patient record via the V2 API

M1 currently reads `doctorName` from the schedule response — if no doctor is assigned the field is blank and the plan card shows nothing. The assignment must exist before plans are created for the patient.

---

## 2. Exercise & Plan Structure in the Database

The V2 team (Lima) has been sent the full exercise seed data. Below is one example record so M2 understands the shape of the data:

```json
{
  "id": 1,
  "name": "Squat",
  "category": "Lower Body",
  "description": "Strengthens quadriceps, glutes and core. Essential for regaining functional leg strength after lower limb surgery.",
  "instructions": [
    "Stand with feet shoulder-width apart, toes pointing slightly outward.",
    "Extend your arms forward for balance and keep your chest up.",
    "Slowly bend your knees and sit back with your hips, as if sitting into a chair.",
    "Lower until your knees are parallel with your glutes, or as far as comfortable.",
    "Return to the starting position, pressing through your heels.",
    "Keep your knees aligned with your toes throughout — do not let them cave inward."
  ],
  "gif_url": "https://cdn.jefit.com/assets/img/exercises/gifs/493.gif",
  "thumbnail_url": "",
  "muscle_groups": ["Upper Legs", "Glutes", "Abs"],
  "equipment": "Body Weight",
  "difficulty": "Beginner"
}
```

### `thumbnail_url` — currently empty
The `thumbnail_url` field is intentionally empty for now. Lima (V2) will populate it by running UPDATE statements pointing to the M1 asset repository:

```
https://raw.githubusercontent.com/diogopinhel/limbmotionrecovery-assets/main/thumb_squat.png
```

The full mapping (all 10 exercises) has already been sent to the V2 team separately.  
**M2 does not need to manage thumbnails** — they are resolved automatically once V2 updates the DB.

---

## 3. Daily Pain Check-In

### How it works on M1
The patient registers their pain level **once per day**. After submitting, the form locks until midnight and shows a countdown. The next day it unlocks automatically.

### Data schema (one entry per day)
```json
{
  "user_id": 123,
  "level": 7,
  "notes": "Pain after walking exercise",
  "timestamp": "2026-06-09T14:30:00.000Z"
}
```

### Scale (1–10)
| Range | Label | Colour |
|---|---|---|
| 1 | No pain | Green `#1D9E75` |
| 2–3 | Minimal | Green `#1D9E75` |
| 4–5 | Mild | Amber `#BA7517` |
| 6–7 | Moderate | Amber `#BA7517` |
| 8–9 | Severe | Red `#E24B4A` |
| 10 | Worst possible | Red `#E24B4A` |

### Current state — important gap
Right now pain entries are stored **locally on the device only** (SharedPreferences). They are **not sent to V2**. For the doctor dashboard to show this data, two things are needed:

1. **V2 (Lima)** must create a `POST /pain` endpoint to receive entries
2. **M1** will then call that endpoint on submit instead of storing only locally

Until V2 creates the endpoint, M2 cannot display pain history. This should be coordinated between M2 and V2.

### What M2 should show in the doctor dashboard
- A pain trend chart per patient (daily level over time)
- Colour-coded by severity (green / amber / red)
- The optional `notes` field shown as a tooltip or expandable row
- Alert or highlight when level ≥ 7 on any given day

---

## 4. Summary of what M2 needs to action

| # | Task | Priority |
|---|---|---|
| 1 | Implement doctor–patient assignment UI in the admin panel | High |
| 2 | Ensure `doctor_id` is written to the patient record via V2 API | High |
| 3 | Coordinate with V2 to create `POST /pain` endpoint | High |
| 4 | Implement pain trend view in doctor dashboard (chart + colour coding) | Medium |
| 5 | No action needed on thumbnails — handled by V2 | — |
