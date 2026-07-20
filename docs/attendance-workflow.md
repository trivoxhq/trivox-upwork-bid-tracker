# Attendance & Time-Tracking Workflow

## Overview

Users check in and check out daily. A normal shift targets **8 hours** of working time for a full-day **Check Out**. Leaving earlier is allowed as **Half-Day Check-Out**, with pay pro-rated from worked minutes. A **60-minute** break allowance applies. Checkout always requires a daily task summary. **IP/device logging is mandatory.** Screenshot/activity tracking can be **turned on/off with one click** (admin + special key).

## Configurable shift rules (admin + special key)

These values are **not** editable by admin login alone. Editing requires **admin account + `ATTENDANCE_ADMIN_KEY`**:

| Setting | Default | Purpose |
|---------|---------|---------|
| `shiftTotalMinutes` | 540 (9h) | Reference shift clock length |
| `breakAllowanceMinutes` | 60 | Paid break allowance; Start break disables when fully used |
| `minFullDayWorkingMinutes` | 480 (8h) | Working time required for full-day **Check Out** |
| `minHalfDayWorkingMinutes` | 300 (5h) | Legacy threshold (early leave is always Half-Day Check-Out until full-day hours) |
| `workingDaysPerMonth` | 22 | Used for monthly → daily salary pro-rate |

Configure the key in `.env.local`:

```bash
ATTENDANCE_ADMIN_KEY=your-secret-key-here
```

## Checkout button behavior

| Condition | Button / status label | Recorded as | Pay |
|-----------|----------------------|-------------|-----|
| Working time **below** full-day minimum | **Half-Day Check-Out** | `half_day` | Pro-rated from worked minutes |
| Working time **≥** full-day minimum | **Check Out** | `full_day` | Pro-rated from worked minutes (full day when ~8h) |

Checkout is always available after check-in — there is no locked leave state.

Working time = `(checkOut − checkIn) − breakMinutes` (all break time, including overrun).

### Break allowance

- Employees may take breaks totaling up to `breakAllowanceMinutes` (default 60).
- Once that allowance is fully used, **Start break** is disabled and the API rejects new breaks.
- If a break already in progress (or stored total) goes past the allowance, the **extra minutes are unpaid**: they stay in `breakMinutes` and are deducted from working time. Checkout is still allowed; a UI notice shows how many extra minutes were taken.

## IP / device logging

Every check-in, break start/end, and check-out stores IP, user-agent, and optional device fingerprint (`localStorage`). Append-only `AttendanceEventLog` rows keep an audit trail.

## Screenshot / activity tracking

- Toggle from **Settings → Attendance rules** (admin + special key).
- When ON, checked-in users send activity samples (~every 5 minutes) with a lightweight canvas snapshot + idle metadata.
- When OFF, no new samples are accepted.

## Salary (monthly → day / worked minutes)

Each user has a **monthly salary** (Team management → targets).

```
full day pay ≈ monthlySalary / workingDaysPerMonth
pay for a session = monthlySalary × workingMinutes / (workingDaysPerMonth × fullDayWorkingMinutes)
```

Example: monthly `100000`, `22` days/month, full day `480` min  
- Full day ≈ `4545`  
- Half day `300` min ≈ `2841`

`workingDaysPerMonth` defaults to **22** and is editable in Settings with `ATTENDANCE_ADMIN_KEY`.

## Administrator exemption

Admins **do not check in**. They can view team attendance history and manage settings/rules.

## UI routes

| Route | Purpose |
|-------|---------|
| `/dashboard/attendance` | Check in/out, breaks, history |
| `/dashboard/settings` | Attendance rules + activity toggle |

## API

| Method | Route |
|--------|-------|
| GET | `/api/attendance/today` |
| POST | `/api/attendance/check-in` |
| POST | `/api/attendance/break/start` |
| POST | `/api/attendance/break/end` |
| POST | `/api/attendance/check-out` |
| GET | `/api/attendance` |
| GET/PUT | `/api/attendance/settings` |
| POST | `/api/attendance/activity/toggle` |
| POST | `/api/attendance/activity` |
