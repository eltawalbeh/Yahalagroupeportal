import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { sendEmail, sendEmailWithCC } from './email-service.tsx';

// ── Allowed roles for HR / Manager portal ────────────────────────────────────
const MANAGER_ROLES = new Set(['manager', 'admin', 'super_admin', 'accountant', 'owner']);

/**
 * Verify that the given employee ID exists and has an elevated role.
 * Returns the employee record on success, null on failure.
 */
async function verifyManagerPermission(managerId: string | number | undefined | null): Promise<any | null> {
  if (!managerId) return null;
  try {
    const emp = await kv.get(`employee:${managerId}`);
    if (!emp || emp.deleted_at) return null;
    if (!MANAGER_ROLES.has(emp.role)) return null;
    return emp;
  } catch {
    return null;
  }
}

/** Sanitize an employee record: strip password fields before sending to client. */
function sanitizeEmployee(emp: any): any {
  if (!emp) return emp;
  const { password: _p, temporary_password: _tp, ...safe } = emp;
  return safe;
}

// Helper to get values by prefix (used for fetching all employees, etc.)
async function getValuesByPrefix(prefix: string) {
  const results = await kv.getByPrefix(prefix);
  return results || [];
}

// ── Workflow Helpers (mirrored from index.tsx) ────────────────────────────────
function getFinancialYearKey(hireDateStr: string): string {
  try {
    const hireDate = new Date(hireDateStr);
    const today = new Date();
    const anniversaryThisYear = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate());
    const fyStart = today >= anniversaryThisYear ? today.getFullYear() : today.getFullYear() - 1;
    return `${fyStart}-${fyStart + 1}`;
  } catch {
    return `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  }
}

function calcLeaveDays(startDate: string, endDate: string): number {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  } catch { return 1; }
}

async function notifyAccountantsForAnnualLeave(employee: any, request: any, days: number, shortId: string): Promise<void> {
  try {
    const allEmployees = await getValuesByPrefix('employee:');
    const accountants = allEmployees.filter((emp: any) => emp.role === 'accountant' && emp.email && !emp.deleted_at);
    const emailData = {
      employeeName: employee.full_name || 'Employee',
      employeeNameAr: employee.full_name_ar || employee.full_name,
      startDate: request.start_date || '—',
      endDate: request.end_date || '—',
      days,
      requestId: shortId,
      portalUrl: 'https://portal.yahala.co'
    };
    for (const acc of accountants) {
      await sendEmail(acc.email, 'annualLeaveAccountant', { ...emailData, accountantName: acc.full_name }, 'en');
      await sendEmail(acc.email, 'annualLeaveAccountant', { ...emailData, accountantName: acc.full_name_ar || acc.full_name }, 'ar');
    }
    if (accountants.length === 0) console.log('ℹ️ No accountants found for annual leave notification');
  } catch (e) { console.error('notifyAccountantsForAnnualLeave error:', e); }
}

async function notifyOwnerForAnnualLeave(employee: any, request: any, days: number, shortId: string): Promise<void> {
  try {
    const fyKey = getFinancialYearKey(employee.hire_date || new Date().toISOString());
    const exitPermKey = `exit_permission:${employee.id}:${fyKey}`;
    const alreadyIssued = await kv.get(exitPermKey);

    if (alreadyIssued) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(`notification:${notifId}`, {
        id: notifId,
        employee_id: employee.id,
        title: 'Exit Permission — At Your Expense',
        title_ar: 'تصريح الخروج — على نفقتك الخاصة',
        message: `Your annual leave has been approved. Note: Your company exit permission for FY ${fyKey} was already issued. Additional exit permission is at your own expense.`,
        message_ar: `تمت الموافقة على إجازتك. ملاحظة: تم إصدار تصريح الخروج للسنة المالية ${fyKey} مسبقاً. أي تصريح إضافي على نفقتك الخاصة.`,
        type: 'exit_permission_own_expense',
        read: false,
        created_at: new Date().toISOString(),
        metadata: { request_id: shortId, financial_year: fyKey }
      });
      return;
    }

    const allEmployees = await getValuesByPrefix('employee:');
    const owners = allEmployees.filter((emp: any) => emp.role === 'owner' && emp.email && !emp.deleted_at);
    const emailData = {
      employeeName: employee.full_name || 'Employee',
      employeeNameAr: employee.full_name_ar || employee.full_name,
      startDate: request.start_date || '—',
      endDate: request.end_date || '—',
      days,
      financialYear: fyKey,
      requestId: shortId,
      portalUrl: 'https://portal.yahala.co'
    };
    for (const owner of owners) {
      await sendEmail(owner.email, 'annualLeaveOwner', { ...emailData, ownerName: owner.full_name }, 'en');
      await sendEmail(owner.email, 'annualLeaveOwner', { ...emailData, ownerName: owner.full_name_ar || owner.full_name }, 'ar');
    }
    await kv.set(exitPermKey, { issued_at: new Date().toISOString(), request_id: shortId, financial_year: fyKey, employee_id: employee.id });
    if (owners.length === 0) console.log('ℹ️ No owners found for exit permission notification');
  } catch (e) { console.error('notifyOwnerForAnnualLeave error:', e); }
}

async function notifyAccountantsForAdvance(employee: any, request: any, requestId: string, approverName: string): Promise<void> {
  try {
    const disburseToken = crypto.randomUUID();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || '';
    const disbursementUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/advance/confirm-disbursement/${disburseToken}`;

    await kv.set(`advance_disburse_token:${disburseToken}`, {
      request_id: requestId,
      employee_id: employee.id,
      amount: request.amount,
      created_at: new Date().toISOString(),
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    const shortId = requestId.substring(0, 8).toUpperCase();
    const ccEmails = employee.email ? [employee.email] : [];
    const allEmployees = await getValuesByPrefix('employee:');
    const accountants = allEmployees.filter((emp: any) => emp.role === 'accountant' && emp.email && !emp.deleted_at);

    const emailData = {
      employeeName: employee.full_name || 'Employee',
      employeeNameAr: employee.full_name_ar || employee.full_name,
      amount: parseFloat(request.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 }),
      reason: request.notes || request.reason || '—',
      requestId: shortId,
      approverName,
      disbursementUrl,
      portalUrl: 'https://portal.yahala.co'
    };

    for (const acc of accountants) {
      await sendEmailWithCC(acc.email, ccEmails, 'advanceApprovedAccountant', { ...emailData, accountantName: acc.full_name }, 'en');
      await sendEmailWithCC(acc.email, ccEmails, 'advanceApprovedAccountant', { ...emailData, accountantName: acc.full_name_ar || acc.full_name }, 'ar');
    }
    if (accountants.length === 0) console.log('ℹ️ No accountants found for advance notification');
  } catch (e) { console.error('notifyAccountantsForAdvance error:', e); }
}

