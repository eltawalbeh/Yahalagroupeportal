# Ya Hala E-Portal - Troubleshooting & Testing Guide

## 🔧 Issues Fixed in This Update

### 1. ✅ Request History Not Showing Data
**Problem**: RequestHistory page was empty even when requests existed.

**Root Cause**: Employee ID comparison in backend was using strict equality (===) which failed when comparing string IDs to number IDs.

**Solution**: Updated the backend route to handle both string and number comparisons:
```typescript
.filter((req: any) => {
  return req.employee_id == employeeId || req.employee_id === parseInt(employeeId);
})
```

**File**: `/supabase/functions/server/index.tsx` (line ~166)

---

### 2. ✅ Leave Balance Not Updating After Approval/Rejection
**Problem**: When admin approves/rejects a leave request, the employee's leave balance doesn't update immediately.

**Solutions Implemented**:

1. **Auto-refresh every 60 seconds** in LeaveBalance component
2. **Manual refresh button** added to LeaveBalance
3. **Auto-refresh every 30 seconds** in RequestHistory
4. **Manual refresh button** in RequestHistory page header

**Files Modified**:
- `/components/LeaveBalance.tsx`
- `/pages/RequestHistory.tsx`

---

### 3. ✅ Notifications Not Matching Expected Format
**Problem**: Notification data structure didn't match what NotificationContext expected.

**Solution**: Updated notification creation in both single and bulk approval/rejection to use consistent format:
```typescript
{
  id: string,
  type: 'request_approved' | 'request_rejected',
  title: string,
  message: string,
  read: boolean,
  created_at: string,
  metadata: { request_id, request_type, admin_notes }
}
```

**Files Modified**:
- `/supabase/functions/server/index.tsx` (lines ~320-333, ~832-845)

---

## 🧪 Complete Testing Checklist

### A. Employee Request Flow

#### Test 1: Create Leave Request
- [ ] Login as employee
- [ ] Navigate to Leave Request
- [ ] Fill out the form with valid data
- [ ] Submit request
- [ ] **Expected Results**:
  - ✅ Success message appears
  - ✅ Redirect to portal
  - ✅ Request appears in "Request History" (may need to click History first)
  - ✅ Leave balance shows pending days

#### Test 2: Create Advance Request
- [ ] Login as employee
- [ ] Navigate to Advance Request
- [ ] Fill amount and reason
- [ ] Submit request
- [ ] **Expected Results**:
  - ✅ Success message appears
  - ✅ Request appears in Request History
  - ✅ Status shows as "Pending"

#### Test 3: Create Entry Permission Request
- [ ] Login as employee
- [ ] Navigate to Entry Permission
- [ ] Fill dates and times
- [ ] Submit request
- [ ] **Expected Results**:
  - ✅ Success message appears
  - ✅ Request appears in Request History

---

### B. Notification System

#### Test 4: Request Created Notification (NOT IMPLEMENTED YET)
> Note: Currently, notifications are only sent when admin approves/rejects, NOT when employee creates a request

#### Test 5: Approval Notification
- [ ] Login as admin
- [ ] Find a pending request
- [ ] Approve the request with notes
- [ ] Logout and login as that employee
- [ ] **Expected Results**:
  - ✅ Bell icon shows notification badge (red dot with count)
  - ✅ Click bell to see "Request Approved" notification
  - ✅ Notification shows admin notes if provided
  - ✅ Request shows as "Approved" in Request History
  - ✅ If leave request: Leave balance updates (used days increase)

