# Attendance & Time-Tracking Workflow

## Overview

Users check in and check out daily. A normal shift is **9 hours total** with a **60-minute break** allowance and **8 hours** of required working time for a full day. Early exit is allowed as **Half day** after **5 hours** of working time. Salary is calculated from recorded working hours. Checkout always requires a daily task summary. **IP/device logging is mandatory.** Screenshot/activity tracking can be **turned on/off with one click** (admin + special key).

## Configurable shift rules (admin + special key)

These values are **not** editable by admin login alone. Editing requires **admin account + `ATTENDANCE_ADMIN_KEY`**:

| Setting | Default | Purpose |
|---------|---------|---------|
| `shiftTotalMinutes` | 540 (9h) | Full-day shift clock; at this point the button becomes **Check out** |
| `breakAllowanceMinutes` | 60 | Paid break allowance; Start break disables when fully used |
| `minFullDayWorkingMinutes` | 480 (8h) | Required working time for full-day checkout |
| `minHalfDayWorkingMinutes` | 300 (5h) | Required working time for half-day leave |

Configure the key in `.env.local`:

```bash
ATTENDANCE_ADMIN_KEY=your-secret-key-here
```

## Checkout button behavior

| Condition | Button label | Recorded as | Min working hours |
|-----------|--------------|-------------|-------------------|
| Working ≥ 5h and **before** the 9th hour | **Half day** | `half_day` | 5 hours |
| At / after the **9th hour** from check-in | **Check out** | `full_day` | 8 hours working |

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