const app = new Hono();

/**
 * GET /manager/team-requests
 * Get all requests (HR Admin View)
 */
app.get('/team-requests', async (c) => {
  try {
    const managerId = c.req.query('manager_id');

    if (!managerId) {
      return c.json({ success: false, message: 'Manager ID is required' }, 400);
    }

    // ── Authorization: verify manager/HR role ─────────────────────────────
    const managerEmp = await verifyManagerPermission(managerId);
    if (!managerEmp) {
      return c.json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        messageAr: 'تم رفض الوصول. صلاحيات غير كافية.'
      }, 403);
    }

    console.log(`[HR Portal] Fetching all requests for admin: ${managerId}`);

    // Get all employees
    const allEmployees = await getValuesByPrefix('employee:');
    
    // Get all requests
    const allRequestsRaw = await getValuesByPrefix('request:');
    
    // Format requests with employee info
    const formatRequest = (request: any) => {
      if (!request || request.deleted_at) return null;
      
      const empId = request.employee_id?.toString();
      const employee = allEmployees.find((emp: any) => emp.id.toString() === empId);
      
      // Also resolve processed_by name
      let processedByName = request.processed_by_name || null;
      if (!processedByName && request.processed_by) {
        const processor = allEmployees.find((emp: any) => emp.id?.toString() === request.processed_by?.toString());
        if (processor) processedByName = processor.full_name;
      }

      return {
        ...request,
        request_type: request.type || request.request_type, 
        processed_by_name: processedByName,
        employees: {
          id: employee?.id,
          full_name: employee?.full_name || 'Unknown',
          full_name_ar: employee?.full_name_ar,
          position: employee?.position
        }
      };
    };

    const allRequests = allRequestsRaw
      .map(formatRequest)
      .filter(Boolean);

    // Sort by created_at descending
    allRequests.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, requests: allRequests });
  } catch (error) {
    console.error('Error in team-requests endpoint:', error);
    return c.json({ success: false, message: 'Internal server error', error: error.message }, 500);
  }
});

/**
 * POST /manager/process-request
 * Approve or reject a request (HR Admin Mode)
 * Automatically updates leave balances upon approval
 * Full email notification workflow + activity log
 */
