# Ya Hala Group E-Portal — HR Leave Management Flow

## Overview

This document describes how the leave management system works end-to-end, from employee hire date entry to leave request submission, approval, balance tracking, and HR overrides.

---

## 1. Employee Onboarding & Hire Date

### Where HR Sets the Hire Date

- **Super Admin Dashboard > Employees > Add New Employee**: When Super Admin creates a new employee, there is a **"Hire Date"** field in the form.
- **Super Admin Dashboard > Employees > Edit Employee**: Super Admin can update the hire date at any time by editing an existing employee record.
- **HR/Manager Dashboard > Team Members > Employee Detail > Hire Date**: HR/Manager can view and edit the hire date directly in the employee info card (requires the **"Can Edit Employee Info"** permission to be enabled by the Super Admin in Settings > HR Permissions).
- **Employee Details View > Employment Tab**: The hire date is displayed in the employee's detail view under the Employment tab.

> **Important**: If the HR/Manager cannot see the edit button for the hire date, the Super Admin needs to enable the **"Can Edit Employee Info"** toggle in **Admin Dashboard > Settings > HR Permissions**.

### Why Hire Date Matters

The hire date is the anchor for:

1. **Annual leave eligibility** (must complete 1 year of service)
2. **Financial year calculation** (anniversary-based, e.g., hire date March 17, 2024 = financial year March 17, 2025 to March 16, 2026)
3. **Service duration display** (shown in the Leave Balance Manager)

---

## 2. Leave Types & Entitlements

| Leave Type          | Annual Allowance | Eligibility                             | Saudi Labor Law |
| ------------------- | ---------------- | --------------------------------------- | --------------- |
| **Annual Leave**    | 30 days          | After completing 1 full year of service | Article 109     |
| **Sick Leave**      | 14 days          | Immediate (from day 1)                  | Article 117     |
| **Emergency Leave** | 5 days           | Immediate (from day 1)                  | Article 113     |
| **Unpaid Leave**    | 30 days          | Immediate (from day 1)                  | —               |
| **Hourly Leave**    | 6 hours/month    | Immediate (from day 1)                  | —               |

### Annual Leave Eligibility Gate

- The system automatically calculates whether an employee has completed 1 year from their hire date.
- If **not eligible**: The Annual Leave card is locked (greyed out with a lock icon), showing the eligibility date and days remaining.
- If the hire date is **not set** by HR: The system defaults to allowing the request (to avoid blocking employees due to missing data).
- This is enforced **both on the frontend** (disabled card) **and on the server** (403 rejection with bilingual error message).

---

## 3. Employee Leave Request Flow

```
Employee opens Leave Request page
        |
        v
System loads current balances (auto-calculated from approved + pending requests)
        |
        v
Employee sees 5 leave type cards with real-time availability:
  - Hourly (available hours this month)
  - Annual (available days this year) [LOCKED if < 1 year service]
  - Sick (available days this year)
  - Emergency (available days this year)
  - Unpaid (available days this year)
        |
        v
Employee selects a leave type
        |
        v
Policy banner appears explaining the rules for that type
        |
        v
Employee fills in dates (or times for hourly) + reason
        |
        v
System validates:
  - Sufficient balance?
  - Dates valid?
  - Required fields filled? (reason mandatory for sick & emergency)
  - Medical report attached? (required for sick leave)
  - Annual leave: 30-day advance notice warning (soft, non-blocking)
        |
        v
Employee submits request
        |
        v
Server-side validation:
  - Annual leave eligibility re-checked (hire date vs. today)
  - Request saved with status = "pending"
        |
        v
Notifications sent automatically:
  1. Confirmation email to the employee (EN + AR)
  2. Approval notification to the employee's manager (EN + AR)
  3. Notification to all Super Admins (EN + AR)
```

---

## 4. Manager / HR Approval Flow

```
Manager/HR sees pending request in dashboard
        |
        v
Opens Request Detail View (3-tab modal: Details / Activity / Discussion)
        |
        v
Reviews request details, dates, reason, medical report
        |
        v
Approves or Rejects the request
        |
        v
If APPROVED:
  - Status updated to "approved"
  - Balance automatically deducted
  - Employee receives approval email (EN + AR)
  - If Annual Leave: Accountants receive email to process paid leave in advance
  - Activity log entry recorded (who approved, when)
        |
If REJECTED:
  - Status updated to "rejected"
  - Employee receives rejection email (EN + AR)
  - Activity log entry recorded (who rejected, when, reason)
```

---

## 5. Annual Leave → Accountant Notification

When an annual leave request is **approved**:

1. System finds all employees with the **Accountant** role.
2. Sends each accountant a bilingual email containing:
   - Employee name
   - Leave start and end dates
   - Number of days
   - Request ID