#### Test 6: Rejection Notification
- [ ] Login as admin
- [ ] Find a pending request
- [ ] Reject with reason
- [ ] Logout and login as that employee
- [ ] **Expected Results**:
  - ✅ Notification appears with "Request Rejected"
  - ✅ Admin's rejection reason is visible
  - ✅ Request shows as "Rejected" in Request History
  - ✅ If leave request: Balance does NOT change (rejected leaves don't count)

---

### C. Leave Balance Accuracy

#### Test 7: Leave Balance Calculation
- [ ] Login as employee who has approved leaves
- [ ] Check Leave Balance Dashboard on portal
- [ ] **Verify**:
  - ✅ Total Annual = 30 days
  - ✅ Used = sum of all approved leave days
  - ✅ Pending = sum of all pending leave days (shown in yellow on progress bar)
  - ✅ Remaining = Total - Used
  - ✅ Formula: `30 - (approved days) = remaining`

#### Test 8: Hourly Leave Calculation
- [ ] Create hourly leave request
- [ ] Get it approved
- [ ] **Verify**:
  - ✅ Hourly leave counts as 0.5 days
  - ✅ Balance reflects this correctly

#### Test 9: Multi-Day Leave Calculation
- [ ] Create leave from Dec 1 to Dec 5 (5 days)
- [ ] Get it approved
- [ ] **Verify**:
  - ✅ Balance shows 5 days used
  - ✅ Calculation includes both start and end dates

---

### D. Request History Features

#### Test 10: Request History Display
- [ ] Login as employee with multiple requests
- [ ] Go to Request History
- [ ] **Verify**:
  - ✅ All requests appear (leave, advance, entry)
  - ✅ Sorted by newest first
  - ✅ Status badges show correct colors:
    - Green for Approved
    - Red for Rejected  
    - Yellow for Pending
  - ✅ Request details are complete

#### Test 11: Filtering Requests
- [ ] In Request History, filter by type (Leave only)
- [ ] **Verify**: Only leave requests shown
- [ ] Filter by status (Approved only)
- [ ] **Verify**: Only approved requests shown
- [ ] Combine filters (Leave + Approved)
- [ ] **Verify**: Only approved leave requests shown

#### Test 12: Request Details Modal
- [ ] Click "Details" on any request
- [ ] **Verify**:
  - ✅ Modal opens with full request information
  - ✅ Shows dates, times, amounts (depending on type)
  - ✅ Shows admin notes if request was processed
  - ✅ Status badge is visible

#### Test 13: Cancel Pending Request
- [ ] Find a pending request in history
- [ ] Click the X (cancel) button
- [ ] Confirm cancellation
- [ ] **Verify**:
  - ✅ Confirmation dialog appears
  - ✅ After confirming, request status changes to "Cancelled"
  - ✅ Success message appears
  - ✅ If leave: balance updates (pending days removed)

#### Test 14: Manual Refresh
- [ ] In Request History, click "Refresh" button
- [ ] **Verify**:
  - ✅ Button shows spinning icon while loading
  - ✅ Latest data is fetched
  - ✅ Any new approvals/rejections appear immediately

---

### E. Admin Dashboard

#### Test 15: Bulk Approve
- [ ] Login as admin
- [ ] Go to Requests tab
- [ ] Filter to show "Pending" requests
- [ ] Select 3-5 requests using checkboxes
- [ ] Click "Approve All"
- [ ] Add optional notes
- [ ] Confirm
- [ ] **Verify**:
  - ✅ All selected requests change to "Approved"
  - ✅ Notifications created for each employee
  - ✅ Success message shows count (e.g., "5 requests approved")
  - ✅ Selection is cleared
  - ✅ Requests disappear from pending filter view

#### Test 16: Bulk Reject
- [ ] Select multiple pending requests
- [ ] Click "Reject All"
- [ ] Add rejection reason (required)
- [ ] Confirm
- [ ] **Verify**:
  - ✅ Cannot proceed without reason
  - ✅ All selected requests become "Rejected"
  - ✅ Each employee gets notification with reason
  - ✅ Success message appears

#### Test 17: PDF Export
- [ ] In Admin Dashboard > Requests
- [ ] Apply filters (e.g., only Leave requests)
- [ ] Click "Export PDF"
- [ ] **Verify**:
  - ✅ PDF downloads automatically
  - ✅ Contains filtered data only
  - ✅ Ya Hala branding visible
  - ✅ Table is properly formatted
  - ✅ Page numbers on each page

---

## 🐛 Known Issues & Limitations

### 1. Notifications for Request Creation
**Status**: NOT IMPLEMENTED  
**Description**: When an employee creates a request, no notification is sent. Notifications only work for approvals/rejections.

**Workaround**: Check Request History for your submitted requests.

**Future Enhancement**: Add notification creation in the POST `/requests` route.

---

### 2. Real-time Updates
**Status**: PARTIAL  
**Description**: Updates are not truly real-time. They rely on:
- Auto-refresh (30-60 second intervals)
- Manual refresh buttons
- Page navigation

**Workaround**: Use the manual refresh buttons after admin actions.

**Future Enhancement**: Implement Supabase Realtime subscriptions for instant updates.

---

### 3. Leave Balance for Cancelled Requests
**Status**: WORKS BUT MAY BE CONFUSING  
**Description**: When a pending leave is cancelled, the pending days are removed from the balance calculation.

**Behavior**: This is correct, but users might not understand why pending count changed.

---

## 🔍 Debugging Guide

### Issue: "Request History is empty but I submitted requests"

**Checklist**:
1. Check browser console for errors
2. Verify employee ID in console: Open DevTools > Console > Type:
   ```javascript
   console.log('Employee ID:', localStorage.getItem('employee_id'))
   ```
3. Check network tab:
   - Look for GET request to `/requests/employee/:id`
   - Check response - is it returning data?
4. Click "Refresh" button in Request History
5. Try logging out and back in

**Common Causes**:
- Browser caching old data
- Employee ID mismatch (fixed in this update)
- Backend not seeded with requests

---

### Issue: "Leave balance not updating after approval"

**Checklist**:
1. Wait 60 seconds for auto-refresh
2. Click manual refresh button on LeaveBalance card
3. Navigate away and back to portal
4. Check if request is actually approved (go to Request History)
5. Verify the request type is "leave" (advances don't affect leave balance)

**Common Causes**:
- Request is still pending (not approved yet)
- Request type is not leave
- Date calculation error (check console logs)

---

### Issue: "Notifications not appearing"

**Checklist**:
1. Check if NotificationBell has a badge number
2. Click the bell icon to open notifications panel
3. Check browser console for errors
4. Verify employee is logged in (notifications need employee ID)
5. Check network tab for notification API calls

**Common Causes**:
- All notifications already marked as read
- Employee ID mismatch
- Backend route error

**Debug Steps**:
```javascript
// In browser console:
fetch('https://[PROJECT_ID].supabase.co/functions/v1/make-server-fdcde35a/notifications/[EMPLOYEE_ID]', {
  headers: { 'Authorization': 'Bearer [ANON_KEY]' }
})
.then(r => r.json())
.then(console.log)
```

---

### Issue: "Bulk operations not working"

**Checklist**:
1. Verify you're filtering by "Pending" status only
2. Check that checkboxes appear next to requests
3. Ensure you selected at least one request
4. For rejection: Make sure you added a reason
5. Check browser console for errors

**Common Causes**:
- Trying to bulk process non-pending requests
- Missing required rejection reason
- Network error

---

## 📊 Database Verification

### Check Requests in KV Store

The backend uses Supabase KV store. To verify requests exist:

1. Go to Supabase Dashboard
2. Navigate to your project
3. Check the Edge Functions logs
4. Look for log entries when fetching requests

### Request Data Structure

Each request should have:
```typescript
{
  id: string,                    // e.g., "req_1234567890_abc"
  employee_id: number,           // e.g., 101
  type: 'leave' | 'advance' | 'entry',
  sub_type?: string,             // e.g., 'annual', 'hourly'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  start_date: string,            // e.g., '2025-01-15'
  end_date?: string,
  start_time?: string,
  end_time?: string,
  amount?: number,               // for advances
  notes?: string,
  admin_notes?: string,
  created_at: string,            // ISO timestamp
  updated_at?: string,
  approved_at?: string,
  rejected_at?: string
}
```

---

## ✅ Success Criteria

Your system is working correctly if:

1. **Request Creation**:
   - [x] Employee can create all 3 types of requests
   - [x] Requests appear in Request History immediately
   - [x] Pending leave requests show in balance (yellow bar)

2. **Request Processing**:
   - [x] Admin can approve/reject individual requests
   - [x] Admin can bulk process multiple requests
   - [x] Timestamps are recorded (approved_at / rejected_at)

3. **Notifications**:
   - [x] Bell icon shows unread count
   - [x] Notifications appear after approval/rejection
   - [x] Clicking notification marks it as read
   - [x] Can mark all as read
   - [x] Can delete individual notifications

4. **Leave Balance**:
   - [x] Shows correct total (30 days)
   - [x] Accurately calculates used days (approved only)
   - [x] Shows pending days separately
   - [x] Updates within 60 seconds of approval
   - [x] Manual refresh works immediately

5. **Data Persistence**:
   - [x] Requests persist after logout/login
   - [x] Balance is recalculated on each visit
   - [x] Filters and sorting work correctly

---

## 🆘 Emergency Reset

If the system becomes unstable or data is corrupted:

### Option 1: Re-seed Database
```bash
# Call the seed endpoint
POST https://[PROJECT_ID].supabase.co/functions/v1/make-server-fdcde35a/seed
```

This will:
- Recreate sample companies
- Recreate sample employees
- Clear and reset base data

⚠️ **Warning**: This may overwrite existing data!

### Option 2: Clear Browser Data
1. Open DevTools (F12)
2. Go to Application tab
3. Clear all storage
4. Refresh page
5. Login again

---

## 📞 Support Checklist

Before asking for help, please verify:

- [ ] Browser console is clear of errors
- [ ] Network tab shows successful API responses
- [ ] You're using the latest version of the code
- [ ] You've tried manual refresh buttons
- [ ] You've logged out and back in
- [ ] Database has been seeded with test data

**Provide this information**:
1. Employee ID you're testing with
2. Screenshot of Request History page
3. Screenshot of browser console
4. Screenshot of Network tab (filtered to show API calls)
5. Steps to reproduce the issue

---

Last Updated: Phase 1 Completion  
Version: 1.1.0  
Status: All core features operational ✅