app.post('/process-request', async (c) => {
  try {
    const { request_id, status, manager_id, approval_notes } = await c.req.json();

    if (!request_id || !status || !manager_id) {
      return c.json({ 
        success: false, 
        message: 'Request ID, status, and manager ID are required' 
      }, 400);
    }

    if (!['approved', 'rejected'].includes(status)) {
      return c.json({ 
        success: false, 
        message: 'Status must be approved or rejected' 
      }, 400);
    }

    let requestKey = `request:${request_id}`;
    let request = await kv.get(requestKey);

    if (!request || request.deleted_at) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    // Get manager info
    const managerInfo = await kv.get(`employee:${manager_id}`);
    const managerName = managerInfo?.full_name || 'HR Manager';
    const managerNameAr = managerInfo?.full_name_ar || managerName;

    const nowISO = new Date().toISOString();

    // --- LOGIC TO UPDATE LEAVE BALANCES ---
    if (request.status !== status) {
      const isLeave = (request.type === 'leave' || request.request_type === 'leave');
      
      let days = 0;
      if (isLeave && request.start_date && request.end_date) {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      }

      if (isLeave && days > 0) {
        const employeeId = request.employee_id;
        const employee = await kv.get(`employee:${employeeId}`);
        
        if (employee) {
          const currentLimits = employee.limits || {
            annual_leave_balance: 21,
            sick_leave_balance: 30,
            emergency_leave_balance: 5
          };
          
          let newLimits = { ...currentLimits };
          let limitsUpdated = false;
          const subType = request.sub_type || request.leave_type;

          if (status === 'approved' && request.status !== 'approved') {
            if (subType === 'annual') { newLimits.annual_leave_balance -= days; limitsUpdated = true; }
            else if (subType === 'sick') { newLimits.sick_leave_balance -= days; limitsUpdated = true; }
            else if (subType === 'emergency') { newLimits.emergency_leave_balance -= days; limitsUpdated = true; }
          } else if (status === 'rejected' && request.status === 'approved') {
            if (subType === 'annual') { newLimits.annual_leave_balance += days; limitsUpdated = true; }
            else if (subType === 'sick') { newLimits.sick_leave_balance += days; limitsUpdated = true; }
            else if (subType === 'emergency') { newLimits.emergency_leave_balance += days; limitsUpdated = true; }
          }

          if (limitsUpdated) {
             const updatedEmployee = { ...employee, limits: newLimits, updated_at: nowISO };
             await kv.set(`employee:${employeeId}`, updatedEmployee);
             
             const logId = `log_${Date.now()}_sys`;
             await kv.set(`admin_log:${logId}`, {
               id: logId, timestamp: nowISO, action: 'system_update_limits',
               performed_by: 'system', target_employee: employeeId,
               details: { reason: `Automatic update from request ${request_id} (${status})`, days_diff: status === 'approved' ? -days : days, leave_type: subType }
             });
          }
        }
      }
    }

    // Update the request status
    const updatedRequest: any = {
      ...request,
      status,
      approval_notes,
      processed_by: manager_id,
      processed_by_name: managerName,
      processed_at: nowISO,
      updated_at: nowISO
    };

    // --- EMAIL NOTIFICATIONS & ACTIVITY LOG ---
    const requestTypes: any = {
      leave: { en: 'Leave Request', ar: 'طلب إجازة' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' },
      entry_permission: { en: 'Entry Permission', ar: 'إذن خروج وعودة' },
      entry: { en: 'Entry Permission', ar: 'إذن خروج وعودة' }
    };
    const typeKey = request.type || request.request_type || 'request';
    const typeLabel = requestTypes[typeKey] || { en: 'Request', ar: 'طلب' };

    const actionNotifications: any[] = [];

    const approvedAt = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const shortId = (typeof request_id === 'string' ? request_id : request_id.toString()).substring(0, 8).toUpperCase();

    // (a) Send status email to the employee who made the request
    const employee = await kv.get(`employee:${request.employee_id}`);
    if (employee?.email) {
      const emailTemplate = status === 'approved' ? 'requestApproved' : 'requestRejected';
      const emailData = {
        employeeName: employee.full_name || 'Employee',
        requestType: typeLabel.en,
        requestTypeAr: typeLabel.ar,
        requestId: shortId,
        approverName: managerName,
        approvedAt: approvedAt,
        rejectedAt: approvedAt,
        rejectedBy: managerName,
        comments: approval_notes || '',
        reason: approval_notes || '',
        portalUrl: 'https://portal.yahala.co'
      };
      await sendEmail(employee.email, emailTemplate as any, emailData, 'en');
      await sendEmail(employee.email, emailTemplate as any, emailData, 'ar');
      console.log(`✅ ${status} email sent to employee: ${employee.email}`);
      actionNotifications.push({ type: 'email', recipient_name: employee.full_name, recipient_email: employee.email, recipient_role: 'employee', template: emailTemplate });
    }

    // In-app notification for employee
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`notification:${notificationId}`, {
      id: notificationId,
      employee_id: request.employee_id,
      title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
      title_ar: status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب',
      message: status === 'approved'
        ? `Your ${typeLabel.en} request has been ${status} by ${managerName}`
        : `Your ${typeLabel.en} request has been ${status} by ${managerName}`,
      message_ar: status === 'approved'
        ? `تمت الموافقة على طلب ${typeLabel.ar} من قبل ${managerNameAr}`
        : `تم رفض طلب ${typeLabel.ar} من قبل ${managerNameAr}`,
      type: 'request_update',
      related_id: request_id,
      read: false,
      created_at: nowISO
    });
    actionNotifications.push({ type: 'in_app', recipient_name: employee?.full_name || 'Employee', recipient_role: 'employee' });

    // ── Annual Leave specific notifications ──────────────────────────────────
    if (status === 'approved' && (request.type === 'leave' || request.request_type === 'leave') &&
        (request.sub_type === 'annual' || request.leave_type === 'annual')) {
      const leaveDays = calcLeaveDays(request.start_date, request.end_date);
      const shortId = (typeof request_id === 'string' ? request_id : String(request_id)).substring(0, 8).toUpperCase();
      await notifyAccountantsForAnnualLeave(employee || {}, request, leaveDays, shortId);
      await notifyOwnerForAnnualLeave(employee || {}, request, leaveDays, shortId);
      console.log(`✅ [Manager] Annual leave workflow notifications triggered`);
    }

    // ── Advance specific notifications ────────────────────────────────────────
    if (status === 'approved' && (request.type === 'advance' || request.request_type === 'advance')) {
      await notifyAccountantsForAdvance(employee || {}, request, String(request_id), managerName);
      console.log(`✅ [Manager] Advance workflow notifications triggered`);
    }

    // (b) Send confirmation email to the acting manager (self-confirmation)
    if (managerInfo?.email) {
      const mgrConfirmData = {
        managerName: managerName,
        employeeName: employee?.full_name || 'Employee',
        requestType: typeLabel.en,
        requestTypeAr: typeLabel.ar,
        requestId: shortId,
        submittedAt: approvedAt,
        details: `Status: ${status.toUpperCase()} by ${managerName}. ${approval_notes ? 'Notes: ' + approval_notes : ''}`,
        portalUrl: 'https://portal.yahala.co'
      };
      await sendEmail(managerInfo.email, 'approvalNeeded', mgrConfirmData, 'en');
      console.log(`✅ Manager self-confirmation sent to: ${managerInfo.email}`);
      actionNotifications.push({ type: 'email', recipient_name: managerName, recipient_email: managerInfo.email, recipient_role: 'manager', template: 'approvalNeeded' });
    }

    // (c) Send confirmation email to all admins / super admins
    const allEmployees = await getValuesByPrefix('employee:');
    const admins = allEmployees.filter((emp: any) => emp.role === 'admin' && emp.email);
    for (const admin of admins) {
      const adminConfirmData = {
        managerName: admin.full_name || 'Admin',
        employeeName: employee?.full_name || 'Employee',
        requestType: typeLabel.en,
        requestTypeAr: typeLabel.ar,
        requestId: shortId,
        submittedAt: approvedAt,
        details: `Status: ${status.toUpperCase()} by ${managerName} (HR/Manager). ${approval_notes ? 'Notes: ' + approval_notes : ''}`,
        portalUrl: 'https://portal.yahala.co'
      };
      await sendEmail(admin.email, 'approvalNeeded', adminConfirmData, 'en');
      console.log(`✅ Admin confirmation sent to: ${admin.email}`);
      actionNotifications.push({ type: 'email', recipient_name: admin.full_name, recipient_email: admin.email, recipient_role: 'admin', template: 'approvalNeeded' });
    }

    // Build activity log entry
    const activityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: status,
      performed_by: manager_id?.toString(),
      performed_by_name: managerName,
      performed_by_name_ar: managerNameAr,
      performed_by_role: 'manager',
      timestamp: nowISO,
      notes: approval_notes || null,
      notifications_sent: actionNotifications
    };

    const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];
    updatedRequest.activity_log = [...existingLog, activityEntry];

    await kv.set(requestKey, updatedRequest);

    return c.json({ 
      success: true, 
      message: `Request ${status} successfully`,
      request_id 
    });
  } catch (error) {
    console.error('Error in process-request endpoint:', error);
    return c.json({ success: false, message: 'Internal server error', error: error.message }, 500);
  }
});