3. This notifies accountants to **process the paid leave salary in advance** before the employee goes on leave.

---

## 6. Leave Balance Management (HR)

### Accessing the Balance Manager

- **Admin Dashboard > Sidebar > "Leave Balances"** (new section with CalendarCheck icon)

### What HR Sees

For each employee:

- **Employee list** (left panel) with name, ID, hire date, and service duration
- **Balance cards** (right panel) showing for each leave type:
  - **Allowance**: Default entitlement (30 / 14 / 5 / 30 days)
  - **Used (Approved)**: Auto-calculated from approved requests this year
  - **Pending**: Auto-calculated from pending requests this year
  - **HR Adjustment**: Manual correction amount (+/- days)
  - **Available**: Allowance + Adjustment - Used - Pending
  - Visual progress bar showing usage percentage
  - Annual leave eligibility status (if employee hasn't completed 1 year)

### How Auto-Calculation Works

```
Available Balance = Allowance + HR Adjustment - Approved Days - Pending Days
```

- **Allowance** = Fixed per leave type (30 / 14 / 5 / 30)
- **Approved Days** = Sum of days from all approved leave requests of that type this financial year
- **Pending Days** = Sum of days from all pending leave requests of that type this financial year
- **HR Adjustment** = Manual override set by HR (see below)

### HR Override / Adjustment

HR can click the **Edit (pencil) icon** on any leave type card to make corrections:

- **Adjustment Days**: Positive number = add days, Negative number = subtract days
  - Example: `-5` means "this employee used 5 days that were recorded on paper but not in the system"
  - Example: `+3` means "this employee is entitled to 3 extra days (e.g., carryover from last year)"
- **Reason (English)**: Required — explains why the adjustment is being made
- **Reason (Arabic)**: Optional

All adjustments are:

- **Logged with full history** (who made the change, when, previous value, new value, reason)
- **Viewable via the History (clock) icon** on each card
- **Non-destructive**: They don't modify request records, they only adjust the final available balance

### Cancellation & Balance Restoration

When an approved leave request is cancelled:

- The system automatically restores the used days back to the employee's balance
- The restoration is logged in the request's activity log
- A "days restored" badge appears on the cancelled request

---

## 7. Financial Year Calculation

The system uses **anniversary-based financial years** tied to each employee's hire date:

```
Example:
  Hire date: March 17, 2024
  Today: March 4, 2026

  Financial year: 2025-2026
  (From March 17, 2025 to March 16, 2026)
```

This means leave balances reset on the employee's work anniversary, not on January 1st.

---

## 8. Request Cancellation Flow

Employees or HR can cancel a pending or approved request:

```
Cancel request initiated
        |
        v
Reason required (bilingual)
        |
        v
If the request was APPROVED:
  - Balance restored automatically
  - "X days restored" note added to activity log
  - Cancelled banner appears on the request
        |
If the request was PENDING:
  - Simply marked as cancelled
  - No balance adjustment needed
```

---

## 9. Summary of Where Things Are

| Feature                  | Location                                                        |
| ------------------------ | --------------------------------------------------------------- |
| Set/Edit hire date       | Admin > Employees > Add/Edit Employee                           |
| Edit hire date (HR)      | Manager Dashboard > Team Members > Employee Detail (with permission) |
| View hire date           | Admin > Employees > View > Employment tab                       |
| Employee submits leave   | Employee Dashboard > Leave Request                              |
| Manager reviews requests | Manager Dashboard > Team Requests                               |
| HR reviews all requests  | Admin Dashboard > Requests                                      |
| HR manages balances      | Admin Dashboard > Leave Balances                                |
| Accountant notifications | Automatic (on annual leave approval)                            |
| Leave Calendar           | Admin/Manager Dashboard > Calendar                              |
| Request History & Print  | Admin > Employees > History icon                                |
| Company leave policies   | Admin > Settings > Company Settings                             |
| HR Permissions           | Admin > Settings > HR Permissions                               |

---

## 10. Data Flow Diagram

```
[Employee]
    |
    | 1. Submits leave request
    v
[Server] ──> Validates eligibility (hire date check)
    |         Saves request (status: pending)
    |         Sends emails (employee + manager + admins)
    v
[Manager/HR]
    |
    | 2. Approves or Rejects
    v
[Server] ──> Updates status
    |         Sends result email to employee
    |         If annual + approved: notifies accountants
    |         Logs activity
    v
[Leave Balance Manager]
    |
    | 3. HR can view & adjust balances
    |    Auto-calculated from request data
    |    Manual corrections with full audit trail
    v
[Accountant]
    |
    | 4. Receives email for approved annual leave
    |    Processes paid leave salary in advance
    v
[Payroll]
```

---

_Document generated: March 4, 2026_
_System: Ya Hala Group E-Portal v2_