/**
 * GET /manager/team-members
 * Get all employees (HR Admin View)
 */
app.get('/team-members', async (c) => {
  try {
    const managerId = c.req.query('manager_id');

    if (!managerId) {
      return c.json({ success: false, message: 'Manager ID is required' }, 400);
    }

    // ── Authorization: verify manager/HR role ─────────────────────────────
    const managerEmp = await verifyManagerPermission(managerId);
    if (!managerEmp) {
      return c.json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        messageAr: 'تم رفض الوصول. صلاحيات غير كافية.'
      }, 403);
    }

    // Return ALL employees for HR Admin
    const allEmployees = await getValuesByPrefix('employee:');
    const activeEmployees = allEmployees.filter((emp: any) => !emp.deleted_at);

    // Sort by full_name
    activeEmployees.sort((a: any, b: any) => 
      (a.full_name || '').localeCompare(b.full_name || '')
    );

    return c.json({ success: true, employees: activeEmployees.map(sanitizeEmployee) });
  } catch (error) {
    console.error('Error in team-members endpoint:', error);
    return c.json({ success: false, message: 'Internal server error', error: error.message }, 500);
  }
});

/**
 * PATCH /manager/update-employee-limits
 * Update employee leave limits and log the action
 */
app.patch('/update-employee-limits', async (c) => {
  try {
    const { manager_id, employee_id, limits } = await c.req.json();

    if (!manager_id || !employee_id || !limits) {
      return c.json({ success: false, message: 'Missing required fields' }, 400);
    }

    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }

    const oldLimits = employee.limits || {
      annual_leave_balance: 21,
      sick_leave_balance: 30,
      emergency_leave_balance: 5
    };

    const updatedEmployee = {
      ...employee,
      limits: { ...oldLimits, ...limits },
      updated_at: new Date().toISOString()
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);

    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`admin_log:${logId}`, {
      id: logId,
      timestamp: new Date().toISOString(),
      action: 'update_employee_limits',
      performed_by: manager_id,
      target_employee: employee_id,
      target_employee_name: employee.full_name,
      details: { old_values: oldLimits, new_values: limits, reason: 'HR Admin update' }
    });

    return c.json({ 
      success: true, 
      message: 'Limits updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error updating limits:', error);
    return c.json({ success: false, message: 'Server error' }, 500);
  }
});

// ==================== MANAGER RESEND EMAIL NOTIFICATION ====================

/**
 * POST /manager/requests/:id/resend-email
 * Resend the approval/rejection decision email for a processed request
 * Mirrors the admin resend functionality for HR/Manager users
 */
app.post('/requests/:id/resend-email', async (c) => {
  try {
    const id = c.req.param('id');
    const { recipients, manager_id, manager_name, manager_name_ar } = await c.req.json();

    console.log(`[Manager] Resend email request for request ${id}, by manager ${manager_id}, recipients: ${JSON.stringify(recipients)}`);

    const request = await kv.get(`request:${id}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    if (!['approved', 'rejected'].includes(request.status)) {
      return c.json({ success: false, message: 'Can only resend emails for approved or rejected requests' }, 400);
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return c.json({ success: false, message: 'At least one recipient type is required' }, 400);
    }

    const employee = await kv.get(`employee:${request.employee_id}`);
    const requestTypeLabels: Record<string, { en: string; ar: string }> = {
      leave: { en: 'Leave Request', ar: 'طلب إجازة' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' },
      entry: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' },
      entry_permission: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' }
    };
    const typeLabel = requestTypeLabels[request.type || request.request_type] || { en: 'Request', ar: 'طلب' };
    const processedAt = request.processed_at
      ? new Date(request.processed_at).toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : new Date().toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

    const emailResults: Array<{ recipient: string; email: string; role: string; success: boolean }> = [];

    // Use the correct template based on actual request status
    const emailTemplate = request.status === 'approved' ? 'requestApproved' : 'requestRejected';
    const deciderName = request.processed_by_name || manager_name || 'HR Manager';

    const baseEmailData = {
      requestType: typeLabel.en,
      requestTypeAr: typeLabel.ar,
      requestId: id.substring(0, 8).toUpperCase(),
      approverName: deciderName,
      approvedAt: processedAt,
      rejectedAt: processedAt,
      rejectedBy: deciderName,
      portalUrl: 'https://portal.yahala.co'
    };

    // (1) Resend to employee
    if (recipients.includes('employee') && employee?.email) {
      const emailData = {
        ...baseEmailData,
        employeeName: employee.full_name || employee.nameEn || 'Employee',
        comments: request.admin_notes || request.approval_notes || '',
        reason: request.admin_notes || request.approval_notes || ''
      };
      const enResult = await sendEmail(employee.email, emailTemplate as any, emailData, 'en');
      const arResult = await sendEmail(employee.email, emailTemplate as any, emailData, 'ar');
      emailResults.push({
        recipient: employee.full_name || 'Employee',
        email: employee.email,
        role: 'employee',
        success: enResult || arResult
      });
      console.log(`[Manager] Resend ${request.status} to employee ${employee.email}: ${enResult || arResult ? 'OK' : 'FAIL'}`);
    }

    // (2) Resend to manager
    if (recipients.includes('manager') && employee?.manager_id) {
      const mgr = await kv.get(`employee:${employee.manager_id}`);
      if (mgr?.email) {
        const employeeFullName = employee.full_name || employee.nameEn || 'Employee';
        const mgrEmailData = {
          ...baseEmailData,
          employeeName: mgr.full_name || mgr.nameEn || 'Manager',
          comments: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || request.approval_notes || ''}`.trim(),
          reason: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || request.approval_notes || ''}`.trim()
        };
        const enResult = await sendEmail(mgr.email, emailTemplate as any, mgrEmailData, 'en');
        const arResult = await sendEmail(mgr.email, emailTemplate as any, mgrEmailData, 'ar');
        emailResults.push({
          recipient: mgr.full_name || 'Manager',
          email: mgr.email,
          role: 'manager',
          success: enResult || arResult
        });
        console.log(`[Manager] Resend ${request.status} to manager ${mgr.email}: ${enResult || arResult ? 'OK' : 'FAIL'}`);
      }
    }

    // (3) Resend to admin(s)
    if (recipients.includes('admin')) {
      const allEmployees = await getValuesByPrefix('employee:');
      const admins = allEmployees.filter((emp: any) =>
        (emp.role === 'admin' || emp.role === 'super_admin') && emp.email
      );
      const employeeFullName = employee?.full_name || employee?.nameEn || 'Employee';
      for (const adm of admins) {
        const admEmailData = {
          ...baseEmailData,
          employeeName: adm.full_name || adm.nameEn || 'Admin',
          comments: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || request.approval_notes || ''}`.trim(),
          reason: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || request.approval_notes || ''}`.trim()
        };
        const enResult = await sendEmail(adm.email, emailTemplate as any, admEmailData, 'en');
        const arResult = await sendEmail(adm.email, emailTemplate as any, admEmailData, 'ar');
        emailResults.push({
          recipient: adm.full_name || 'Admin',
          email: adm.email,
          role: 'admin',
          success: enResult || arResult
        });
        console.log(`[Manager] Resend ${request.status} to admin ${adm.email}: ${enResult || arResult ? 'OK' : 'FAIL'}`);
      }
    }

    // Append activity log entry
    const nowISO = new Date().toISOString();
    const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];
    existingLog.push({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: 'email_resent',
      performed_by: manager_id || 'manager',
      performed_by_name: manager_name || 'HR Manager',
      performed_by_name_ar: manager_name_ar || manager_name || 'مدير الموارد البشرية',
      performed_by_role: 'manager',
      timestamp: nowISO,
      notes: `${request.status === 'approved' ? 'Approval' : 'Rejection'} notification resent to: ${recipients.join(', ')}`,
      notifications_sent: emailResults.map(r => ({
        type: 'email',
        recipient_name: r.recipient,
        recipient_email: r.email,
        recipient_role: r.role,
        success: r.success
      }))
    });

    const updatedRequest = {
      ...request,
      activity_log: existingLog,
      updated_at: nowISO
    };
    await kv.set(`request:${id}`, updatedRequest);

    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;

    return c.json({
      success: true,
      message: `Emails resent: ${successCount} succeeded, ${failCount} failed`,
      results: emailResults,
      stats: { total: emailResults.length, success: successCount, failed: failCount }
    });
  } catch (error) {
    console.error('[Manager] Resend email error:', error);
    return c.json({ success: false, message: `Error resending emails: ${error.message}` }, 500);
  }
});

// ==================== EMPLOYEE REQUEST HISTORY (Manager Portal) ====================

/**
 * GET /manager/employee-requests/:employee_id
 * Returns the full request history for a specific employee.
 * Requires a valid manager_id query param. No admin token needed.
 */
app.get('/employee-requests/:employee_id', async (c) => {
  try {
    const employeeId = c.req.param('employee_id');
    const managerId = c.req.query('manager_id');

    if (!employeeId) {
      return c.json({ success: false, message: 'Missing employee_id' }, 400);
    }

    // Validate the caller is a manager/admin role
    const manager = managerId ? await verifyManagerPermission(managerId) : null;
    if (!manager) {
      return c.json({ success: false, message: 'Unauthorized: valid manager_id required' }, 401);
    }

    // Fetch all requests with the matching employee_id
    const allRequests = await getValuesByPrefix('request:');
    const employeeRequests = allRequests
      .filter((r: any) => {
        const empId = (r.employee_id ?? r.employeeId ?? '').toString();
        return empId === employeeId.toString();
      })
      .sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    console.log(`[Manager] Fetched ${employeeRequests.length} requests for employee ${employeeId}`);
    return c.json({ success: true, requests: employeeRequests });
  } catch (error) {
    console.error('Error fetching employee requests (manager):', error);
    return c.json({ success: false, message: `Server error: ${error}` }, 500);
  }
});

// ==================== HR PERMISSIONS ====================

/**
 * GET /manager/hr-permissions
 * Get current HR permissions for manager portal features
 */
app.get('/hr-permissions', async (c) => {
  try {
    let permissions = await kv.get('hr_permissions');
    if (!permissions) {
      permissions = {
        can_upload_documents: false,
        can_edit_employee_info: false,
        can_resend_emails: true,
        updated_at: new Date().toISOString()
      };
    }
    return c.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching HR permissions:', error);
    return c.json({ success: false, message: 'Error fetching permissions' }, 500);
  }
});

/**
 * GET /manager/leave-calendar
 * Get approved leave events for the calendar view (manager-accessible).
 * Auth via manager_id query param.
 */
app.get('/leave-calendar', async (c) => {
  try {
    const managerId = c.req.query('manager_id');
    const manager = await verifyManagerPermission(managerId);
    if (!manager) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const requestsList = await getValuesByPrefix('request:');
    const leaveRequests = requestsList.filter((req: any) =>
      req.type === 'leave' && req.status === 'approved'
    );

    const events = await Promise.all(
      leaveRequests.map(async (req: any) => {
        const employee = req.employee_id ? await kv.get(`employee:${req.employee_id}`) : null;
        let company = null;
        if (employee?.company_id) {
          company = await kv.get(`company:${employee.company_id}`);
        }
        return {
          id: req.id,
          employee_name: employee?.full_name || 'Unknown',
          employee_name_ar: employee?.full_name_ar || null,
          company_name: company?.name || 'N/A',
          start_date: req.start_date,
          end_date: req.end_date,
          type: req.type,
          sub_type: req.sub_type,
          status: req.status,
        };
      })
    );

    return c.json({ success: true, events });
  } catch (error) {
    console.error('Manager leave-calendar error:', error);
    return c.json({ success: false, message: 'Error fetching leave calendar' }, 500);
  }
});

/**
 * PATCH /manager/update-employee-extra-info
 * Update extra information for an employee (requires can_edit_employee_info permission)
 */
app.patch('/update-employee-extra-info', async (c) => {
  try {
    const { manager_id, employee_id, extra_info } = await c.req.json();

    if (!manager_id || !employee_id) {
      return c.json({ success: false, message: 'Missing required fields' }, 400);
    }

    // Check permission
    const permissions = await kv.get('hr_permissions');
    if (!permissions?.can_edit_employee_info) {
      return c.json({ success: false, message: 'Permission denied: Extra info editing is not enabled by admin' }, 403);
    }

    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }

    const nowISO = new Date().toISOString();
    const updatedEmployee = {
      ...employee,
      extra_info: {
        ...(employee.extra_info || {}),
        ...extra_info,
        updated_at: nowISO,
        updated_by: manager_id
      },
      updated_at: nowISO
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);

    // Log the action
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const managerInfo = await kv.get(`employee:${manager_id}`);
    await kv.set(`admin_log:${logId}`, {
      id: logId,
      timestamp: nowISO,
      action: 'update_employee_extra_info',
      performed_by: manager_id,
      performed_by_name: managerInfo?.full_name || 'HR Manager',
      target_employee: employee_id,
      target_employee_name: employee.full_name,
      details: { extra_info }
    });

    return c.json({ success: true, message: 'Extra info updated', employee: updatedEmployee });
  } catch (error) {
    console.error('Error updating extra info:', error);
    return c.json({ success: false, message: 'Server error' }, 500);
  }
});

/**
 * PATCH /manager/update-employee-hire-date
 * Update the hire date for an employee (requires can_edit_employee_info permission)
 */
app.patch('/update-employee-hire-date', async (c) => {
  try {
    const { manager_id, employee_id, hire_date } = await c.req.json();

    if (!manager_id || !employee_id) {
      return c.json({ success: false, message: 'Missing required fields' }, 400);
    }

    // Check permission
    const permissions = await kv.get('hr_permissions');
    if (!permissions?.can_edit_employee_info) {
      return c.json({ success: false, message: 'Permission denied: Employee info editing is not enabled by admin' }, 403);
    }

    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }

    const nowISO = new Date().toISOString();
    const previousHireDate = employee.hire_date || null;
    const updatedEmployee = {
      ...employee,
      hire_date: hire_date || null,
      updated_at: nowISO
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);

    // Log the action
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const managerInfo = await kv.get(`employee:${manager_id}`);
    await kv.set(`admin_log:${logId}`, {
      id: logId,
      timestamp: nowISO,
      action: 'update_employee_hire_date',
      performed_by: manager_id,
      performed_by_name: managerInfo?.full_name || 'HR Manager',
      target_employee: employee_id,
      target_employee_name: employee.full_name,
      details: { previous_hire_date: previousHireDate, new_hire_date: hire_date }
    });

    console.log(`✅ Hire date updated for employee ${employee_id}: ${previousHireDate} → ${hire_date} (by ${managerInfo?.full_name || manager_id})`);

    return c.json({ success: true, message: 'Hire date updated', employee: updatedEmployee });
  } catch (error) {
    console.error('Error updating hire date:', error);
    return c.json({ success: false, message: 'Server error updating hire date' }, 500);
  }
});

// NOTE: GET /contracts-expiring is intentionally NOT registered here.
// It is handled directly on the root Hono app in index.tsx
// (registered before app.route()) to avoid sub-router shadowing issues.

// ==================== MANAGER CANCEL REQUEST ====================

/**
 * POST /manager/cancel-request
 * Allows a Manager (HR) to cancel a pending or approved request for one of
 * their team members — but only when the `can_cancel_requests` permission is
 * enabled by Super Admin. Annual-leave balances are restored automatically.
 */
app.post('/cancel-request', async (c) => {
  try {
    const body = await c.req.json();
    const {
      request_id,
      manager_id,
      reason = '',
      reason_ar = '',
      manager_name = '',
      manager_name_ar = ''
    } = body;

    if (!request_id || !manager_id) {
      return c.json({ success: false, message: 'Missing required fields: request_id, manager_id' }, 400);
    }

    // 1. Verify the manager exists and has the right role
    const manager = await verifyManagerPermission(manager_id);
    if (!manager) {
      return c.json({ success: false, message: 'Unauthorized: not a valid manager account' }, 403);
    }

    // 2. Check that cancellation is permitted for managers
    const permissions = await kv.get('hr_permissions');
    if (!permissions?.can_cancel_requests) {
      return c.json({
        success: false,
        message: 'Permission denied: request cancellation is not enabled for managers. Contact the Super Admin.',
        permission_required: 'can_cancel_requests'
      }, 403);
    }

    // 3. Load the request
    const request = await kv.get(`request:${request_id}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }
    if (request.status === 'cancelled') {
      return c.json({ success: false, message: 'Request is already cancelled' }, 400);
    }
    if (!['pending', 'approved'].includes(request.status)) {
      return c.json({ success: false, message: `Cannot cancel a request with status "${request.status}"` }, 400);
    }

    const nowISO = new Date().toISOString();
    const wasApproved = request.status === 'approved';

    // 4. Restore annual-leave balance if an approved annual leave is cancelled
    let balanceRestored: number | null = null;
    if (
      wasApproved &&
      request.type === 'leave' &&
      (request.sub_type === 'annual' || request.leave_type === 'annual') &&
      request.start_date &&
      request.end_date
    ) {
      try {
        const leaveDays = calcLeaveDays(request.start_date, request.end_date);
        const fyKey = getFinancialYearKey(request.start_date);
        const balKey = `leave_balance:${request.employee_id}:${fyKey}`;
        const existing = (await kv.get(balKey)) || { used: 0, allowance: 30 };
        const newUsed = Math.max(0, (existing.used || 0) - leaveDays);
        await kv.set(balKey, { ...existing, used: newUsed, updated_at: nowISO });
        balanceRestored = leaveDays;
        console.log(`Manager cancel: restored ${leaveDays} annual leave days for employee ${request.employee_id}`);
      } catch (balErr) {
        console.error('Manager cancel: balance restore error:', balErr);
      }
    }

    // 5. Build the activity log entry
    const activityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: 'cancelled_by_admin',  // same action key so print engine handles it correctly
      performed_by: manager_id,
      performed_by_name: manager_name || manager.full_name || 'HR Manager',
      performed_by_name_ar: manager_name_ar || manager.full_name_ar || 'مدير الموارد البشرية',
      performed_by_role: manager.role || 'manager',
      timestamp: nowISO,
      notes: reason || null,
      notes_ar: reason_ar || null,
      previous_status: request.status,
      balance_restored: balanceRestored
    };

    const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];
    const updatedRequest = {
      ...request,
      status: 'cancelled',
      cancel_reason: reason || null,
      cancel_reason_ar: reason_ar || null,
      cancelled_by: manager_id,
      cancelled_by_name: manager_name || manager.full_name || 'HR Manager',
      cancelled_at: nowISO,
      updated_at: nowISO,
      activity_log: [...existingLog, activityEntry]
    };
    await kv.set(`request:${request_id}`, updatedRequest);

    // 6. Audit log
    const logId = `log_${Date.now()}_mgr_cancel`;
    await kv.set(`admin_log:${logId}`, {
      id: logId,
      timestamp: nowISO,
      action: 'manager_cancel_request',
      performed_by: manager_id,
      performed_by_name: manager_name || manager.full_name,
      performed_by_role: manager.role,
      target_employee: request.employee_id,
      request_id,
      previous_status: request.status,
      balance_restored: balanceRestored,
      reason
    });

    console.log(`Manager ${manager_id} cancelled request ${request_id}. Balance restored: ${balanceRestored}`);
    return c.json({
      success: true,
      message: 'Request cancelled successfully',
      balance_restored: balanceRestored,
      previous_status: request.status
    });
  } catch (error) {
    console.error('Manager cancel-request error:', error);
    return c.json({ success: false, message: `Server error: ${error}` }, 500);
  }
});

export default app;