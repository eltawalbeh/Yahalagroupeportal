import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv-retry.tsx';
import { sampleCompanies, sampleEmployees } from './seed.tsx';
import { sendEmail, sendEmailWithCC, emailTemplates } from './email-service.tsx';
import { generateTemporaryPassword, validatePassword, hashPassword, verifyPassword, isHashed, isLegacyHash } from './password-utils.tsx';
import {
  cascadeDeleteEmployee,
  cascadeDeleteRequest,
  cascadeDeleteAnnouncement,
  cascadeDeleteCompany,
  cascadeDeleteDocument
} from './cascade-delete.tsx';
import * as softDelete from './soft-delete.tsx';
import managerRoutes from './manager-routes.tsx';

const app = new Hono();

// ── Rate limiting (5 attempts per 15 min per identifier) ────────────────────
const _loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX    = 5;
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): boolean {
  const now   = Date.now();
  const entry = _loginAttempts.get(identifier);
  if (!entry || now > entry.resetAt) {
    _loginAttempts.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}
function clearRateLimit(identifier: string) { _loginAttempts.delete(identifier); }

// ── Strip passwords & sensitive fields before sending employee to frontend ───
function sanitizeEmployee(emp: any): any {
  if (!emp) return emp;
  const { password: _p, temporary_password: _tp, ...safe } = emp;
  return safe;
}

/** HTML-escape user-supplied strings before embedding in email templates */
function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Allowed image MIME types for profile photo uploads */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/heic', 'image/heif'
]);

// Apply middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token', 'X-Employee-Id'],
}));
app.use('*', logger(console.log));

// ── Admin session token middleware (guards ALL /admin/* routes) ───────────────
// Every request to /admin/* must include a valid X-Admin-Token header.
// Tokens are generated on admin login, stored in KV with 24h expiry.
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

app.use('/make-server-fdcde35a/admin/*', async (c, next) => {
  const token = c.req.header('X-Admin-Token');
  if (!token) {
    return c.json({
      success: false,
      message: 'Admin authentication required. Please log in as admin.',
      messageAr: 'مطلوب مصادقة المسؤول. يرجى تسجيل الدخول كمسؤول.'
    }, 401);
  }
  try {
    const session = await kv.get(`adminSession:${token}`);
    if (!session) {
      return c.json({
        success: false,
        message: 'Invalid or expired admin session. Please log in again.',
        messageAr: 'جلسة المسؤول غير صالحة أو منتهية. يرجى تسجيل الدخول مرة أخرى.'
      }, 401);
    }
    if (Date.now() > session.expires_at) {
      await kv.del(`adminSession:${token}`);
      return c.json({
        success: false,
        message: 'Admin session expired. Please log in again.',
        messageAr: 'انتهت صلاحية جلسة المسؤول. يرجى تسجيل الدخول مرة أخرى.'
      }, 401);
    }
  } catch (e) {
    console.error('Admin token validation error:', e);
    return c.json({ success: false, message: 'Error validating admin session' }, 500);
  }
  await next();
});

// Error handler middleware
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  }, 500);
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Cache for initialized buckets to avoid repeated listBuckets() calls
const initializedBuckets = new Set<string>();

// Helper function to ensure bucket exists (with caching)
async function ensureBucketExists(bucketName: string, options: any = {}) {
  // Check cache first
  if (initializedBuckets.has(bucketName)) {
    return true;
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: options.fileSizeLimit || 10485760, // Default 10MB
        ...options
      });
      console.log(`✅ Created bucket: ${bucketName}`);
    }
    
    // Add to cache
    initializedBuckets.add(bucketName);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName}:`, error);
    return false;
  }
}

// Helper to get values by prefix with proper filtering
async function getValuesByPrefix(prefix: string): Promise<any[]> {
  try {
    const values = await kv.getByPrefix(prefix);
    return values.filter(v => v && typeof v === 'object');
  } catch (error) {
    console.error(`Error in getValuesByPrefix for prefix "${prefix}":`, error);
    return [];
  }
}

// ── Workflow Helpers ──────────────────────────────────────────────────────────

/** Returns the financial year key based on hire date (anniversary-based).
 *  e.g. hire_date = 2020-03-15, today = 2026-02-23 → "2025-2026" */
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

/** Calculates number of days between two date strings (inclusive) */
function calcLeaveDays(startDate: string, endDate: string): number {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  } catch { return 1; }
}

/** Notify all Accountants when an annual leave is approved (advance payment) */
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
      console.log(`✅ Annual leave accountant email sent to: ${acc.email}`);
    }
    if (accountants.length === 0) {
      console.log('ℹ️ No accountants found to notify for annual leave');
    }
  } catch (e) {
    console.error('notifyAccountantsForAnnualLeave error:', e);
  }
}

/** Notify all Owners for exit permission (once per financial year per employee) */
async function notifyOwnerForAnnualLeave(
  employee: any, request: any, days: number, shortId: string
): Promise<{ exitPermissionIssued: boolean }> {
  try {
    const fyKey = getFinancialYearKey(employee.hire_date || new Date().toISOString());
    const exitPermKey = `exit_permission:${employee.id}:${fyKey}`;
    const alreadyIssued = await kv.get(exitPermKey);

    if (alreadyIssued) {
      // Already issued this FY → portal notification to employee only
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(`notification:${notifId}`, {
        id: notifId,
        employee_id: employee.id,
        title: 'Exit Permission — At Your Expense',
        title_ar: 'تصريح الخروج — على نفقتك الخاصة',
        message: `Your annual leave has been approved. Note: Your company-covered exit permission for financial year ${fyKey} has already been issued. Any additional exit permission will be at your own expense.`,
        message_ar: `تمت الموافقة على إجازتك السنوية. ملا��ظة: تم إصدار تصريح الخروج المغطى من قِبَل الشركة للسنة المالية ${fyKey} مسبقاً. أي تصريح خروج إضافي سيكون على نفقتك الخاصة.`,
        type: 'exit_permission_own_expense',
        read: false,
        created_at: new Date().toISOString(),
        metadata: { request_id: request.id || shortId, financial_year: fyKey }
      });
      console.log(`ℹ️ Exit permission already issued for employee ${employee.id} in FY ${fyKey} — notified employee`);
      return { exitPermissionIssued: false };
    }

    // First time this FY → email all Owners + mark as issued
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
      console.log(`✅ Exit permission email sent to owner: ${owner.email}`);
    }

    // Mark as issued
    await kv.set(exitPermKey, {
      issued_at: new Date().toISOString(),
      request_id: shortId,
      financial_year: fyKey,
      employee_id: employee.id
    });

    if (owners.length === 0) {
      console.log('ℹ️ No owners found to notify for exit permission');
    }
    return { exitPermissionIssued: true };
  } catch (e) {
    console.error('notifyOwnerForAnnualLeave error:', e);
    return { exitPermissionIssued: false };
  }
}

/** Notify Accountants for advance approval with disbursement link (CC employee) */
async function notifyAccountantsForAdvance(
  employee: any, request: any, requestId: string, approverName: string, projectUrl: string
): Promise<void> {
  try {
    // Generate disburse token (valid 30 days)
    const disburseToken = crypto.randomUUID();
    await kv.set(`advance_disburse_token:${disburseToken}`, {
      request_id: requestId,
      employee_id: employee.id,
      amount: request.amount,
      created_at: new Date().toISOString(),
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    const shortId = requestId.substring(0, 8).toUpperCase();
    const disbursementUrl = `${projectUrl}/advance/confirm-disbursement/${disburseToken}`;
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
      console.log(`✅ Advance accountant email (with CC) sent to: ${acc.email}`);
    }

    if (accountants.length === 0) {
      console.log('ℹ️ No accountants found to notify for advance');
    }
  } catch (e) {
    console.error('notifyAccountantsForAdvance error:', e);
  }
}

// Initialize storage and seed data
async function initDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Create storage buckets (using cached helper)
    await ensureBucketExists('make-fdcde35a-medical-reports', { fileSizeLimit: 10485760 });
    await ensureBucketExists('make-fdcde35a-documents', { fileSizeLimit: 10485760 });
    await ensureBucketExists('make-fdcde35a-profile-photos', { fileSizeLimit: 5242880 });
    await ensureBucketExists('make-fdcde35a-announcements', { fileSizeLimit: 5242880 });

    console.log('✅ Storage buckets initialized successfully');
    
    // Seed data if not already seeded
    await seedDatabase();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Seed database with sample data using KV store
async function seedDatabase() {
  try {
    // Check if data already exists
    const admin = await kv.get('admin:031984');
    
    if (admin) {
      console.log('Database already seeded, skipping...');
      return;
    }

    // Store admin credentials — ALWAYS hash the password, never store plaintext
    await kv.set('admin:031984', { code: '031984', password: await hashPassword('aaaa@1237') });

    // Insert sample companies
    for (const company of sampleCompanies) {
      await kv.set(`company:${company.id}`, company);
    }
    console.log('Sample companies inserted successfully');

    // Insert sample employees — hash all seed passwords at rest
    for (const employee of sampleEmployees) {
      const hashedEmployee = {
        ...employee,
        password: employee.password ? await hashPassword(employee.password) : undefined
      };
      await kv.set(`employee:${employee.id}`, hashedEmployee);
    }
    console.log('Sample employees inserted successfully');

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Database seeding error:', error);
  }
}

// Initialize on startup
initDatabase();

// Database-aware health check: never report healthy without a successful DB query.
async function checkDatabase(): Promise<boolean> {
  const { error } = await supabase
    .from('kv_store_fdcde35a')
    .select('key')
    .eq('key', '__database_healthcheck__')
    .limit(1);
  if (error) {
    console.error('Database health check failed:', error.code);
    return false;
  }
  return true;
}

app.get('/make-server-fdcde35a/health', async (c) => {
  const healthy = await checkDatabase();
  return c.json({
    success: healthy,
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  }, healthy ? 200 : 503);
});

// Cron-only health endpoint. Set CRON_HEALTH_SECRET in Supabase Edge Function secrets.
// Send it from cron-job.org in the X-Cron-Secret header, not in the URL.
app.get('/make-server-fdcde35a/cron/database-health', async (c) => {
  const expected = Deno.env.get('CRON_HEALTH_SECRET');
  if (!expected) return c.json({ success: false, status: 'not_configured' }, 503);
  if (c.req.header('X-Cron-Secret') !== expected) {
    return c.json({ success: false, status: 'unauthorized' }, 401);
  }
  const healthy = await checkDatabase();
  return c.json({
    success: healthy,
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  }, healthy ? 200 : 503);
});

// Login route - supports both employee ID and email as username
app.post('/make-server-fdcde35a/auth/login', async (c) => {
  try {
    const body = await c.req.json();

    // ── Input validation & sanitization ──────────────────────────────────────
    const id       = (String(body.id       ?? '')).trim().slice(0, 100);
    const password = (String(body.password ?? '')).slice(0, 256); // don't trim passwords
    if (!id || !password) {
      return c.json({ success: false, message: 'ID and password are required', messageAr: 'الرقم وكلمة المرور مطلوبان' }, 400);
    }

    // ── Rate limiting ────���────────────────────────────────────────────────────
    if (!checkRateLimit(id)) {
      console.warn(`Rate limit exceeded for identifier: ${id.slice(0, 6)}***`);
      return c.json({
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
        messageAr: 'عدد كبير جداً من محاولات تسجيل الدخول. يرجى المحاولة مرة أخرى بعد 15 دقيقة.'
      }, 429);
    }

    console.log(`Login attempt for identifier (truncated): ${id.slice(0, 4)}***`);

    // Check admin override first
    const admin = await kv.get(`admin:${id}`);
    if (admin && await verifyPassword(password, admin.password)) {
      // Auto-upgrade legacy plaintext or v1-hashed admin password to v2
      if (!isHashed(admin.password) || isLegacyHash(admin.password)) {
        try {
          admin.password = await hashPassword(password);
          await kv.set(`admin:${id}`, admin);
          console.log('Admin password upgraded to PBKDF2v2');
        } catch (e) { console.error('Admin password upgrade error:', e); }
      }
      // Build admin identity from the admin record itself + any matching employee record
      const adminInfo: any = {
        id: admin.code || id,
        name: admin.name || 'Super Admin',
        name_ar: admin.name_ar || 'المسؤول الأعلى',
        role: admin.role || 'super_admin'
      };

      // Check if this admin code matches an employee with admin role (for richer identity)
      try {
        const allEmployees = await getValuesByPrefix('employee:');
        const adminEmployee = allEmployees.find((emp: any) => 
          (emp.role === 'admin' || emp.role === 'super_admin') && 
          (emp.id?.toString() === id || emp.employee_code === id || emp.iqama === id)
        );
        if (adminEmployee) {
          adminInfo.id = adminEmployee.id?.toString();
          adminInfo.name = adminEmployee.full_name || adminInfo.name;
          adminInfo.name_ar = adminEmployee.full_name_ar || adminInfo.name_ar;
          adminInfo.email = adminEmployee.email;
          adminInfo.employee_id = adminEmployee.id;
        }
      } catch (e) {
        console.log('Could not lookup admin employee record, using defaults:', e);
      }

      // Generate and store admin session token (24h expiry)
      const sessionToken = crypto.randomUUID();
      await kv.set(`adminSession:${sessionToken}`, {
        admin_id: id,
        created_at: Date.now(),
        expires_at: Date.now() + ADMIN_SESSION_TTL
      });

      clearRateLimit(id);
      return c.json({ success: true, isAdmin: true, adminInfo, token: sessionToken });
    }

    // Try to find employee by ID first
    let employee = await kv.get(`employee:${id}`);
    
    // If not found by ID, try to find by email
    if (!employee && id.includes('@')) {
      console.log('Searching employee by email:', id);
      const employees = await getValuesByPrefix('employee:');
      employee = employees.find(emp => emp.email === id);
    }
    
    if (!employee) {
      return c.json({ 
        success: false, 
        message: 'Invalid credentials',
        messageAr: 'بيانات اعتماد غير صالحة'
      }, 401);
    }

    // Check if this is first-time login (temporary password)
    if (employee.temporary_password && await verifyPassword(password, employee.temporary_password)) {
      // Auto-upgrade plaintext or v1-hashed temp password to v2
      if (!isHashed(employee.temporary_password) || isLegacyHash(employee.temporary_password)) {
        try {
          employee.temporary_password = await hashPassword(password);
          await kv.set(`employee:${employee.id}`, employee);
        } catch (e) { console.error('Temp password upgrade error:', e); }
      }
      console.log('First-time login detected for employee:', employee.id);
      clearRateLimit(id);
      return c.json({
        success: true,
        isAdmin: false,
        isFirstTimeLogin: true,
        requiresSetup: true,
        employee: {
          id: employee.id,
          name: employee.name || employee.nameEn,
          nameAr: employee.nameAr,
          email: employee.email,
          company: employee.company
        }
      });
    }

    // Check regular password
    if (!employee.password || !await verifyPassword(password, employee.password)) {
      return c.json({ 
        success: false, 
        message: 'Invalid credentials',
        messageAr: 'بيانات اعتماد غير صالحة'
      }, 401);
    }

    // Auto-upgrade legacy plaintext or v1-hashed password to PBKDF2 v2
    if (!isHashed(employee.password) || isLegacyHash(employee.password)) {
      try {
        employee.password = await hashPassword(password);
        await kv.set(`employee:${employee.id}`, employee);
        console.log('Employee password upgraded to PBKDF2v2 for:', employee.id);
      } catch (e) { console.error('Password upgrade error:', e); }
    }

    // Check if profile is completed
    if (!employee.profile_completed) {
      console.log('Profile not completed for employee:', employee.id);
      clearRateLimit(id);
      return c.json({
        success: true,
        isAdmin: false,
        isFirstTimeLogin: false,
        requiresSetup: true,
        employee: {
          id: employee.id,
          name: employee.name || employee.nameEn,
          nameAr: employee.nameAr,
          email: employee.email,
          company: employee.company
        }
      });
    }

    // Get company info
    const company = employee.company_id 
      ? await kv.get(`company:${employee.company_id}`)
      : null;

    clearRateLimit(id);
    console.log('✅ Login successful for employee:', employee.id);

    return c.json({
      success: true,
      isAdmin: false,
      isFirstTimeLogin: false,
      requiresSetup: false,
      employee: sanitizeEmployee(employee),   // ← Never send passwords to frontend
      company
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ 
      success: false, 
      message: 'Server error during login',
      messageAr: 'خطأ في الخادم أثناء تسجيل الدخول'
    }, 500);
  }
});

// Admin logout — invalidate session token server-side
app.post('/make-server-fdcde35a/auth/logout', async (c) => {
  try {
    const token = c.req.header('X-Admin-Token');
    if (token) {
      await kv.del(`adminSession:${token}`);
      console.log('Admin session invalidated server-side');
    }
    return c.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: true, message: 'Logged out' }); // Always succeed from client's perspective
  }
});

// Request password reset
app.post('/make-server-fdcde35a/auth/request-password-reset', async (c) => {
  try {
    const { employee_id } = await c.req.json();

    // Check if employee exists — use generic message to prevent ID enumeration
    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      // Return a success-like response so attackers cannot enumerate valid IDs
      return c.json({
        success: true,
        message: 'If this employee ID exists, a reset request has been submitted.',
        messageAr: 'إذا كان رقم الموظف صحيحاً، فقد تم تقديم طلب إعادة التعيين.'
      });
    }

    // Create password reset request
    const requestId = crypto.randomUUID();
    const resetRequest = {
      id: requestId,
      employee_id,
      employee_name: employee.full_name,
      employee_name_ar: employee.full_name_ar,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await kv.set(`password_reset_request:${requestId}`, resetRequest);

    return c.json({ success: true, request: resetRequest });
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json({ success: false, message: 'Server error' }, 500);
  }
});

// Get all password reset requests (admin only)
app.get('/make-server-fdcde35a/admin/password-reset-requests', async (c) => {
  try {
    console.log('Fetching password reset requests...');
    const requests = await getValuesByPrefix('password_reset_request:');
    console.log(`Found ${requests.length} total password reset requests`);
    
    const pendingRequests = requests.filter((req: any) => req && req.status === 'pending');
    console.log(`Found ${pendingRequests.length} pending password reset requests`);
    
    // Sort by created_at descending
    pendingRequests.sort((a: any, b: any) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return c.json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Error fetching requests',
      error: String(error)
    }, 500);
  }
});

// Reset employee password (admin only)
app.post('/make-server-fdcde35a/admin/reset-employee-password', async (c) => {
  try {
    const { request_id, employee_id, new_password } = await c.req.json();

    // Get employee
    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }

    // Update employee password (always store hashed)
    employee.password = await hashPassword(new_password);
    employee.temporary_password = null;
    await kv.set(`employee:${employee_id}`, employee);

    // Mark request as completed
    if (request_id) {
      const request = await kv.get(`password_reset_request:${request_id}`);
      if (request) {
        request.status = 'completed';
        request.completed_at = new Date().toISOString();
        await kv.set(`password_reset_request:${request_id}`, request);
      }
    }

    // Create notification for employee
    const notificationId = crypto.randomUUID();
    const notification = {
      id: notificationId,
      employee_id: employee.id,
      title: 'Password Reset',
      title_ar: 'إعادة تعيين كلمة المرور',
      message: 'Your password has been reset by admin. Please login with your new password.',
      message_ar: 'تم إعادة تعيين كلمة المرور من قبل المسؤول. يرجى تسجيل الدخول بكلمة المرور الجديدة.',
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    };
    await kv.set(`notification:${notificationId}`, notification);

    return c.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ success: false, message: 'Error resetting password' }, 500);
  }
});

// Delete password reset request (admin only)
app.delete('/make-server-fdcde35a/admin/password-reset-requests/:id', async (c) => {
  try {
    const requestId = c.req.param('id');

    if (!requestId) {
      return c.json({ success: false, message: 'Request ID is required' }, 400);
    }

    // Check if request exists
    const request = await kv.get(`password_reset_request:${requestId}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    // Delete request
    await kv.del(`password_reset_request:${requestId}`);

    return c.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Delete password reset request error:', error);
    return c.json({ success: false, message: 'Error deleting request' }, 500);
  }
});

// Get companies list
app.get('/make-server-fdcde35a/companies', async (c) => {
  try {
    const companyList = await getValuesByPrefix('company:');
    companyList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    return c.json({ success: true, companies: companyList });
  } catch (error) {
    console.error('Get companies error:', error);
    return c.json({ success: false, message: 'Error fetching companies' }, 500);
  }
});

// Create request
app.post('/make-server-fdcde35a/requests', async (c) => {
  try {
    const requestData = await c.req.json();
    const requestId = crypto.randomUUID();

    // Get employee information from KV store (needed for eligibility check + emails)
    const employee = await kv.get(`employee:${requestData.employee_id}`);

    // ── Annual leave eligibility check: must complete 1 year from hire date ──
    if (requestData.type === 'leave' && requestData.sub_type === 'annual' && employee?.hire_date) {
      const hireDate = new Date(employee.hire_date);
      const eligibleDate = new Date(hireDate);
      eligibleDate.setFullYear(eligibleDate.getFullYear() + 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eligibleDate.setHours(0, 0, 0, 0);
      if (today < eligibleDate) {
        const daysRemaining = Math.ceil((eligibleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`❌ Annual leave rejected for employee ${requestData.employee_id}: ${daysRemaining} days until eligible (hire: ${employee.hire_date})`);
        return c.json({
          success: false,
          message: `Annual leave is not yet available. You will be eligible on ${eligibleDate.toISOString().split('T')[0]} (${daysRemaining} days remaining). Per Saudi Labor Law Article 109, annual leave requires completing one full year of service.`,
          messageAr: `الإجازة السنوية غير متاحة بعد. ستكون مؤهلاً في ${eligibleDate.toISOString().split('T')[0]} (بقي ${daysRemaining} يوم). وفقاً للمادة 109 من نظام العمل، يتطلب استحقاق الإجازة السنوية إكمال سنة كاملة من الخدمة.`,
          code: 'ANNUAL_LEAVE_NOT_ELIGIBLE'
        }, 403);
      }
    }

    const request = {
      id: requestId,
      ...requestData,
      status: requestData.status || 'pending',
      created_at: new Date().toISOString()
    };
    
    await kv.set(`request:${requestId}`, request);

    // ── Ticket request handling ────────────────────────────────────────────────
    if (requestData.type === 'ticket') {
      const thisYear = new Date().getFullYear();
      // Annual ticket: check eligibility (1 year service) and track balance
      if (requestData.sub_type === 'annual_ticket' && employee?.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const eligibleDate = new Date(hireDate);
        eligibleDate.setFullYear(eligibleDate.getFullYear() + 1);
        const today = new Date(); today.setHours(0,0,0,0); eligibleDate.setHours(0,0,0,0);
        // Check if they already used a ticket this year
        const ticketBalKey = `ticket_balance:${requestData.employee_id}:${thisYear}`;
        const ticketBal = (await kv.get(ticketBalKey)) || { used: 0, special_case_used: 0 };
        if (ticketBal.used >= 1 && !requestData.is_special_case) {
          return c.json({
            success: false,
            message: `Annual ticket for ${thisYear} has already been used. Contact HR for special cases.`,
            messageAr: `تم استخدام التذكرة السنوية لعام ${thisYear} بالفعل. تواصل مع الموارد البشرية للحالات الخاصة.`,
            code: 'TICKET_ALREADY_USED'
          }, 403);
        }
        // If before eligibility → special case requiring Super Admin approval
        if (today < eligibleDate) {
          requestData.is_special_case = true;
          requestData.special_case_reason = 'early_ticket_before_anniversary';
          requestData.deduct_from_next_year = true;
          requestData.notes = (requestData.notes ? requestData.notes + '\n' : '') +
            `[Special Case] Ticket requested before annual eligibility date (${eligibleDate.toISOString().split('T')[0]}). Will be deducted from next year's balance.`;
        }

        // ── Set pre-booking applied flag (per financial year) ────────────────
        const fyKey = getFinancialYearKey(employee.hire_date || new Date().toISOString());
        const appliedKey = `annual_ticket_applied:${requestData.employee_id}:${fyKey}`;
        await kv.set(appliedKey, {
          applied: true,
          requestId,
          status: 'pending',
          travel_date: requestData.travel_date || requestData.start_date || null,
          return_date: requestData.return_date || requestData.end_date || null,
          destination: requestData.destination || null,
          applied_at: new Date().toISOString(),
          financial_year: fyKey,
        });
        console.log(`✅ Annual ticket applied flag set for employee ${requestData.employee_id} FY ${fyKey}`);
      }
    }

    // Request type labels for emails
    const requestTypeLabels: Record<string, {en: string, ar: string}> = {
      leave: { en: 'Leave Request', ar: 'طلب إجازة' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' },
      entry: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' },
      ticket: { en: 'Annual Ticket Request', ar: 'طلب تذكرة سنوية' },
      reentry_visa: { en: 'Re-Entry Visa Request', ar: 'طلب تأشيرة خروج وعودة' }
    };

    const typeLabel = requestTypeLabels[requestData.type] || { en: 'Request', ar: 'طلب' };

    // Format date for display
    const submittedAt = new Date(request.created_at).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build request details string
    let requestDetails = '';
    if (requestData.start_date) requestDetails += `Start: ${requestData.start_date}`;
    if (requestData.end_date) requestDetails += `, End: ${requestData.end_date}`;
    if (requestData.amount) requestDetails += `Amount: ${requestData.amount} SAR`;
    if (requestData.start_time) requestDetails += `Time: ${requestData.start_time}`;
    if (requestData.notes) requestDetails += `\nNotes: ${requestData.notes}`;

    // 1. Send confirmation email to employee
    if (employee && employee.email) {
      const employeeEmailData = {
        employeeName: employee.full_name || 'Employee',
        requestType: typeLabel.en,
        requestTypeAr: typeLabel.ar,
        requestId: requestId.substring(0, 8).toUpperCase(),
        submittedAt: submittedAt,
        portalUrl: 'https://portal.yahala.co'
      };

      // Send both English and Arabic versions
      await sendEmail(employee.email, 'requestSubmitted', employeeEmailData, 'en');
      await sendEmail(employee.email, 'requestSubmitted', employeeEmailData, 'ar');
      
      console.log(`✅ Confirmation email sent to employee: ${employee.email}`);
    }

    // 2. Send notification to manager if assigned
    if (employee && employee.manager_id) {
      const manager = await kv.get(`employee:${employee.manager_id}`);
      
      if (manager && manager.email) {
        const managerEmailData = {
          managerName: manager.full_name || 'Manager',
          employeeName: employee.full_name || 'Employee',
          requestType: typeLabel.en,
          requestTypeAr: typeLabel.ar,
          requestId: requestId.substring(0, 8).toUpperCase(),
          submittedAt: submittedAt,
          details: requestDetails,
          portalUrl: 'https://portal.yahala.co'
        };

        // Send both English and Arabic versions
        await sendEmail(manager.email, 'approvalNeeded', managerEmailData, 'en');
        await sendEmail(manager.email, 'approvalNeeded', managerEmailData, 'ar');
        
        console.log(`✅ Manager notification email sent to: ${manager.email}`);
      }

      // Create in-app notification for manager
      await supabase
        .from('notifications_fdcde35a')
        .insert({
          employee_id: employee.manager_id,
          title: `New ${typeLabel.en} from ${employee.full_name}`,
          title_ar: `${typeLabel.ar} جديد من ${employee.full_name_ar || employee.full_name}`,
          message: `${employee.full_name} has submitted a new ${requestData.type} request that requires your review.`,
          message_ar: `قام ${employee.full_name_ar || employee.full_name} بإرسال طلب ${requestData.type} جديد يحتاج إلى مراجعتك.`,
          type: 'manager_request',
          related_id: requestId,
          created_at: new Date().toISOString()
        });
    }

    // 2b. For ticket and reentry_visa: also notify HR and Super Admin directly
    if (requestData.type === 'ticket' || requestData.type === 'reentry_visa') {
      try {
        const allEmps = await getValuesByPrefix('employee:');
        const hrList = allEmps.filter((e: any) => e.can_approve_requests && !e.deleted_at && e.email);
        const shortId = requestId.substring(0, 8).toUpperCase();
        const ticketDetails = `Employee: ${employee?.full_name || 'N/A'}\nDestination: ${requestData.destination || 'N/A'}\nTravel Date: ${requestData.travel_date || 'N/A'}\nNotes: ${requestData.notes || 'N/A'}${requestData.is_special_case ? '\n⚠️ SPECIAL CASE — requires Super Admin approval' : ''}`;
        for (const hr of hrList) {
          await sendEmail(hr.email, 'approvalNeeded', {
            managerName: hr.full_name || 'HR',
            employeeName: employee?.full_name || 'Employee',
            requestType: typeLabel.en,
            requestTypeAr: typeLabel.ar,
            requestId: shortId,
            submittedAt: submittedAt,
            details: ticketDetails,
            portalUrl: 'https://portal.yahala.co'
          }, 'en');
        }
        // Also notify operations team for ticket requests (not re-entry visa only)
        if (requestData.type === 'ticket') {
          const opsConfig = (await kv.get('system_config:operations_team')) || { members: [] };
          for (const ops of (opsConfig.members || [])) {
            if (ops.email) {
              await sendEmail(ops.email, 'approvalNeeded', {
                managerName: ops.name || 'Operations',
                employeeName: employee?.full_name || 'Employee',
                requestType: typeLabel.en,
                requestTypeAr: typeLabel.ar,
                requestId: shortId,
                submittedAt: submittedAt,
                details: ticketDetails,
                portalUrl: 'https://portal.yahala.co'
              }, 'en');
            }
          }
        }
      } catch (e) {
        console.error('Error sending ticket/reentry notifications:', e);
      }
    }

    // 3. Send notification to all admins + can_approve_requests holders
    // (skip anyone already notified as the direct manager to avoid duplicate emails)
    const allEmployees = await kv.getByPrefix('employee:');
    const admins = allEmployees.filter((emp: any) =>
      (emp.role === 'admin' || emp.role === 'super_admin' || emp.can_approve_requests === true)
      && emp.email && !emp.deleted_at
      && emp.id?.toString() !== employee?.manager_id?.toString()
    );

    for (const admin of admins) {
      if (admin.email) {
        const adminEmailData = {
          managerName: admin.full_name || 'Admin',
          employeeName: employee?.full_name || 'Employee',
          requestType: typeLabel.en,
          requestTypeAr: typeLabel.ar,
          requestId: requestId.substring(0, 8).toUpperCase(),
          submittedAt: submittedAt,
          details: requestDetails,
          portalUrl: 'https://portal.yahala.co'
        };

        // Send both English and Arabic notification
        await sendEmail(admin.email, 'approvalNeeded', adminEmailData, 'en');
        await sendEmail(admin.email, 'approvalNeeded', adminEmailData, 'ar');

        console.log(`✅ Admin/HR notification email sent to: ${admin.email}`);
      }
    }

    // 4. Build activity log entry for submission
    const notificationsSent: any[] = [];
    if (employee?.email) {
      notificationsSent.push({
        type: 'email',
        recipient_name: employee.full_name || 'Employee',
        recipient_email: employee.email,
        recipient_role: 'employee',
        template: 'requestSubmitted'
      });
    }
    if (employee?.manager_id) {
      const mgr = await kv.get(`employee:${employee.manager_id}`);
      if (mgr?.email) {
        notificationsSent.push({
          type: 'email',
          recipient_name: mgr.full_name || 'Manager',
          recipient_email: mgr.email,
          recipient_role: 'manager',
          template: 'approvalNeeded'
        });
      }
      notificationsSent.push({
        type: 'in_app',
        recipient_name: mgr?.full_name || 'Manager',
        recipient_role: 'manager'
      });
    }
    for (const admin of admins) {
      if (admin.email) {
        notificationsSent.push({
          type: 'email',
          recipient_name: admin.full_name || 'Admin',
          recipient_email: admin.email,
          recipient_role: 'admin',
          template: 'approvalNeeded'
        });
      }
    }

    const activityLogEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: 'submitted',
      performed_by: requestData.employee_id?.toString(),
      performed_by_name: employee?.full_name || 'Employee',
      performed_by_name_ar: employee?.full_name_ar || employee?.full_name || 'موظف',
      performed_by_role: 'employee',
      timestamp: request.created_at,
      notes: requestData.notes || null,
      notifications_sent: notificationsSent
    };

    // Update request with activity log
    const updatedWithLog = {
      ...request,
      activity_log: [activityLogEntry]
    };
    await kv.set(`request:${requestId}`, updatedWithLog);

    return c.json({ success: true, request: updatedWithLog });
  } catch (error) {
    console.error('Create request error:', error);
    return c.json({ success: false, message: 'Error creating request' }, 500);
  }
});

// Get requests for a specific employee
app.get('/make-server-fdcde35a/requests/employee/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const requestsList = await getValuesByPrefix('request:');
    
    // Filter by employee ID (handle both string and number)
    const employeeRequests = requestsList
      .filter((req: any) => {
        return req.employee_id == employeeId || req.employee_id === parseInt(employeeId);
      })
      .sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

    console.log(`Fetching requests for employee ${employeeId}, found ${employeeRequests.length} requests`);
    return c.json({ success: true, requests: employeeRequests });
  } catch (error) {
    console.error('Get employee requests error:', error);
    return c.json({ success: false, message: 'Error fetching requests' }, 500);
  }
});

// Cancel a pending request
app.post('/make-server-fdcde35a/requests/:id/cancel', async (c) => {
  try {
    const id = c.req.param('id');
    
    const request = await kv.get(`request:${id}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ success: false, message: 'Can only cancel pending requests' }, 400);
    }

    const nowISO = new Date().toISOString();
    const emp = await kv.get(`employee:${request.employee_id}`);

    const activityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: 'cancelled',
      performed_by: request.employee_id?.toString(),
      performed_by_name: emp?.full_name || 'Employee',
      performed_by_name_ar: emp?.full_name_ar || emp?.full_name || 'موظف',
      performed_by_role: 'employee',
      timestamp: nowISO,
      notes: null,
      notifications_sent: []
    };

    const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];

    const updatedRequest = { 
      ...request, 
      status: 'cancelled',
      updated_at: nowISO,
      activity_log: [...existingLog, activityEntry]
    };
    await kv.set(`request:${id}`, updatedRequest);

    // Create notification for admin
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employee_id: 'admin',
      request_id: id,
      request_type: request.type,
      status: 'cancelled',
      message: `Employee cancelled ${request.type} request`,
      message_ar: `قام الموظف بإلغاء طلب ${request.type}`,
      timestamp: nowISO,
      read: false
    };
    await kv.set(`notification:${notification.id}`, notification);

    return c.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error('Cancel request error:', error);
    return c.json({ success: false, message: 'Error cancelling request' }, 500);
  }
});

// Delete request (admin only) - CASCADING DELETE
app.delete('/make-server-fdcde35a/admin/requests/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Use cascading delete to remove request + comments + notifications + documents
    const result = await cascadeDeleteRequest(id);
    
    return c.json({ 
      success: true,
      message: 'Request and all related data deleted successfully',
      messageAr: 'تم حذف الطلب وجميع البيانات المرتبطة بنجاح',
      deletionLog: result.deletionLog
    });
  } catch (error) {
    console.error('Delete request error:', error);
    return c.json({ 
      success: false, 
      message: 'Error deleting request',
      messageAr: 'خطأ في حذف الطلب'
    }, 500);
  }
});

// Get all requests (admin)
app.get('/make-server-fdcde35a/admin/requests', async (c) => {
  try {
    const companyId = c.req.query('company_id');
    const type = c.req.query('type');
    const status = c.req.query('status');
    const includeDeleted = c.req.query('include_deleted') === 'true';

    const allRequests = await getValuesByPrefix('request:');
    // Filter out soft-deleted records unless explicitly requested
    const requestsList = softDelete.filterDeleted(allRequests, includeDeleted);

    // Enrich with employee and company data
    const enrichedRequests = await Promise.all(
      requestsList.map(async (req) => {
        const employee = req.employee_id 
          ? await kv.get(`employee:${req.employee_id}`)
          : null;
        
        let company = null;
        if (employee && employee.company_id) {
          company = await kv.get(`company:${employee.company_id}`);
        }

        return {
          ...req,
          employees: employee ? {
            ...sanitizeEmployee(employee),
            companies: company
          } : null
        };
      })
    );

    // Apply filters
    let filteredData = enrichedRequests;

    if (type && type !== 'all') {
      filteredData = filteredData.filter(req => req.type === type);
    }

    if (status && status !== 'all') {
      filteredData = filteredData.filter(req => req.status === status);
    }

    if (companyId && companyId !== 'all') {
      filteredData = filteredData.filter(
        req => req.employees?.company_id === parseInt(companyId)
      );
    }

    // Sort by created_at descending
    filteredData.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return c.json({ success: true, requests: filteredData });
  } catch (error) {
    console.error('Get requests error:', error);
    return c.json({ success: false, message: 'Error fetching requests' }, 500);
  }
});

// Update request status (Admin action with full audit trail)
app.patch('/make-server-fdcde35a/admin/requests/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, admin_notes, admin_id, admin_name, admin_name_ar } = await c.req.json();

    const request = await kv.get(`request:${id}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    const nowISO = new Date().toISOString();
    const updatedRequest: any = { 
      ...request, 
      status,
      processed_by: admin_id || 'admin',
      processed_by_name: admin_name || 'Admin',
      processed_at: nowISO,
      updated_at: nowISO
    };
    if (admin_notes) updatedRequest.admin_notes = admin_notes;

    const statusMessages: any = {
      approved: {
        en: `Your ${request.request_type || request.type} request has been approved`,
        ar: request.type === 'leave' ? 'تمت الموافقة على طلب الإجازة الخاص بك' :
            request.type === 'advance' ? 'تمت الموافقة على طلب السلفة الخاص بك' :
            'تمت الموافقة على طلب الخروج والعودة الخاص بك'
      },
      rejected: {
        en: `Your ${request.request_type || request.type} request has been rejected`,
        ar: request.type === 'leave' ? 'تم رفض طلب الإجازة الخاص بك' :
            request.type === 'advance' ? 'تم رفض طلب السلفة الخاص بك' :
            'تم رفض طلب الخروج والعودة الخاص بك'
      }
    };

    const actionNotifications: any[] = [];

    if (status === 'approved' || status === 'rejected') {
      const employee = await kv.get(`employee:${request.employee_id}`);
      const requestTypeLabels: Record<string, {en: string, ar: string}> = {
        leave: { en: 'Leave Request', ar: 'طلب إجازة' },
        advance: { en: 'Advance Request', ar: 'طلب سلفة' },
        entry: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' }
      };
      const typeLabel = requestTypeLabels[request.type] || { en: 'Request', ar: 'طلب' };
      const approvedAt = new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      // (a) Send status email to the employee who submitted the request
      if (employee?.email) {
        const emailTemplate = status === 'approved' ? 'requestApproved' : 'requestRejected';
        const emailData = {
          employeeName: employee.full_name || 'Employee',
          requestType: typeLabel.en, requestTypeAr: typeLabel.ar,
          requestId: id.substring(0, 8).toUpperCase(),
          approverName: admin_name || 'Admin',
          approvedAt, rejectedAt: approvedAt,
          comments: admin_notes || '', reason: admin_notes || '',
          portalUrl: 'https://portal.yahala.co'
        };
        await sendEmail(employee.email, emailTemplate, emailData, 'en');
        await sendEmail(employee.email, emailTemplate, emailData, 'ar');
        console.log(`✅ ${status} email sent to employee: ${employee.email}`);
        actionNotifications.push({ type: 'email', recipient_name: employee.full_name, recipient_email: employee.email, recipient_role: 'employee', template: emailTemplate });
      }

      // In-app notification for employee
      const notif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: status === 'approved' ? 'request_approved' : 'request_rejected',
        employee_id: request.employee_id,
        title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
        message: statusMessages[status].en,
        read: false, created_at: nowISO,
        metadata: { request_id: id, request_type: request.type, status }
      };
      await kv.set(`notification:${notif.id}`, notif);
      actionNotifications.push({ type: 'in_app', recipient_name: employee?.full_name || 'Employee', recipient_role: 'employee' });

      // ── Annual Leave specific notifications ────────────────────────────────
      if (status === 'approved' && request.type === 'leave' && (request.sub_type === 'annual' || request.leave_type === 'annual')) {
        const leaveDays = calcLeaveDays(request.start_date, request.end_date);
        const shortRequestId = id.substring(0, 8).toUpperCase();
        await notifyAccountantsForAnnualLeave(employee || {}, request, leaveDays, shortRequestId);
        await notifyOwnerForAnnualLeave(employee || {}, request, leaveDays, shortRequestId);
        console.log(`✅ Annual leave workflow notifications triggered for request ${shortRequestId}`);
      }

      // ── Advance specific notifications ─────────────────────────────────────
      if (status === 'approved' && request.type === 'advance') {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const projectBaseUrl = `${supabaseUrl}/functions/v1/make-server-fdcde35a`;
        await notifyAccountantsForAdvance(
          employee || {},
          request,
          id,
          admin_name || 'Admin',
          projectBaseUrl
        );
        console.log(`✅ Advance workflow notifications triggered for request ${id.substring(0, 8).toUpperCase()}`);
      }

      // ── Update annual ticket applied flag status on approve/reject ──────────
      if (request.type === 'ticket' && request.sub_type === 'annual_ticket') {
        try {
          const empForTicket = await kv.get(`employee:${request.employee_id}`);
          if (empForTicket?.hire_date) {
            const fyKey = getFinancialYearKey(empForTicket.hire_date);
            const appliedKey = `annual_ticket_applied:${request.employee_id}:${fyKey}`;
            const existing = await kv.get(appliedKey);
            if (existing) {
              await kv.set(appliedKey, { ...existing, status });
            }
          }
        } catch (tkErr) { console.error('Error updating ticket applied flag:', tkErr); }
      }

      // ── Re-entry Visa approval (C): save return_date as reentry_visa_expiry ──
      if (status === 'approved' && request.type === 'ticket' && request.sub_type === 'reentry_visa' && request.return_date) {
        try {
          const empRecord = await kv.get(`employee:${request.employee_id}`);
          if (empRecord) {
            const extraInfo = empRecord.extra_info || {};
            extraInfo.reentry_visa_expiry = request.return_date;
            empRecord.extra_info = extraInfo;
            await kv.set(`employee:${empRecord.id}`, empRecord);
            console.log(`✅ Re-entry visa expiry saved for employee ${request.employee_id}: ${request.return_date}`);
          }
        } catch (rvErr) {
          console.error('Error saving re-entry visa expiry:', rvErr);
        }
      }

      // (b) Send confirmation to employee's manager
      if (employee?.manager_id) {
        const manager = await kv.get(`employee:${employee.manager_id}`);
        if (manager?.email) {
          const mgrData = {
            managerName: manager.full_name || 'Manager', employeeName: employee.full_name || 'Employee',
            requestType: typeLabel.en, requestTypeAr: typeLabel.ar,
            requestId: id.substring(0, 8).toUpperCase(), submittedAt: approvedAt,
            details: `Status: ${status.toUpperCase()} by ${admin_name || 'Admin'}. ${admin_notes ? 'Notes: ' + admin_notes : ''}`,
            portalUrl: 'https://portal.yahala.co'
          };
          await sendEmail(manager.email, 'approvalNeeded', mgrData, 'en');
          console.log(`✅ Manager confirmation sent to: ${manager.email}`);
          actionNotifications.push({ type: 'email', recipient_name: manager.full_name, recipient_email: manager.email, recipient_role: 'manager', template: 'approvalNeeded' });
        }
      }

      // (c) Send confirmation to all other admins + can_approve_requests holders
      const allEmployees = await kv.getByPrefix('employee:');
      const otherAdmins = allEmployees.filter((emp: any) =>
        (emp.role === 'admin' || emp.role === 'super_admin' || emp.can_approve_requests === true)
        && emp.id?.toString() !== admin_id?.toString()
        && emp.email && !emp.deleted_at
      );
      for (const oa of otherAdmins) {
        const oaData = {
          managerName: oa.full_name || 'Admin', employeeName: employee?.full_name || 'Employee',
          requestType: typeLabel.en, requestTypeAr: typeLabel.ar,
          requestId: id.substring(0, 8).toUpperCase(), submittedAt: approvedAt,
          details: `Status: ${status.toUpperCase()} by ${admin_name || 'Admin'}. ${admin_notes ? 'Notes: ' + admin_notes : ''}`,
          portalUrl: 'https://portal.yahala.co'
        };
        await sendEmail(oa.email, 'approvalNeeded', oaData, 'en');
        console.log(`✅ Admin confirmation sent to: ${oa.email}`);
        actionNotifications.push({ type: 'email', recipient_name: oa.full_name, recipient_email: oa.email, recipient_role: 'admin', template: 'approvalNeeded' });
      }
    }

    // Append activity log entry
    const activityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: status,
      performed_by: admin_id || 'admin',
      performed_by_name: admin_name || 'Admin',
      performed_by_name_ar: admin_name_ar || admin_name || 'المسؤول',
      performed_by_role: 'admin',
      timestamp: nowISO,
      notes: admin_notes || null,
      notifications_sent: actionNotifications
    };
    const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];
    updatedRequest.activity_log = [...existingLog, activityEntry];

    await kv.set(`request:${id}`, updatedRequest);
    return c.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error('Update request error:', error);
    return c.json({ success: false, message: 'Error updating request' }, 500);
  }
});

// ==================== ADMIN CANCEL REQUEST ====================
// Admins / HR can cancel BOTH pending and approved requests.
// For approved annual-leave cancellations the consumed days are restored.

app.post('/make-server-fdcde35a/admin/requests/:id/cancel', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { reason = '', reason_ar = '', cancelled_by_id = 'admin', cancelled_by_name = 'Admin', cancelled_by_name_ar = 'المسؤول' } = body;

    const request = await kv.get(`request:${id}`);
    if (!request) return c.json({ success: false, message: 'Request not found' }, 404);
    if (request.status === 'cancelled') return c.json({ success: false, message: 'Request is already cancelled' }, 400);
    if (!['pending', 'approved'].includes(request.status)) {
      return c.json({ success: false, message: `Cannot cancel a request with status "${request.status}". Only pending or approved requests can be cancelled.` }, 400);
    }

    const nowISO = new Date().toISOString();
    const wasApproved = request.status === 'approved';

    // Restore annual-leave balance if an approved leave is cancelled
    let balanceRestored: number | null = null;
    if (wasApproved && request.type === 'leave' && (request.sub_type === 'annual' || request.leave_type === 'annual') && request.start_date && request.end_date) {
      try {
        const leaveDays = calcLeaveDays(request.start_date, request.end_date);
        const fyKey = getFinancialYearKey(request.start_date);
        const balKey = `leave_balance:${request.employee_id}:${fyKey}`;
        const existing = (await kv.get(balKey)) || { used: 0, allowance: 30 };
        const newUsed = Math.max(0, (existing.used || 0) - leaveDays);
        await kv.set(balKey, { ...existing, used: newUsed, updated_at: nowISO });
        balanceRestored = leaveDays;
        console.log(`✅ Restored ${leaveDays} leave day(s) for employee ${request.employee_id}`);
      } catch (balErr) {
        console.error('Error restoring leave balance:', balErr);
      }
    }

    const activityEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: 'cancelled_by_admin',
      performed_by: cancelled_by_id,
      performed_by_name: cancelled_by_name,
      performed_by_name_ar: cancelled_by_name_ar,
      performed_by_role: 'admin',
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
      cancelled_by: cancelled_by_id,
      cancelled_by_name,
      cancelled_at: nowISO,
      updated_at: nowISO,
      activity_log: [...existingLog, activityEntry]
    };
    await kv.set(`request:${id}`, updatedRequest);

    // Notify the employee
    try {
      const employee = await kv.get(`employee:${request.employee_id}`);
      if (employee?.email) {
        const requestTypeLabels: Record<string, { en: string; ar: string }> = {
          leave: { en: 'Leave Request', ar: 'طلب إجازة' },
          advance: { en: 'Advance Request', ar: 'طلب سلفة' },
          entry: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' }
        };
        const typeLabel = requestTypeLabels[request.type] || { en: 'Request', ar: 'طلب' };
        const cancelledAt = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        await sendEmail(employee.email, 'requestRejected', {
          employeeName: employee.full_name || 'Employee',
          requestType: typeLabel.en, requestTypeAr: typeLabel.ar,
          requestId: id.substring(0, 8).toUpperCase(),
          approverName: cancelled_by_name,
          rejectedAt: cancelledAt,
          reason: reason || (wasApproved ? 'Approved leave cancelled by HR' : 'Request cancelled by HR'),
          portalUrl: 'https://portal.yahala.co'
        }, 'en');
      }
      // In-app notification
      const notif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'request_cancelled',
        employee_id: request.employee_id,
        title: 'Request Cancelled', title_ar: 'تم إلغاء الطلب',
        message: `Your ${request.type} request has been cancelled by HR.${reason ? ' Reason: ' + reason : ''}`,
        message_ar: `تم إلغاء الطلب من قِبل شؤون الموظفين.${reason_ar ? ' السبب: ' + reason_ar : ''}`,
        read: false, created_at: nowISO,
        metadata: { request_id: id, request_type: request.type, previous_status: request.status }
      };
      await kv.set(`notification:${notif.id}`, notif);
    } catch (notifErr) {
      console.error('Error sending cancellation notification:', notifErr);
    }

    return c.json({
      success: true,
      request: updatedRequest,
      balance_restored: balanceRestored,
      message: wasApproved
        ? `Request cancelled.${balanceRestored ? ` ${balanceRestored} leave day(s) restored to balance.` : ''}`
        : 'Pending request cancelled successfully.'
    });
  } catch (error) {
    console.error('Admin cancel request error:', error);
    return c.json({ success: false, message: `Error cancelling request: ${error.message}` }, 500);
  }
});

// ── GET /admin/requests/employee/:employeeId ────────────────────────────────
// All requests for a specific employee (used by HR history & print view)
app.get('/make-server-fdcde35a/admin/requests/employee/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const allRequests = await getValuesByPrefix('request:');
    const empRequests = allRequests
      .filter((r: any) => r && r.employee_id?.toString() === employeeId.toString())
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const employee = await kv.get(`employee:${employeeId}`);
    let company: any = null;
    if (employee?.company_id) company = await kv.get(`company:${employee.company_id}`);

    return c.json({
      success: true,
      requests: empRequests,
      employee: employee ? sanitizeEmployee(employee) : null,
      company: company || null,
      total: empRequests.length
    });
  } catch (error) {
    console.error('Admin employee requests error:', error);
    return c.json({ success: false, message: `Error fetching employee requests: ${error.message}` }, 500);
  }
});

// ==================== LEAVE BALANCE MANAGEMENT ====================

// GET /admin/leave-balances/:employeeId — Calculate + return leave balances for an employee
app.get('/make-server-fdcde35a/admin/leave-balances/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const employee = await kv.get(`employee:${employeeId}`);
    if (!employee) return c.json({ success: false, message: 'Employee not found' }, 404);

    const hireDateStr = employee.hire_date || new Date().toISOString();
    const fyKey = getFinancialYearKey(hireDateStr);

    // Compute the exact start/end dates of the current financial year (anniversary-based)
    const hireDate = new Date(hireDateStr);
    const today = new Date();
    const anniversaryThisYear = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate());
    const fyStartDate = today >= anniversaryThisYear
      ? new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate())
      : new Date(today.getFullYear() - 1, hireDate.getMonth(), hireDate.getDate());
    const fyEndDate = new Date(fyStartDate);
    fyEndDate.setFullYear(fyEndDate.getFullYear() + 1);

    const allRequests = await getValuesByPrefix('request:');
    const empRequests = allRequests.filter((r: any) =>
      r && r.employee_id?.toString() === employeeId.toString() && r.type === 'leave'
    );

    const calcDaysForType = (subType: string, status: string) =>
      empRequests
        .filter((r: any) => {
          if (r.sub_type !== subType || r.status !== status) return false;
          // Use start_date for leave period classification; fall back to created_at
          const refDateStr = r.start_date || r.created_at;
          const refDate = new Date(refDateStr);
          return refDate >= fyStartDate && refDate < fyEndDate;
        })
        .reduce((acc: number, r: any) => {
          if (!r.start_date || !r.end_date) return acc;
          return acc + calcLeaveDays(r.start_date, r.end_date);
        }, 0);

    const adjustmentKey = `leave_adjustments:${employeeId}:${fyKey}`;
    const adjustments = (await kv.get(adjustmentKey)) || {};

    const DEFAULTS: Record<string, number> = { annual: 30, sick: 14, emergency: 5, unpaid: 30 };
    const leaveTypes = ['annual', 'sick', 'emergency', 'unpaid'];

    const balances: any = {};
    for (const type of leaveTypes) {
      const adj = adjustments[type] || { amount: 0, notes: [], history: [] };
      const allowance = DEFAULTS[type];
      const approved = calcDaysForType(type, 'approved');
      const pending = calcDaysForType(type, 'pending');
      const cancelled = calcDaysForType(type, 'cancelled');
      const adjustment = typeof adj.amount === 'number' ? adj.amount : 0;
      const available = Math.max(0, allowance + adjustment - approved - pending);

      balances[type] = { allowance, approved, pending, cancelled, adjustment, adjustmentHistory: adj.history || [], available };
    }

    let annualEligible = true;
    let eligibleDate: string | null = null;
    if (employee.hire_date) {
      const hire = new Date(employee.hire_date);
      const elig = new Date(hire);
      elig.setFullYear(elig.getFullYear() + 1);
      const today = new Date(); today.setHours(0,0,0,0); elig.setHours(0,0,0,0);
      annualEligible = today >= elig;
      if (!annualEligible) eligibleDate = elig.toISOString().split('T')[0];
    }

    return c.json({ success: true, employee: sanitizeEmployee(employee), financialYear: fyKey, annualEligible, eligibleDate, balances });
  } catch (error) {
    console.error('Leave balance fetch error:', error);
    return c.json({ success: false, message: `Error fetching leave balances: ${error.message}` }, 500);
  }
});

// PATCH /admin/leave-balances/:employeeId — HR override / adjust a leave balance
app.patch('/make-server-fdcde35a/admin/leave-balances/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const { leaveType, adjustmentDays, reason, reasonAr, adjustedBy } = await c.req.json();

    if (!leaveType || adjustmentDays === undefined || adjustmentDays === null) {
      return c.json({ success: false, message: 'leaveType and adjustmentDays are required' }, 400);
    }
    if (!['annual', 'sick', 'emergency', 'unpaid'].includes(leaveType)) {
      return c.json({ success: false, message: 'Invalid leave type' }, 400);
    }

    const employee = await kv.get(`employee:${employeeId}`);
    if (!employee) return c.json({ success: false, message: 'Employee not found' }, 404);

    const fyKey = getFinancialYearKey(employee.hire_date || new Date().toISOString());
    const adjustmentKey = `leave_adjustments:${employeeId}:${fyKey}`;
    const adjustments = (await kv.get(adjustmentKey)) || {};

    const current = adjustments[leaveType] || { amount: 0, notes: [], history: [] };
    const historyEntry = {
      id: crypto.randomUUID(),
      previousAmount: current.amount,
      newAmount: adjustmentDays,
      reason: reason || '',
      reasonAr: reasonAr || '',
      adjustedBy: adjustedBy || 'HR',
      timestamp: new Date().toISOString(),
    };

    adjustments[leaveType] = {
      amount: adjustmentDays,
      notes: reason ? [reason] : current.notes || [],
      history: [...(current.history || []), historyEntry],
    };

    await kv.set(adjustmentKey, adjustments);
    console.log(`✅ Leave balance adjusted for employee ${employeeId}: ${leaveType} → ${adjustmentDays} days (by ${adjustedBy})`);

    return c.json({ success: true, message: `${leaveType} balance adjusted by ${adjustmentDays} days`, adjustment: adjustments[leaveType] });
  } catch (error) {
    console.error('Leave balance adjustment error:', error);
    return c.json({ success: false, message: `Error adjusting leave balance: ${error.message}` }, 500);
  }
});

// ── GET /employee/:id/annual-ticket-status ────────────────────────────────
// Check if an employee has already applied for their annual ticket this FY.
// Called by the employee portal after an annual leave is submitted.
app.get('/make-server-fdcde35a/employee/:id/annual-ticket-status', async (c) => {
  try {
    const employeeId = c.req.param('id');
    const yearParam = c.req.query('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Primary check: look up the pre-booking applied flag stored by FY key
    const employee = await kv.get(`employee:${employeeId}`);
    const fyKey = employee?.hire_date
      ? getFinancialYearKey(employee.hire_date)
      : `${year}-${year + 1}`;

    const appliedFlag = await kv.get(`annual_ticket_applied:${employeeId}:${fyKey}`);
    if (appliedFlag?.applied) {
      // Sync the live status from the actual request
      const req = appliedFlag.requestId ? await kv.get(`request:${appliedFlag.requestId}`) : null;
      const liveStatus = req?.status || appliedFlag.status || 'pending';
      // If the request was rejected/cancelled, allow the employee to re-apply
      if (liveStatus === 'rejected' || liveStatus === 'cancelled') {
        return c.json({ applied: false, previousStatus: liveStatus });
      }
      return c.json({ applied: true, requestId: appliedFlag.requestId, status: liveStatus });
    }

    // Fallback: scan requests to find any active annual_ticket request for this year
    const allRequests = await getValuesByPrefix('request:');
    const ticketReqs = allRequests.filter((r: any) =>
      r.employee_id?.toString() === employeeId.toString() &&
      r.type === 'ticket' &&
      r.sub_type === 'annual_ticket' &&
      !['rejected', 'cancelled'].includes(r.status)
    );

    // Filter by year (travel_date or created_at)
    const thisYearReqs = ticketReqs.filter((r: any) => {
      const refDate = r.travel_date || r.start_date || r.created_at;
      return refDate && new Date(refDate).getFullYear() === year;
    });

    if (thisYearReqs.length > 0) {
      const latest = thisYearReqs.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      return c.json({ applied: true, requestId: latest.id, status: latest.status });
    }

    return c.json({ applied: false });
  } catch (error) {
    console.error('Annual ticket status error:', error);
    return c.json({ applied: false, error: String(error) });
  }
});

// ── GET /admin/check-anniversary-balances ─────────────────────────────────
// Auto-credits annual leave balance on each employee's hire anniversary.
// Triggered on admin login alongside contract-alert check (fire-and-forget).
app.get('/make-server-fdcde35a/admin/check-anniversary-balances', async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const allEmployees = await getValuesByPrefix('employee:');
    const credited: any[] = [];
    const skipped: any[] = [];

    for (const emp of allEmployees) {
      if (!emp.hire_date || emp.deleted_at || emp.status === 'inactive') continue;

      const hire = new Date(emp.hire_date);
      // Must have completed at least 1 year
      const oneYearDate = new Date(hire);
      oneYearDate.setFullYear(oneYearDate.getFullYear() + 1);
      if (today < oneYearDate) continue;

      // Check if today is the anniversary (month-day match)
      const hireMD = `${String(hire.getMonth() + 1).padStart(2, '0')}-${String(hire.getDate()).padStart(2, '0')}`;
      if (hireMD !== todayMD) continue;

      // Compute the NEW financial year that starts today
      const newFyStart = today.getFullYear();
      const newFyKey = `${newFyStart}-${newFyStart + 1}`;

      // Check if we already auto-credited this FY to avoid double-credit
      const creditedKey = `leave_auto_credit:${emp.id}:${newFyKey}`;
      const alreadyCredited = await kv.get(creditedKey);
      if (alreadyCredited) {
        skipped.push({ id: emp.id, name: emp.full_name, reason: 'already_credited', fy: newFyKey });
        continue;
      }

      // Company policy: all employees who have completed 1+ year of service receive 30 days.
      // (Exceeds Saudi Labor Law Article 109 minimum — internal policy overrides the statutory 21-day tier.)
      const yearsOfService = Math.floor((today.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const annualAllowance = 30;

      // Write the leave balance record for the new FY
      const balKey = `leave_balance:${emp.id}:${newFyKey}`;
      const existing = (await kv.get(balKey)) || {};
      await kv.set(balKey, {
        ...existing,
        allowance: annualAllowance,
        auto_credited: true,
        credited_at: new Date().toISOString(),
        years_of_service: yearsOfService,
        financial_year: newFyKey,
      });

      // Mark as credited
      await kv.set(creditedKey, {
        credited_at: new Date().toISOString(),
        allowance: annualAllowance,
        years_of_service: yearsOfService,
        financial_year: newFyKey,
      });

      // Send in-app notification to employee
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(`notification:${notifId}`, {
        id: notifId,
        employee_id: emp.id,
        type: 'annual_leave_credited',
        title: 'Annual Leave Balance Credited',
        title_ar: 'تم إضافة رصيد الإجازة السنوية',
        message: `Your annual leave balance of ${annualAllowance} days has been credited for ${newFyKey} (${yearsOfService} years of service).`,
        message_ar: `تم إضافة رصيد إجازتك السنوية البالغ ${annualAllowance} يوماً للسنة المالية ${newFyKey} (${yearsOfService} سنوات خدمة).`,
        read: false,
        created_at: new Date().toISOString(),
        metadata: { financial_year: newFyKey, allowance: annualAllowance, years_of_service: yearsOfService },
      });

      credited.push({ id: emp.id, name: emp.full_name, allowance: annualAllowance, years_of_service: yearsOfService, fy: newFyKey });
      console.log(`✅ Anniversary balance auto-credited for ${emp.full_name} (ID ${emp.id}): ${annualAllowance} days for FY ${newFyKey}`);
    }

    return c.json({
      success: true,
      date_checked: today.toISOString().split('T')[0],
      credited,
      skipped,
      credited_count: credited.length,
    });
  } catch (error) {
    console.error('Anniversary balance check error:', error);
    return c.json({ success: false, message: `Error checking anniversary balances: ${error}` }, 500);
  }
});

// ==================== RESEND EMAIL NOTIFICATION ====================

// Resend email notifications for an approved/rejected request
app.post('/make-server-fdcde35a/admin/requests/:id/resend-email', async (c) => {
  try {
    const id = c.req.param('id');
    const { recipients, admin_id, admin_name, admin_name_ar } = await c.req.json();
    // recipients: array of 'employee' | 'manager' | 'admin'

    console.log(`Resend email request for request ${id}, recipients: ${JSON.stringify(recipients)}`);

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
      entry: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' }
    };
    const typeLabel = requestTypeLabels[request.type] || { en: 'Request', ar: 'طلب' };
    const processedAt = request.processed_at
      ? new Date(request.processed_at).toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : new Date().toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

    const emailResults: Array<{ recipient: string; email: string; role: string; success: boolean }> = [];

    // Determine the correct email template based on actual request status
    const emailTemplate = request.status === 'approved' ? 'requestApproved' : 'requestRejected';
    const deciderName = request.processed_by_name || admin_name || 'Admin';

    // Shared email data for the actual decision notification
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

    // (1) Resend to employee — the decision notification (approved/rejected)
    if (recipients.includes('employee') && employee?.email) {
      const emailData = {
        ...baseEmailData,
        employeeName: employee.full_name || employee.nameEn || 'Employee',
        comments: request.admin_notes || '',
        reason: request.admin_notes || ''
      };
      const enResult = await sendEmail(employee.email, emailTemplate, emailData, 'en');
      const arResult = await sendEmail(employee.email, emailTemplate, emailData, 'ar');
      emailResults.push({
        recipient: employee.full_name || employee.nameEn || 'Employee',
        email: employee.email,
        role: 'employee',
        success: enResult || arResult
      });
      console.log(`Resend ${request.status} notification to employee ${employee.email}: ${enResult || arResult ? 'OK' : 'FAIL'}`);
    }

    // (2) Resend to manager — same decision notification with employee context
    if (recipients.includes('manager') && employee?.manager_id) {
      const manager = await kv.get(`employee:${employee.manager_id}`);
      if (manager?.email) {
        const employeeFullName = employee.full_name || employee.nameEn || 'Employee';
        const mgrEmailData = {
          ...baseEmailData,
          employeeName: manager.full_name || manager.nameEn || 'Manager',
          comments: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || ''}`.trim(),
          reason: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || ''}`.trim()
        };
        const enResult = await sendEmail(manager.email, emailTemplate, mgrEmailData, 'en');
        const arResult = await sendEmail(manager.email, emailTemplate, mgrEmailData, 'ar');
        emailResults.push({
          recipient: manager.full_name || manager.nameEn || 'Manager',
          email: manager.email,
          role: 'manager',
          success: enResult || arResult
        });
        console.log(`Resend ${request.status} notification to manager ${manager.email}: ${enResult || arResult ? 'OK' : 'FAIL'}`);
      }
    }

    // (3) Resend to admin(s) — includes role-based admins AND can_approve_requests holders
    if (recipients.includes('admin')) {
      const allEmployees = await getValuesByPrefix('employee:');
      const admins = allEmployees.filter((emp: any) =>
        (emp.role === 'admin' || emp.role === 'super_admin' || emp.can_approve_requests === true)
        && emp.email && !emp.deleted_at
      );
      const employeeFullName = employee?.full_name || employee?.nameEn || 'Employee';
      for (const adm of admins) {
        const admEmailData = {
          ...baseEmailData,
          employeeName: adm.full_name || adm.nameEn || 'Admin',
          comments: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || ''}`.trim(),
          reason: `[Re: ${employeeFullName}'s ${typeLabel.en}] ${request.admin_notes || ''}`.trim()
        };
        const enResult = await sendEmail(adm.email, emailTemplate, admEmailData, 'en');
        const arResult = await sendEmail(adm.email, emailTemplate, admEmailData, 'ar');
        emailResults.push({
          recipient: adm.full_name || adm.nameEn || 'Admin',
          email: adm.email,
          role: 'admin',
          success: enResult || arResult
        });
        console.log(`Resend ${request.status} notification to admin ${adm.email}: ${enResult || arResult ? 'OK' : 'FAIL'}`);
      }
    }

    // Append activity log entry for the resend
    const nowISO = new Date().toISOString();
    const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];
    existingLog.push({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      action: 'email_resent',
      performed_by: admin_id || 'admin',
      performed_by_name: admin_name || 'Admin',
      performed_by_name_ar: admin_name_ar || admin_name || 'المسؤول',
      performed_by_role: 'admin',
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
    console.error('Resend email error:', error);
    return c.json({ success: false, message: `Error resending emails: ${error.message}` }, 500);
  }
});

// Update employee profile
app.patch('/make-server-fdcde35a/employee/profile', async (c) => {
  try {
    const { employee_id, full_name, full_name_ar, phone, email } = await c.req.json();
    
    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }

    const updatedEmployee = {
      ...employee,
      full_name,
      full_name_ar: full_name_ar || null,
      phone: phone || null,
      email: email || null
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);
    return c.json({ success: true, employee: sanitizeEmployee(updatedEmployee) });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ success: false, message: 'Error updating profile' }, 500);
  }
});

// Change employee password
app.post('/make-server-fdcde35a/employee/change-password', async (c) => {
  try {
    const { employee_id, current_password, new_password } = await c.req.json();
    
    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }

    if (!employee.password || !await verifyPassword(current_password, employee.password)) {
      return c.json({ success: false, message: 'Current password is incorrect' }, 400);
    }

    const updatedEmployee = {
      ...employee,
      password: await hashPassword(new_password)
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);
    return c.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ success: false, message: 'Error changing password' }, 500);
  }
});

// Get leave calendar events (admin)
// Shows BOTH approved and pending leaves so HR/Admin can see the full picture.
// Rejected, cancelled, and other terminal statuses are excluded.
app.get('/make-server-fdcde35a/admin/leave-calendar', async (c) => {
  try {
    const requestsList = await getValuesByPrefix('request:');

    // Whitelist: only active leave statuses appear on the calendar
    const ACTIVE_STATUSES = new Set(['approved', 'pending']);
    const leaveRequests = requestsList.filter((req: any) =>
      req.type === 'leave' && ACTIVE_STATUSES.has(req.status)
    );

    // Enrich with employee and company data
    const events = await Promise.all(
      leaveRequests.map(async (req: any) => {
        const employee = req.employee_id
          ? await kv.get(`employee:${req.employee_id}`)
          : null;

        let company = null;
        if (employee && employee.company_id) {
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
          status: req.status,   // ← always include so frontend can style pending vs approved
        };
      })
    );

    return c.json({ success: true, events });
  } catch (error) {
    console.error('Get leave calendar error:', error);
    return c.json({ success: false, message: 'Error fetching leave calendar' }, 500);
  }
});

// Get all employees (admin)
app.get('/make-server-fdcde35a/admin/employees', async (c) => {
  try {
    const includeDeleted = c.req.query('include_deleted') === 'true';
    const allEmployees = await getValuesByPrefix('employee:');
    const employeesList = softDelete.filterDeleted(allEmployees, includeDeleted);
    
    // Enrich with company data — strip password fields before sending to client
    const enrichedEmployees = await Promise.all(
      employeesList.map(async (employee) => {
        const company = employee.company_id 
          ? await kv.get(`company:${employee.company_id}`)
          : null;
        
        return {
          ...sanitizeEmployee(employee),
          companies: company
        };
      })
    );

    // Sort by ID
    enrichedEmployees.sort((a, b) => (a.id || 0) - (b.id || 0));

    return c.json({ success: true, employees: enrichedEmployees });
  } catch (error) {
    console.error('Get employees error:', error);
    return c.json({ success: false, message: 'Error fetching employees' }, 500);
  }
});

// Create employee with invitation email
app.post('/make-server-fdcde35a/admin/employees', async (c) => {
  try {
    const employeeData = await c.req.json();
    
    console.log('Creating employee:', employeeData);
    
    // Check if employee ID already exists
    const existing = await kv.get(`employee:${employeeData.id}`);
    if (existing) {
      return c.json({ 
        success: false, 
        message: 'Employee ID already exists',
        messageAr: 'رقم الموظف موجود بالفعل'
      }, 400);
    }

    // Check if email already exists
    if (employeeData.email) {
      const employees = await getValuesByPrefix('employee:');
      const emailExists = employees.some(emp => emp.email === employeeData.email);
      if (emailExists) {
        return c.json({ 
          success: false, 
          message: 'Email already exists',
          messageAr: 'البريد ال��لكتروني موجود بالفعل'
        }, 400);
      }
    }

    // Check if skip setup (password provided by admin)
    const skipSetup = !!employeeData.password;
    
    let newEmployee;
    let temporaryPassword;
    
    if (skipSetup) {
      // Admin provided password - skip first-time setup
      console.log('Skip setup mode: Admin provided password');
      newEmployee = {
        ...employeeData,
        password: employeeData.password,
        is_first_time_login: false,
        profile_completed: true,
        temporary_password: null,
        profile_completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
    } else {
      // Generate temporary password and require first-time setup
      console.log('Standard mode: Generating temporary password and invitation');
      temporaryPassword = generateTemporaryPassword();
      
      newEmployee = {
        ...employeeData,
        temporary_password: temporaryPassword,
        is_first_time_login: true,
        profile_completed: false,
        created_at: new Date().toISOString()
      };
    }

    await kv.set(`employee:${employeeData.id}`, newEmployee);
    
    // Send invitation email only if NOT skipping setup
    if (!skipSetup && employeeData.email) {
      console.log('Sending invitation email to:', employeeData.email);
      
      // Get company information for the email
      const company = employeeData.company_id 
        ? await kv.get(`company:${employeeData.company_id}`)
        : null;
      
      const emailData = {
        employeeName: employeeData.full_name || employeeData.name || employeeData.nameEn,
        employeeNameAr: employeeData.full_name_ar || employeeData.nameAr,
        employeeId: employeeData.id,
        email: employeeData.email,
        temporaryPassword: temporaryPassword,
        company: company?.name || 'Ya Hala Group',
        companyAr: company?.name === 'Ya Hala for Travel & Tours' ? 'يا هلا للسفر والسياحة' : 'الاتحاد للسياحة والسفر',
        position: employeeData.position || 'Employee',
        positionAr: employeeData.position_ar || employeeData.positionAr || 'موظ��',
        portalUrl: 'https://portal.yahala.co'
      };
      
      // Send in both languages (or based on preference)
      const emailSent = await sendEmail(
        employeeData.email,
        'employeeInvitation',
        emailData,
        'en'
      );
      
      // Also send Arabic version
      await sendEmail(
        employeeData.email,
        'employeeInvitation',
        emailData,
        'ar'
      );
      
      if (emailSent) {
        console.log('✅ Invitation email sent successfully');
      } else {
        console.log('⚠️ Failed to send invitation email, but employee was created');
      }
    }
    
    // Don't return the password to the frontend
    const { temporary_password, password, ...employeeResponse } = newEmployee;
    
    const message = skipSetup
      ? 'Employee created successfully with immediate access'
      : 'Employee created and invitation email sent';
    const messageAr = skipSetup
      ? 'تم إنشاء الموظف بنجاح مع إمكانية الوصول الفوري'
      : 'تم إنشاء الموظف وإرسال بريد الدعوة';
    
    return c.json({ 
      success: true, 
      employee: employeeResponse,
      message,
      messageAr
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return c.json({ 
      success: false, 
      message: `Error creating employee: ${error.message}`,
      messageAr: `خطأ في إنشاء الموظف: ${error.message}`
    }, 500);
  }
});

// Update employee (admin)
app.patch('/make-server-fdcde35a/admin/employees/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    console.log('Updating employee:', id, updates);
    
    // Get existing employee
    const employee = await kv.get(`employee:${id}`);
    if (!employee) {
      return c.json({ 
        success: false, 
        message: 'Employee not found',
        messageAr: 'لم يتم العثور على الموظف'
      }, 404);
    }

    // Check if email is being updated and if it already exists
    if (updates.email && updates.email !== employee.email) {
      const employees = await getValuesByPrefix('employee:');
      const emailExists = employees.some(emp => emp.email === updates.email && emp.id !== parseInt(id));
      if (emailExists) {
        return c.json({ 
          success: false, 
          message: 'Email already exists',
          messageAr: 'البريد الإلكتروني موجود بالفعل'
        }, 400);
      }
    }

    // Update employee in KV store — deep merge extra_info
    const mergedExtraInfo = updates.extra_info
      ? { ...(employee.extra_info || {}), ...updates.extra_info }
      : employee.extra_info;

    const updatedEmployee = {
      ...employee,
      ...updates,
      extra_info: mergedExtraInfo,
      id: parseInt(id), // Ensure ID doesn't change
      updated_at: new Date().toISOString()
    };

    await kv.set(`employee:${id}`, updatedEmployee);

    return c.json({ 
      success: true, 
      employee: sanitizeEmployee(updatedEmployee),
      message: 'Employee updated successfully',
      messageAr: 'تم تحديث الموظف بنجاح'
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return c.json({ 
      success: false, 
      message: 'Error updating employee',
      messageAr: 'خطأ في تحديث الموظف'
    }, 500);
  }
});

// Delete employee (admin) - SOFT DELETE by default, HARD DELETE with parameter
app.delete('/make-server-fdcde35a/admin/employees/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const permanent = c.req.query('permanent') === 'true';
    const deletedBy = c.req.query('deleted_by') || 'admin';
    const reason = c.req.query('reason');
    
    if (permanent) {
      // Hard delete - Use cascading delete to remove EVERYTHING
      const result = await cascadeDeleteEmployee(id);
      
      return c.json({ 
        success: true, 
        message: 'Employee and all related data permanently deleted',
        messageAr: 'تم حذف الموظف وجميع البيانات المرتبطة نهائياً',
        deletionLog: result.deletionLog,
        type: 'permanent'
      });
    } else {
      // Soft delete - Just mark as deleted
      const result = await softDelete.softDelete(`employee:${id}`, deletedBy, reason || 'Deleted by admin');
      
      if (!result.success) {
        return c.json({ 
          success: false, 
          message: result.message,
          messageAr: 'فشل حذف الموظف'
        }, 400);
      }
      
      return c.json({ 
        success: true, 
        message: 'Employee soft deleted successfully (can be restored)',
        messageAr: 'تم حذف الموظف مؤقتاً (يمكن استعادته)',
        type: 'soft',
        canRestore: true
      });
    }
  } catch (error) {
    console.error('Delete employee error:', error);
    return c.json({ 
      success: false, 
      message: `Error deleting employee: ${error.message}`,
      messageAr: `خطأ في حذف الموظف: ${error.message}`
    }, 500);
  }
});

// First-time login: Change password
app.post('/make-server-fdcde35a/employee/change-password-first-time', async (c) => {
  try {
    const { employee_id, current_password, new_password } = await c.req.json();
    
    console.log('First-time password change for employee:', employee_id);
    
    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ 
        success: false, 
        message: 'Employee not found',
        messageAr: 'الموظف غير موجود'
      }, 404);
    }

    // Verify current (temporary) password
    if (!employee.temporary_password || !await verifyPassword(current_password, employee.temporary_password)) {
      return c.json({ 
        success: false, 
        message: 'Current password is incorrect',
        messageAr: 'كلمة المرور الحالية غير صحيحة'
      }, 400);
    }

    // Validate new password
    const validation = validatePassword(new_password);
    if (!validation.valid) {
      return c.json({ 
        success: false, 
        message: validation.message,
        messageAr: validation.messageAr
      }, 400);
    }

    // Update employee with new HASHED password
    const updatedEmployee = {
      ...employee,
      password: await hashPassword(new_password),
      temporary_password: null, // Clear temporary password
      password_changed_at: new Date().toISOString()
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);
    
    console.log('✅ Password changed successfully for employee:', employee_id);
    
    return c.json({ 
      success: true,
      message: 'Password changed successfully',
      messageAr: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('First-time password change error:', error);
    return c.json({ 
      success: false, 
      message: `Error changing password: ${error.message}`,
      messageAr: `خطأ في تغيير كلمة المرور: ${error.message}`
    }, 500);
  }
});

// Upload profile photo
app.post('/make-server-fdcde35a/employee/upload-profile-photo', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employee_id') as string;
    
    if (!file || !employeeId) {
      return c.json({ 
        success: false, 
        message: 'File and employee_id are required',
        messageAr: 'الملف ورقم الموظف مطلوبان'
      }, 400);
    }

    // ── MIME type validation — only allow images ──────────────────────────
    const mimeType = file.type?.toLowerCase() || '';
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return c.json({
        success: false,
        message: `Invalid file type: "${mimeType}". Only image files are allowed (JPEG, PNG, GIF, WebP).`,
        messageAr: `نوع الملف غير صالح. يُسمح فقط بملفات الصور (JPEG، PNG، GIF، WebP).`
      }, 400);
    }

    // ── File size limit (5 MB) ────────────────────────────────────────────
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({
        success: false,
        message: 'File size exceeds 5 MB limit.',
        messageAr: 'حجم الملف يتجاوز الحد المسموح به (5 ميجابايت).'
      }, 400);
    }

    console.log('Uploading profile photo for employee:', employeeId);

    // Ensure profile photos bucket exists (uses cache)
    const profilePhotosBucketName = 'make-fdcde35a-profile-photos';
    await ensureBucketExists(profilePhotosBucketName, { fileSizeLimit: 5242880 });

    // Generate unique file name — use safe extension derived from MIME type
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif'
    };
    const fileExt = mimeToExt[mimeType] || 'jpg';
    const fileName = `${employeeId}_${Date.now()}.${fileExt}`;
    const filePath = `${employeeId}/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(profilePhotosBucketName)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ 
        success: false, 
        message: `Upload failed: ${uploadError.message}`,
        messageAr: `فشل التحميل: ${uploadError.message}`
      }, 500);
    }

    // Create signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(profilePhotosBucketName)
      .createSignedUrl(filePath, 31536000); // 1 year in seconds

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return c.json({ 
        success: false, 
        message: 'Failed to create signed URL',
        messageAr: 'فشل في إنشاء رابط التوقيع'
      }, 500);
    }

    console.log('✅ Profile photo uploaded successfully');

    return c.json({ 
      success: true, 
      photo_url: signedUrlData.signedUrl,
      message: 'Photo uploaded successfully',
      messageAr: 'تم تحميل الصورة بنجاح'
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    return c.json({ 
      success: false, 
      message: `Error uploading photo: ${error.message}`,
      messageAr: `خطأ في تحميل الصورة: ${error.message}`
    }, 500);
  }
});

// Complete first-time setup
app.post('/make-server-fdcde35a/employee/complete-first-time-setup', async (c) => {
  try {
    const { 
      employee_id, 
      phone, 
      emergency_contact_name, 
      emergency_contact_phone,
      preferred_language,
      profile_photo_url
    } = await c.req.json();
    
    console.log('Completing first-time setup for employee:', employee_id);
    
    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({ 
        success: false, 
        message: 'Employee not found',
        messageAr: 'الموظف غير موجود'
      }, 404);
    }

    // Update employee with all profile information
    const updatedEmployee = {
      ...employee,
      phone,
      emergency_contact_name,
      emergency_contact_phone,
      preferred_language,
      profile_photo_url,
      is_first_time_login: false,
      profile_completed: true,
      profile_completed_at: new Date().toISOString()
    };

    await kv.set(`employee:${employee_id}`, updatedEmployee);
    
    console.log('✅ First-time setup completed successfully for employee:', employee_id);
    
    return c.json({ 
      success: true,
      employee: sanitizeEmployee(updatedEmployee),
      message: 'Profile setup completed successfully',
      messageAr: 'تم إكمال إعداد الملف الشخصي بنجاح'
    });
  } catch (error) {
    console.error('Complete first-time setup error:', error);
    return c.json({ 
      success: false, 
      message: 'Error completing setup',
      messageAr: 'خطأ في إكمال الإعداد'
    }, 500);
  }
});

// Skip first-time setup (employee chooses to skip onboarding)
app.post('/make-server-fdcde35a/employee/skip-first-time-setup', async (c) => {
  try {
    const { employee_id } = await c.req.json();

    console.log('Skipping first-time setup for employee:', employee_id);

    const employee = await kv.get(`employee:${employee_id}`);
    if (!employee) {
      return c.json({
        success: false,
        message: 'Employee not found',
        messageAr: 'الموظف غير موجود'
      }, 404);
    }

    // If the employee still has a temporary password and no regular password,
    // promote the temporary password to be their regular password
    const updatedEmployee: any = {
      ...employee,
      is_first_time_login: false,
      profile_completed: true,
      setup_skipped: true,
      setup_skipped_at: new Date().toISOString()
    };

    if (employee.temporary_password && !employee.password) {
      // Promote temp password — ensure it is stored hashed
      updatedEmployee.password = isHashed(employee.temporary_password)
        ? employee.temporary_password
        : await hashPassword(employee.temporary_password);
      updatedEmployee.temporary_password = null;
      console.log('Promoted temporary password to regular password for employee:', employee_id);
    } else if (employee.temporary_password) {
      updatedEmployee.temporary_password = null;
    }

    await kv.set(`employee:${employee_id}`, updatedEmployee);

    console.log('First-time setup skipped for employee:', employee_id);

    return c.json({
      success: true,
      employee: sanitizeEmployee(updatedEmployee),
      message: 'Setup skipped. You can complete your profile later from settings.',
      messageAr: 'تم تخطي الإعداد. يمكنك إكمال ملفك الشخصي لاحقاً من الإعدادات.'
    });
  } catch (error) {
    console.error('Skip first-time setup error:', error);
    return c.json({
      success: false,
      message: 'Error skipping setup',
      messageAr: 'خطأ في ��خطي الإعداد'
    }, 500);
  }
});

// Create company
app.post('/make-server-fdcde35a/admin/companies', async (c) => {
  try {
    const { name, slug } = await c.req.json();
    
    if (!name || !slug) {
      return c.json({ success: false, message: 'Name and slug are required' }, 400);
    }

    // Get all companies to find next ID
    const companiesList = await getValuesByPrefix('company:');
    const maxId = companiesList.reduce((max, company) => Math.max(max, company.id || 0), 0);
    const newId = maxId + 1;

    const companyData = {
      id: newId,
      name,
      slug,
      logo_url: null
    };

    await kv.set(`company:${newId}`, companyData);
    return c.json({ success: true, company: companyData });
  } catch (error) {
    console.error('Create company error:', error);
    return c.json({ success: false, message: 'Error creating company' }, 500);
  }
});

// Update company
app.patch('/make-server-fdcde35a/admin/companies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, slug } = await c.req.json();

    const company = await kv.get(`company:${id}`);
    if (!company) {
      return c.json({ success: false, message: 'Company not found' }, 404);
    }

    const updatedCompany = { ...company, name, slug };
    await kv.set(`company:${id}`, updatedCompany);
    
    return c.json({ success: true, company: updatedCompany });
  } catch (error) {
    console.error('Update company error:', error);
    return c.json({ success: false, message: 'Error updating company' }, 500);
  }
});

// Delete company - CASCADING DELETE (with optional force parameter)
app.delete('/make-server-fdcde35a/admin/companies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const forceCascade = c.req.query('force') === 'true'; // ?force=true to delete all employees
    
    // Use cascading delete
    const result = await cascadeDeleteCompany(id, forceCascade);
    
    return c.json({ 
      success: true,
      message: forceCascade 
        ? 'Company and all employees deleted successfully'
        : 'Company deleted successfully',
      messageAr: forceCascade
        ? 'تم حذف الشركة وجميع الموظفين بنجاح'
        : 'تم حذف الشركة بنجاح',
      deletionLog: result.deletionLog
    });
  } catch (error) {
    console.error('Delete company error:', error);
    
    // Check if it's a "has employees" error
    if (error.message.includes('assigned employees')) {
      return c.json({ 
        success: false, 
        message: 'Cannot delete company with assigned employees. Add ?force=true to delete all employees.',
        messageAr: 'لا يم��ن حذف شركة بها موظفون. أضف ?force=true لحذف جميع الموظفين.'
      }, 400);
    }
    
    return c.json({ 
      success: false, 
      message: 'Error deleting company',
      messageAr: 'خطأ في حذف الشركة'
    }, 500);
  }
});

// Upload medical report
app.post('/make-server-fdcde35a/upload/medical-report', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employee_id') as string;
    
    if (!file) {
      return c.json({ success: false, message: 'No file provided' }, 400);
    }

    const fileName = `${employeeId}_${Date.now()}_${file.name}`;
    const bucketName = 'make-fdcde35a-medical-reports';
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (error) throw error;

    // Create signed URL valid for 1 year
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year in seconds

    return c.json({ 
      success: true, 
      url: signedUrlData?.signedUrl || '',
      path: data.path 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, message: 'Error uploading file' }, 500);
  }
});

// Get notifications for an employee
app.get('/make-server-fdcde35a/notifications/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    
    // Validate employee ID
    if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
      return c.json({ success: true, notifications: [] });
    }

    // Get all notifications
    const allNotifications = await kv.getByPrefix('notification:');
    
    // Filter by employee and sort by timestamp (newest first)
    const employeeIdNum = parseInt(employeeId);
    const employeeNotifications = allNotifications
      .filter((n: any) => n && n.employee_id === employeeIdNum)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ success: true, notifications: employeeNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ success: true, notifications: [] });
  }
});

// Mark notification as read
app.post('/make-server-fdcde35a/notifications/:notificationId/read', async (c) => {
  try {
    const notificationId = c.req.param('notificationId');
    
    if (!notificationId || notificationId === 'undefined' || notificationId === 'null') {
      return c.json({ success: false, message: 'Invalid notification ID' }, 400);
    }

    const notification = await kv.get(`notification:${notificationId}`);
    
    if (!notification) {
      return c.json({ success: false, message: 'Notification not found' }, 404);
    }

    const updatedNotification = {
      ...notification,
      read: true
    };

    await kv.set(`notification:${notificationId}`, updatedNotification);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ success: false, message: 'Server error' }, 500);
  }
});

// Mark all notifications as read for an employee
app.post('/make-server-fdcde35a/notifications/:employeeId/read-all', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    
    if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
      return c.json({ success: false, message: 'Invalid employee ID' }, 400);
    }

    const allNotifications = await kv.getByPrefix('notification:');
    const employeeIdNum = parseInt(employeeId);
    const employeeNotifications = allNotifications.filter((n: any) => n && n.employee_id === employeeIdNum);

    for (const notification of employeeNotifications) {
      await kv.set(`notification:${notification.id}`, {
        ...notification,
        read: true
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({ success: false, message: 'Server error' }, 500);
  }
});

// Manual seed endpoint (for resetting/testing)
app.post('/make-server-fdcde35a/seed', async (c) => {
  try {
    // Note: KV store cleanup is limited, so we'll just re-seed
    // This will overwrite existing data with the same keys
    await seedDatabase();
    return c.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Manual seed error:', error);
    return c.json({ success: false, message: 'Error seeding database' }, 500);
  }
});

// ==================== NOTIFICATIONS ====================

// Get notifications for employee
app.get('/make-server-fdcde35a/notifications/:employee_id', async (c) => {
  try {
    const employeeId = c.req.param('employee_id');
    const notificationsList = await getValuesByPrefix('notification:');
    
    // Filter notifications for this employee
    const userNotifications = notificationsList.filter(
      (notif) => notif.employee_id === employeeId || notif.employee_id === parseInt(employeeId)
    );
    
    // Sort by timestamp descending
    userNotifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json({ success: true, notifications: userNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ success: false, message: 'Error fetching notifications' }, 500);
  }
});

// Mark notification as read
app.patch('/make-server-fdcde35a/notifications/:id/read', async (c) => {
  try {
    const id = c.req.param('id');
    const notification = await kv.get(`notification:${id}`);
    
    if (!notification) {
      return c.json({ success: false, message: 'Notification not found' }, 404);
    }
    
    notification.read = true;
    await kv.set(`notification:${id}`, notification);
    
    return c.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ success: false, message: 'Error updating notification' }, 500);
  }
});

// Mark all notifications as read for employee
app.patch('/make-server-fdcde35a/notifications/:employee_id/read-all', async (c) => {
  try {
    const employeeId = c.req.param('employee_id');
    const notificationsList = await getValuesByPrefix('notification:');
    
    const userNotifications = notificationsList.filter(
      (notif) => (notif.employee_id === employeeId || notif.employee_id === parseInt(employeeId)) && !notif.read
    );
    
    await Promise.all(
      userNotifications.map(async (notif) => {
        notif.read = true;
        await kv.set(`notification:${notif.id}`, notif);
      })
    );
    
    return c.json({ success: true, count: userNotifications.length });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({ success: false, message: 'Error updating notifications' }, 500);
  }
});

// Delete notification
app.delete('/make-server-fdcde35a/notifications/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`notification:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return c.json({ success: false, message: 'Error deleting notification' }, 500);
  }
});

// ==================== BULK OPERATIONS ====================

// Bulk update requests
app.patch('/make-server-fdcde35a/admin/requests/bulk', async (c) => {
  try {
    const body = await c.req.json();
    const { request_ids, status, admin_notes, admin_id, admin_name, admin_name_ar } = body;
    
    if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
      return c.json({ success: false, message: 'Invalid request IDs' }, 400);
    }
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return c.json({ success: false, message: 'Invalid status' }, 400);
    }
    
    const updatedRequests = [];
    const notifications = [];
    
    // Request type labels
    const requestTypeLabels: Record<string, {en: string, ar: string}> = {
      leave: { en: 'Leave Request', ar: 'طلب إجازة' },
      advance: { en: 'Advance Request', ar: 'طلب سلفة' },
      entry: { en: 'Entry Permission Request', ar: 'طلب خروج وعودة' }
    };

    // Format date for display
    const approvedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    for (const requestId of request_ids) {
      const request = await kv.get(`request:${requestId}`);
      
      if (!request) {
        console.log(`Request not found: ${requestId}`);
        continue;
      }
      
      // Update request
      const nowISO = new Date().toISOString();
      const updatedRequest = {
        ...request,
        status,
        admin_notes: admin_notes || null,
        processed_by: admin_id || 'admin',
        processed_by_name: admin_name || 'Super Admin',
        processed_at: nowISO,
        updated_at: nowISO,
        [`${status}_at`]: nowISO
      };

      // Append activity log entry for bulk action
      const existingLog = Array.isArray(request.activity_log) ? request.activity_log : [];
      existingLog.push({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        action: status,
        performed_by: admin_id || 'admin',
        performed_by_name: admin_name || 'Super Admin',
        performed_by_name_ar: admin_name_ar || admin_name || 'المسؤول الأعلى',
        performed_by_role: 'admin',
        timestamp: nowISO,
        notes: admin_notes || null,
        notifications_sent: [],
        bulk_action: true
      });
      updatedRequest.activity_log = existingLog;
      
      await kv.set(`request:${requestId}`, updatedRequest);
      updatedRequests.push(updatedRequest);
      
      // Get employee information for email
      const employee = await kv.get(`employee:${request.employee_id}`);
      const typeLabel = requestTypeLabels[request.type] || { en: 'Request', ar: 'طلب' };

      // Send email to employee
      if (employee && employee.email) {
        const emailTemplate = status === 'approved' ? 'requestApproved' : 'requestRejected';
        const emailData = {
          employeeName: employee.full_name || 'Employee',
          requestType: typeLabel.en,
          requestTypeAr: typeLabel.ar,
          requestId: requestId.substring(0, 8).toUpperCase(),
          approverName: 'Admin',
          approvedAt: approvedAt,
          rejectedAt: approvedAt,
          comments: admin_notes || '',
          reason: admin_notes || '',
          portalUrl: 'https://portal.yahala.co'
        };

        // Send both English and Arabic versions
        await sendEmail(employee.email, emailTemplate, emailData, 'en');
        await sendEmail(employee.email, emailTemplate, emailData, 'ar');
        
        console.log(`✅ Bulk ${status} email sent to: ${employee.email}`);
      }
      
      // Create notification for employee
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: status === 'approved' ? 'request_approved' : 'request_rejected',
        employee_id: request.employee_id,
        title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
        message: `Your ${request.type} request has been ${status}`,
        read: false,
        created_at: new Date().toISOString(),
        metadata: {
          request_id: requestId,
          request_type: request.type,
          admin_notes
        }
      };
      
      await kv.set(`notification:${notification.id}`, notification);
      notifications.push(notification);
    }
    
    return c.json({ 
      success: true, 
      updated: updatedRequests.length,
      requests: updatedRequests,
      notifications 
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return c.json({ success: false, message: 'Error processing bulk update' }, 500);
  }
});

// ==================== DOCUMENT MANAGEMENT ====================

// Upload document
app.post('/make-server-fdcde35a/documents/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const employee_id = formData.get('employee_id') as string;
    const document_type = formData.get('document_type') as string;
    const document_name = formData.get('document_name') as string;
    const expiry_date = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;

    if (!file || !employee_id || !document_type || !document_name) {
      return c.json({ success: false, message: 'Missing required fields' }, 400);
    }

    // Ensure document storage bucket exists (uses cache)
    const bucketName = 'make-fdcde35a-documents';
    await ensureBucketExists(bucketName, { fileSizeLimit: 10485760 });

    // Upload file to storage
    const fileName = `${employee_id}/${Date.now()}_${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return c.json({ success: false, message: 'Failed to upload file' }, 500);
    }

    // Get signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year

    // Get employee name
    const employee = await kv.get(`employee:${employee_id}`);

    // Store document metadata
    const document = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employee_id,
      employee_name: employee?.full_name || '',
      document_type,
      document_name,
      file_path: fileName,
      file_url: urlData?.signedUrl || '',
      file_size: file.size,
      file_type: file.type,
      expiry_date: expiry_date || null,
      notes: notes || null,
      signature: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`document:${document.id}`, document);

    return c.json({ success: true, document });
  } catch (error) {
    console.error('Document upload error:', error);
    return c.json({ success: false, message: 'Error uploading document' }, 500);
  }
});

// Get all documents (admin)
app.get('/make-server-fdcde35a/documents', async (c) => {
  try {
    let documentsList = [];
    
    try {
      documentsList = await getValuesByPrefix('document:');
    } catch (dbError) {
      // If database query fails, return empty list instead of error
      console.error('Database query error (non-critical):', dbError);
      return c.json({ success: true, documents: [] });
    }
    
    // Sort by created_at descending
    if (documentsList && documentsList.length > 0) {
      documentsList.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return c.json({ success: true, documents: documentsList || [] });
  } catch (error) {
    console.error('Get documents error:', error);
    return c.json({ success: true, documents: [] }); // Return empty instead of error
  }
});

// Get documents for specific employee
app.get('/make-server-fdcde35a/documents/employee/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    let documentsList = [];
    
    try {
      documentsList = await getValuesByPrefix('document:');
    } catch (dbError) {
      // If database query fails, return empty list instead of error
      console.error('Database query error (non-critical):', dbError);
      return c.json({ success: true, documents: [] });
    }
    
    const employeeDocuments = (documentsList || [])
      .filter((doc: any) => doc.employee_id == employeeId || doc.employee_id === parseInt(employeeId))
      .sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

    return c.json({ success: true, documents: employeeDocuments });
  } catch (error) {
    console.error('Get employee documents error:', error);
    return c.json({ success: true, documents: [] }); // Return empty instead of error
  }
});

// Delete document - CASCADING DELETE
app.delete('/make-server-fdcde35a/documents/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Use cascading delete to remove document + storage file
    const result = await cascadeDeleteDocument(id);
    
    return c.json({ 
      success: true,
      message: 'Document deleted successfully',
      messageAr: 'تم حذف المستند بنجاح',
      deletionLog: result.deletionLog
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return c.json({ 
      success: false, 
      message: 'Error deleting document',
      messageAr: 'خطأ في حذف المستند'
    }, 500);
  }
});

// Add signature to document
app.post('/make-server-fdcde35a/documents/:id/signature', async (c) => {
  try {
    const id = c.req.param('id');
    const { signature } = await c.req.json();

    const document = await kv.get(`document:${id}`);
    if (!document) {
      return c.json({ success: false, message: 'Document not found' }, 404);
    }

    const updatedDocument = {
      ...document,
      signature,
      updated_at: new Date().toISOString()
    };

    await kv.set(`document:${id}`, updatedDocument);

    return c.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error('Add signature error:', error);
    return c.json({ success: false, message: 'Error adding signature' }, 500);
  }
});

// ==================== REQUEST COMMENTS ====================

// Add comment to request
app.post('/make-server-fdcde35a/requests/:requestId/comments', async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const { user_id, user_name, user_role, text } = await c.req.json();

    if (!user_id || !user_name || !user_role || !text) {
      return c.json({ success: false, message: 'Missing required fields' }, 400);
    }

    // Verify request exists
    const request = await kv.get(`request:${requestId}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    // Create comment
    const commentId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const comment = {
      id: commentId,
      request_id: requestId,
      user_id,
      user_name,
      user_role,
      text,
      timestamp: new Date().toISOString()
    };

    await kv.set(`comment:${requestId}:${commentId}`, comment);

    // Create notification for the other party
    if (user_role === 'employee' && request.employee_id) {
      // Employee commented, notify admin
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'comment_added',
        employee_id: 'admin',
        title: 'New Comment',
        message: `${user_name} commented on a ${request.type} request`,
        read: false,
        created_at: new Date().toISOString(),
        metadata: {
          request_id: requestId,
          request_type: request.type,
          comment_id: commentId
        }
      };
      await kv.set(`notification:${notification.id}`, notification);
    } else if (user_role === 'admin' && request.employee_id) {
      // Admin commented, notify employee
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'comment_added',
        employee_id: request.employee_id,
        title: 'Admin Replied',
        message: `Admin commented on your ${request.type} request`,
        read: false,
        created_at: new Date().toISOString(),
        metadata: {
          request_id: requestId,
          request_type: request.type,
          comment_id: commentId
        }
      };
      await kv.set(`notification:${notification.id}`, notification);
    }

    return c.json({ success: true, comment });
  } catch (error) {
    console.error('Add comment error:', error);
    return c.json({ success: false, message: 'Error adding comment' }, 500);
  }
});

// Get comments for a request
app.get('/make-server-fdcde35a/requests/:requestId/comments', async (c) => {
  try {
    const requestId = c.req.param('requestId');

    // Verify request exists
    const request = await kv.get(`request:${requestId}`);
    if (!request) {
      return c.json({ success: false, message: 'Request not found' }, 404);
    }

    // Get all comments for this request
    const commentsList = await getValuesByPrefix(`comment:${requestId}:`);
    
    // Sort by timestamp ascending (oldest first)
    commentsList.sort((a, b) => 
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );

    return c.json({ success: true, comments: commentsList });
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ success: false, message: 'Error fetching comments' }, 500);
  }
});

// Delete comment (admin only)
app.delete('/make-server-fdcde35a/comments/:commentId', async (c) => {
  try {
    const commentId = c.req.param('commentId');

    // Find the comment by searching all comments
    const allComments = await getValuesByPrefix('comment:');
    const comment = allComments.find((c: any) => c.id === commentId);

    if (!comment) {
      return c.json({ success: false, message: 'Comment not found' }, 404);
    }

    await kv.del(`comment:${comment.request_id}:${commentId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ success: false, message: 'Error deleting comment' }, 500);
  }
});

// Get comment counts for multiple requests
app.post('/make-server-fdcde35a/requests/comment-counts', async (c) => {
  try {
    const { request_ids } = await c.req.json();

    if (!request_ids || !Array.isArray(request_ids)) {
      return c.json({ success: false, message: 'Invalid request IDs' }, 400);
    }

    const counts: Record<string, number> = {};

    for (const requestId of request_ids) {
      const comments = await getValuesByPrefix(`comment:${requestId}:`);
      counts[requestId] = comments.length;
    }

    return c.json({ success: true, counts });
  } catch (error) {
    console.error('Get comment counts error:', error);
    return c.json({ success: false, message: 'Error fetching comment counts' }, 500);
  }
});

// ==================== ANNOUNCEMENTS ====================

// Create announcement
app.post('/make-server-fdcde35a/admin/announcements', async (c) => {
  try {
    const { 
      title, 
      title_ar, 
      message, 
      message_ar, 
      priority, 
      company_ids, 
      pinned,
      delivery_channel, // 'system', 'email', or 'both'
      image_url, // Optional image URL for email announcements
      created_by_name
    } = await c.req.json();

    if (!title || !message) {
      return c.json({ success: false, message: 'Title and message are required' }, 400);
    }

    const announcementId = `announce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const announcement = {
      id: announcementId,
      title,
      title_ar: title_ar || null,
      message,
      message_ar: message_ar || null,
      priority: priority || 'info', // 'urgent', 'important', 'info'
      company_ids: company_ids || [], // Empty array means all companies
      pinned: pinned || false,
      delivery_channel: delivery_channel || 'system', // 'system', 'email', or 'both'
      image_url: image_url || null,
      created_at: new Date().toISOString(),
      created_by: created_by_name || 'Admin'
    };

    await kv.set(`announcement:${announcementId}`, announcement);

    // Get target employees
    const employeesList = await getValuesByPrefix('employee:');
    const targetEmployees = employeesList.filter((employee: any) => {
      // Filter by company if specified
      if (company_ids && company_ids.length > 0) {
        return company_ids.includes(employee.company_id);
      }
      return true;
    });

    // Create system notifications if channel includes 'system'
    if (delivery_channel === 'system' || delivery_channel === 'both') {
      for (const employee of targetEmployees) {
        const notification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: priority === 'urgent' ? 'announcement_urgent' : 'announcement',
          employee_id: employee.id,
          title: priority === 'urgent' ? 'Urgent Announcement' : 'New Announcement',
          message: title,
          read: false,
          created_at: new Date().toISOString(),
          metadata: {
            announcement_id: announcementId,
            priority
          }
        };
        await kv.set(`notification:${notification.id}`, notification);
      }
    }

    // Send emails if channel includes 'email'
    if ((delivery_channel === 'email' || delivery_channel === 'both') && targetEmployees.length > 0) {
      console.log(`📧 Sending announcement emails to ${targetEmployees.length} employees...`);
      
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const employee of targetEmployees) {
        if (!employee.email) continue;

        const emailData = {
          title,
          titleAr: title_ar,
          content: message,
          contentAr: message_ar,
          imageUrl: image_url,
          postedDate: new Date(announcement.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          postedBy: created_by_name || 'Admin',
          postedByAr: created_by_name || 'المسؤول',
          portalUrl: 'https://portal.yahala.co'
        };

        // Send email (try English first, then Arabic)
        const emailSent = await sendEmail(
          employee.email,
          'announcement',
          emailData,
          'en'
        );

        if (emailSent) {
          emailsSent++;
        } else {
          emailsFailed++;
        }
      }

      console.log(`✅ Emails sent: ${emailsSent}, Failed: ${emailsFailed}`);
    }

    return c.json({ 
      success: true, 
      announcement,
      stats: {
        total_employees: targetEmployees.length,
        notifications_created: (delivery_channel === 'system' || delivery_channel === 'both') ? targetEmployees.length : 0,
        emails_sent: (delivery_channel === 'email' || delivery_channel === 'both') ? targetEmployees.filter((e: any) => e.email).length : 0
      }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    return c.json({ success: false, message: 'Error creating announcement' }, 500);
  }
});

// Get all announcements
app.get('/make-server-fdcde35a/announcements', async (c) => {
  try {
    const companyId = c.req.query('company_id');
    const announcementsList = await getValuesByPrefix('announcement:');
    
    // Filter by company if specified
    let filteredAnnouncements = announcementsList;
    if (companyId && companyId !== 'all') {
      filteredAnnouncements = announcementsList.filter((a: any) => {
        // Include if no company filter set (all companies) or company matches
        return !a.company_ids || a.company_ids.length === 0 || a.company_ids.includes(parseInt(companyId));
      });
    }
    
    // Sort by pinned first, then by created_at descending
    filteredAnnouncements.sort((a: any, b: any) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return c.json({ success: true, announcements: filteredAnnouncements });
  } catch (error) {
    console.error('Get announcements error:', error);
    return c.json({ success: false, message: 'Error fetching announcements' }, 500);
  }
});

// Update announcement
app.patch('/make-server-fdcde35a/admin/announcements/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();

    const announcement = await kv.get(`announcement:${id}`);
    if (!announcement) {
      return c.json({ success: false, message: 'Announcement not found' }, 404);
    }

    const updatedAnnouncement = {
      ...announcement,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await kv.set(`announcement:${id}`, updatedAnnouncement);

    return c.json({ success: true, announcement: updatedAnnouncement });
  } catch (error) {
    console.error('Update announcement error:', error);
    return c.json({ success: false, message: 'Error updating announcement' }, 500);
  }
});

// Delete announcement - CASCADING DELETE
app.delete('/make-server-fdcde35a/admin/announcements/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Use cascading delete to remove announcement + image + read receipts + notifications
    const result = await cascadeDeleteAnnouncement(id);
    
    return c.json({ 
      success: true,
      message: 'Announcement and all related data deleted successfully',
      messageAr: 'تم حذف الإعلان وجميع البيانات المرتبطة بنجاح',
      deletionLog: result.deletionLog
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return c.json({ 
      success: false, 
      message: 'Error deleting announcement',
      messageAr: 'خطأ في حذف الإعلان'
    }, 500);
  }
});

// Upload image for announcement
app.post('/make-server-fdcde35a/admin/announcements/upload-image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image');
    
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, message: 'No image file provided' }, 400);
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return c.json({ success: false, message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, message: 'File size too large. Maximum size is 5MB' }, 400);
    }

    // Ensure announcements bucket exists (uses cache)
    const bucketName = 'make-fdcde35a-announcements';
    await ensureBucketExists(bucketName, { fileSizeLimit: 5242880 });

    // Upload file
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
    const filePath = `images/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, await file.arrayBuffer(), {
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ success: false, message: 'Failed to upload image' }, 500);
    }

    // Get signed URL (valid for 1 year)
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000); // 1 year in seconds

    return c.json({ 
      success: true, 
      imageUrl: signedUrlData?.signedUrl,
      fileName,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return c.json({ success: false, message: 'Error uploading image' }, 500);
  }
});

// Mark announcement as read
app.post('/make-server-fdcde35a/announcements/:id/read', async (c) => {
  try {
    const id = c.req.param('id');
    const { employee_id } = await c.req.json();

    if (!employee_id) {
      return c.json({ success: false, message: 'Employee ID is required' }, 400);
    }

    const announcement = await kv.get(`announcement:${id}`);
    if (!announcement) {
      return c.json({ success: false, message: 'Announcement not found' }, 404);
    }

    const readReceipt = {
      announcement_id: id,
      employee_id,
      read_at: new Date().toISOString()
    };

    await kv.set(`announcement_read:${id}:${employee_id}`, readReceipt);

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark announcement as read error:', error);
    return c.json({ success: false, message: 'Error marking as read' }, 500);
  }
});

// Get read receipts for announcement
app.get('/make-server-fdcde35a/admin/announcements/:id/receipts', async (c) => {
  try {
    const id = c.req.param('id');
    
    const announcement = await kv.get(`announcement:${id}`);
    if (!announcement) {
      return c.json({ success: false, message: 'Announcement not found' }, 404);
    }

    const readReceipts = await getValuesByPrefix(`announcement_read:${id}:`);
    
    // Enrich with employee data
    const enrichedReceipts = await Promise.all(
      readReceipts.map(async (receipt: any) => {
        const employee = await kv.get(`employee:${receipt.employee_id}`);
        return {
          ...receipt,
          employee_name: employee?.full_name || 'Unknown',
          employee_name_ar: employee?.full_name_ar || null
        };
      })
    );

    return c.json({ success: true, receipts: enrichedReceipts });
  } catch (error) {
    console.error('Get read receipts error:', error);
    return c.json({ success: false, message: 'Error fetching receipts' }, 500);
  }
});

// ==================== ADMIN SETTINGS ====================

// Change admin password
app.post('/make-server-fdcde35a/admin/change-password', async (c) => {
  try {
    const { admin_id, current_password, new_password } = await c.req.json();

    if (!admin_id || !current_password || !new_password) {
      return c.json({ success: false, message: 'All fields are required' }, 400);
    }

    const admin = await kv.get(`admin:${admin_id}`);
    if (!admin) {
      return c.json({ success: false, message: 'Admin not found' }, 404);
    }

    if (!await verifyPassword(current_password, admin.password)) {
      return c.json({ success: false, message: 'Current password is incorrect' }, 401);
    }

    if (new_password.length < 8) {
      return c.json({ success: false, message: 'New password must be at least 8 characters' }, 400);
    }

    const updatedAdmin = {
      ...admin,
      password: await hashPassword(new_password),
      password_changed_at: new Date().toISOString()
    };

    await kv.set(`admin:${admin_id}`, updatedAdmin);

    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change admin password error:', error);
    return c.json({ success: false, message: 'Error changing password' }, 500);
  }
});

// Reset all data (DANGER: Use with caution!)
app.post('/make-server-fdcde35a/admin/reset-data', async (c) => {
  try {
    const { confirmation_code } = await c.req.json();

    // Require confirmation code to prevent accidental deletion
    if (confirmation_code !== 'RESET_ALL_DATA') {
      return c.json({ success: false, message: 'Invalid confirmation code' }, 400);
    }

    // Delete all requests
    const requests = await getValuesByPrefix('request:');
    for (const request of requests) {
      await kv.del(`request:${request.id}`);
    }

    // Delete all notifications
    const notifications = await getValuesByPrefix('notification:');
    for (const notification of notifications) {
      await kv.del(`notification:${notification.id}`);
    }

    // Delete all comments
    const comments = await getValuesByPrefix('comment:');
    for (const comment of comments) {
      await kv.del(`comment:${comment.request_id}:${comment.id}`);
    }

    // Delete all documents
    const documents = await getValuesByPrefix('document:');
    for (const document of documents) {
      // Delete from storage
      const bucketName = 'make-fdcde35a-documents';
      try {
        await supabase.storage.from(bucketName).remove([document.file_path]);
      } catch (e) {
        console.log('Error deleting file from storage:', e);
      }
      await kv.del(`document:${document.id}`);
    }

    // Delete all announcements
    const announcements = await getValuesByPrefix('announcement:');
    for (const announcement of announcements) {
      await kv.del(`announcement:${announcement.id}`);
    }

    // Delete all announcement read receipts
    const readReceipts = await getValuesByPrefix('announcement_read:');
    for (const receipt of readReceipts) {
      await kv.del(`announcement_read:${receipt.announcement_id}:${receipt.employee_id}`);
    }

    // Keep admin credentials and employee data
    // This allows testing without having to recreate users

    console.log('All data reset successfully');

    return c.json({ 
      success: true, 
      message: 'All data has been reset. Employee and admin accounts are preserved.',
      deleted: {
        requests: requests.length,
        notifications: notifications.length,
        comments: comments.length,
        documents: documents.length,
        announcements: announcements.length
      }
    });
  } catch (error) {
    console.error('Reset data error:', error);
    return c.json({ success: false, message: 'Error resetting data' }, 500);
  }
});

// Get system statistics
app.get('/make-server-fdcde35a/admin/stats', async (c) => {
  try {
    const requests = await getValuesByPrefix('request:');
    const employees = await getValuesByPrefix('employee:');
    const companies = await getValuesByPrefix('company:');
    const notifications = await getValuesByPrefix('notification:');
    const documents = await getValuesByPrefix('document:');
    const announcements = await getValuesByPrefix('announcement:');
    const comments = await getValuesByPrefix('comment:');

    return c.json({
      success: true,
      stats: {
        total_requests: requests.length,
        total_employees: employees.length,
        total_companies: companies.length,
        total_notifications: notifications.length,
        total_documents: documents.length,
        total_announcements: announcements.length,
        total_comments: comments.length,
        pending_requests: requests.filter((r: any) => r.status === 'pending').length,
        unread_notifications: notifications.filter((n: any) => !n.read).length
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ success: false, message: 'Error fetching statistics' }, 500);
  }
});

// ==================== COMPANY SETTINGS ====================

// Get company settings
app.get('/make-server-fdcde35a/admin/settings', async (c) => {
  try {
    const companyId = c.req.query('company_id') || 'YHT';
    
    // Get or create default settings
    let settings = await kv.get(`settings:${companyId}`);
    
    if (!settings) {
      // Create default settings
      settings = {
        companyId,
        workingDays: [0, 1, 2, 3, 4],
        weekendDays: [5, 6],
        workStartTime: '08:00',
        workEndTime: '17:00',
        annualLeaveDays: 21,
        sickLeaveDays: 30,
        emergencyLeaveDays: 5,
        leaveCarryForward: 10,
        leaveAdvanceNoticeDays: 3,
        leaveMaxConsecutiveDays: 15,
        advanceEnabled: true,
        advanceMaxPercentage: 50,
        advanceMinAmount: 500,
        advanceMaxAmount: 0,
        advanceMaxRequestsPerYear: 3,
        advanceMinServiceMonths: 3,
        permissionEnabled: true,
        permissionMaxHoursPerRequest: 4,
        permissionMaxRequestsPerMonth: 3,
        emailNotificationsEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUsername: 'info@yahala.co',
        smtpFromEmail: 'eportal@yahala.co',
        smtpFromName: 'Ya Hala Group HR System',
        publicHolidays: [
          {
            id: crypto.randomUUID(),
            date: '2025-09-23',
            nameEn: 'Saudi National Day',
            nameAr: 'اليوم الوطني السعودي',
            type: 'national',
            recurring: true
          }
        ],
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(`settings:${companyId}`, settings);
    }
    
    return c.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ success: false, message: 'Error fetching settings' }, 500);
  }
});

// Update company settings
app.patch('/make-server-fdcde35a/admin/settings', async (c) => {
  try {
    const settingsData = await c.req.json();
    const companyId = settingsData.companyId || 'YHT';
    
    const updatedSettings = {
      ...settingsData,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`settings:${companyId}`, updatedSettings);
    
    return c.json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ success: false, message: 'Error updating settings' }, 500);
  }
});

// ==================== ANALYTICS ====================

async function recordDailySnapshot() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const requests = await getValuesByPrefix('request:');
    const employees = await getValuesByPrefix('employee:');
    
    const snapshot = {
      date: today,
      timestamp: new Date().toISOString(),
      totalRequests: requests.length,
      pendingRequests: requests.filter((r: any) => r.status === 'pending').length,
      approvedRequests: requests.filter((r: any) => r.status === 'approved').length,
      rejectedRequests: requests.filter((r: any) => r.status === 'rejected').length,
      leaveRequests: requests.filter((r: any) => r.request_type === 'leave').length,
      advanceRequests: requests.filter((r: any) => r.request_type === 'advance').length,
      permissionRequests: requests.filter((r: any) => r.request_type === 'permission').length,
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e: any) => e.status === 'active').length
    };
    
    await kv.set(`analytics:snapshot:${today}`, snapshot);
    return snapshot;
  } catch (error) {
    console.error('Error recording snapshot:', error);
    return null;
  }
}

app.get('/make-server-fdcde35a/admin/analytics', async (c) => {
  try {
    const period = parseInt(c.req.query('period') || '30');
    const snapshots = [];
    
    for (let i = 0; i < period; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const snapshot = await kv.get(`analytics:snapshot:${dateStr}`);
      if (snapshot) snapshots.push(snapshot);
    }
    
    if (snapshots.length === 0) {
      const current = await recordDailySnapshot();
      if (current) snapshots.push(current);
    }
    
    const requests = await getValuesByPrefix('request:');
    const employees = await getValuesByPrefix('employee:');
    
    const requestsByType = {
      leave: requests.filter((r: any) => r.request_type === 'leave').length,
      advance: requests.filter((r: any) => r.request_type === 'advance').length,
      permission: requests.filter((r: any) => r.request_type === 'permission').length
    };
    
    const requestsByStatus = {
      pending: requests.filter((r: any) => r.status === 'pending').length,
      approved: requests.filter((r: any) => r.status === 'approved').length,
      rejected: requests.filter((r: any) => r.status === 'rejected').length
    };
    
    return c.json({
      success: true,
      analytics: {
        period,
        snapshots: snapshots.reverse(),
        current: {
          totalRequests: requests.length,
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e: any) => e.status === 'active').length
        },
        trends: {
          requestsByType,
          requestsByStatus
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ success: false, message: 'Error fetching analytics' }, 500);
  }
});

app.post('/make-server-fdcde35a/admin/analytics/snapshot', async (c) => {
  try {
    const snapshot = await recordDailySnapshot();
    return c.json({ success: true, snapshot });
  } catch (error) {
    console.error('Record snapshot error:', error);
    return c.json({ success: false, message: 'Error recording snapshot' }, 500);
  }
});

// ==================== EMAIL TESTING ====================

// Test email endpoint
app.post('/make-server-fdcde35a/test-email', async (c) => {
  try {
    const { email, template, language, data } = await c.req.json();
    
    if (!email) {
      return c.json({ success: false, message: 'Email address required' }, 400);
    }
    
    const templateName = template || 'requestApproved';
    const lang = language || 'en';
    
    // Sample data for testing if no data provided
    const testData = {
      employeeName: 'Test User',
      employeeId: '10001',
      requestId: 'TEST-001',
      requestType: 'Leave Request',
      requestTypeAr: 'طلب إجازة',
      approverName: 'Manager Name',
      approvedAt: new Date().toLocaleDateString(),
      rejectedAt: new Date().toLocaleDateString(),
      rejectedBy: 'Manager Name',
      submittedAt: new Date().toLocaleDateString(),
      managerName: 'Manager Name',
      comments: 'This is a test email from the Ya Hala Group E-Portal system.',
      reason: 'This is a test rejection reason.',
      details: 'Test request details',
      temporaryPassword: 'Temp@123',
      portalUrl: 'https://portal.yahala.co',
      // Announcement-specific fields
      title: 'Test Announcement Title',
      titleAr: 'عنوان الإعلان التجريبي',
      content: 'This is a test announcement content.\nIt demonstrates how announcements will appear in emails.\nYou can include multiple lines of content.',
      contentAr: 'هذا محتوى إعلان تجريبي.\nيوضح كيف ستظهر الإعلانات في رسائل البريد الإلكتروني.\nيمكنك تضمين عدة أسطر من المحتوى.',
      imageUrl: '',
      postedDate: new Date().toLocaleDateString(),
      postedBy: 'Admin User',
      postedByAr: 'المسؤول',
      // Merge with provided data
      ...data
    };
    
    console.log(`Sending test email to: ${email}`);
    console.log(`Template: ${templateName}, Language: ${lang}`);
    
    const success = await sendEmail(email, templateName as any, testData, lang as any);
    
    if (success) {
      return c.json({ 
        success: true, 
        message: `Test email sent successfully to ${email}`,
        template: templateName,
        language: lang
      });
    } else {
      return c.json({ 
        success: false, 
        message: 'Failed to send email - check server logs for details' 
      }, 500);
    }
  } catch (error) {
    console.error('Test email error:', error);
    return c.json({ 
      success: false, 
      message: `Error sending test email: ${error.message}` 
    }, 500);
  }
});

// Get available email templates
app.get('/make-server-fdcde35a/email-templates', async (c) => {
  try {
    const templates = Object.keys(emailTemplates).map(key => ({
      name: key,
      subjectEn: emailTemplates[key as keyof typeof emailTemplates].subject,
      subjectAr: emailTemplates[key as keyof typeof emailTemplates].subjectAr
    }));
    
    return c.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    return c.json({ success: false, message: 'Error fetching templates' }, 500);
  }
});

// ==================== SOFT DELETE SYSTEM ====================

// Soft delete a record
app.post('/make-server-fdcde35a/soft-delete', async (c) => {
  try {
    const { key, deletedBy, reason } = await c.req.json();
    
    if (!key || !deletedBy) {
      return c.json({
        success: false,
        message: 'Missing required fields: key, deletedBy'
      }, 400);
    }

    const result = await softDelete.softDelete(key, deletedBy, reason);
    return c.json(result);
  } catch (error) {
    console.error('Soft delete error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// Restore a soft-deleted record
app.post('/make-server-fdcde35a/soft-delete/restore', async (c) => {
  try {
    const { key, restoredBy } = await c.req.json();
    
    if (!key || !restoredBy) {
      return c.json({
        success: false,
        message: 'Missing required fields: key, restoredBy'
      }, 400);
    }

    const result = await softDelete.restore(key, restoredBy);
    return c.json(result);
  } catch (error) {
    console.error('Restore error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// Get all soft-deleted records by prefix
app.get('/make-server-fdcde35a/soft-delete/deleted/:prefix', async (c) => {
  try {
    const prefix = c.req.param('prefix');
    const records = await softDelete.getDeletedByPrefix(prefix);
    
    return c.json({
      success: true,
      records,
      count: records.length
    });
  } catch (error) {
    console.error('Get deleted records error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// Get deletion statistics
app.get('/make-server-fdcde35a/soft-delete/stats/:prefix', async (c) => {
  try {
    const prefix = c.req.param('prefix');
    const stats = await softDelete.getDeletionStats(prefix);
    
    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get deletion stats error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// Bulk soft delete
app.post('/make-server-fdcde35a/soft-delete/bulk', async (c) => {
  try {
    const { keys, deletedBy, reason } = await c.req.json();
    
    if (!keys || !Array.isArray(keys) || !deletedBy) {
      return c.json({
        success: false,
        message: 'Missing required fields: keys (array), deletedBy'
      }, 400);
    }

    const result = await softDelete.bulkSoftDelete(keys, deletedBy, reason);
    return c.json(result);
  } catch (error) {
    console.error('Bulk soft delete error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// Bulk restore
app.post('/make-server-fdcde35a/soft-delete/bulk-restore', async (c) => {
  try {
    const { keys, restoredBy } = await c.req.json();
    
    if (!keys || !Array.isArray(keys) || !restoredBy) {
      return c.json({
        success: false,
        message: 'Missing required fields: keys (array), restoredBy'
      }, 400);
    }

    const result = await softDelete.bulkRestore(keys, restoredBy);
    return c.json(result);
  } catch (error) {
    console.error('Bulk restore error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// Permanently delete a soft-deleted record
app.delete('/make-server-fdcde35a/soft-delete/permanent', async (c) => {
  try {
    const { key, deletedBy } = await c.req.json();
    
    if (!key || !deletedBy) {
      return c.json({
        success: false,
        message: 'Missing required fields: key, deletedBy'
      }, 400);
    }

    const result = await softDelete.permanentDelete(key, deletedBy);
    return c.json(result);
  } catch (error) {
    console.error('Permanent delete error:', error);
    return c.json({
      success: false,
      message: error.message
    }, 500);
  }
});

// ==================== END SOFT DELETE SYSTEM ====================

// ==================== RETROACTIVE ACTIVITY LOG MIGRATION ====================

// Migrate activity logs for all existing requests that don't have them
app.post('/make-server-fdcde35a/admin/migrate-activity-logs', async (c) => {
  try {
    console.log('Starting retroactive activity log migration...');
    const allRequests = await getValuesByPrefix('request:');
    const allEmployees = await getValuesByPrefix('employee:');
    
    // Build employee lookup map
    const employeeMap: Record<string, any> = {};
    for (const emp of allEmployees) {
      if (emp.id) {
        employeeMap[emp.id.toString()] = emp;
      }
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const request of allRequests) {
      try {
        // Skip if request already has an activity_log with entries
        if (Array.isArray(request.activity_log) && request.activity_log.length > 0) {
          skippedCount++;
          continue;
        }

        const activityLog: any[] = [];
        const employee = request.employee_id ? employeeMap[request.employee_id.toString()] : null;

        // 1. Submission entry (always exists for every request)
        const submittedAt = request.created_at || request.submitted_at || new Date().toISOString();
        activityLog.push({
          id: `act_migrated_sub_${request.id?.substring?.(0, 8) || Date.now()}`,
          action: 'submitted',
          performed_by: request.employee_id?.toString() || 'unknown',
          performed_by_name: employee?.full_name || request.employee_name || 'Employee',
          performed_by_name_ar: employee?.full_name_ar || employee?.full_name || 'موظف',
          performed_by_role: employee?.role || 'employee',
          timestamp: submittedAt,
          notes: null,
          notifications_sent: [],
          migrated: true
        });

        // 2. Processing entry (if the request has been acted upon)
        if (request.status && request.status !== 'pending') {
          const processedAt = request.processed_at || request.updated_at || submittedAt;
          
          let performerName = 'Admin';
          let performerNameAr = 'المسؤول';
          let performerId = 'admin';
          let performerRole = 'admin';

          if (request.processed_by) {
            performerId = request.processed_by.toString();
            const processor = employeeMap[performerId];
            if (processor) {
              performerName = processor.full_name || performerName;
              performerNameAr = processor.full_name_ar || processor.full_name || performerNameAr;
              performerRole = processor.role || 'admin';
            }
          }
          if (request.processed_by_name) {
            performerName = request.processed_by_name;
          }

          // Map status to action
          let action = request.status;
          if (action === 'cancelled') {
            performerId = request.employee_id?.toString() || 'unknown';
            performerName = employee?.full_name || 'Employee';
            performerNameAr = employee?.full_name_ar || employee?.full_name || 'موظف';
            performerRole = 'employee';
          }

          activityLog.push({
            id: `act_migrated_proc_${request.id?.substring?.(0, 8) || Date.now()}`,
            action: action,
            performed_by: performerId,
            performed_by_name: performerName,
            performed_by_name_ar: performerNameAr,
            performed_by_role: performerRole,
            timestamp: processedAt,
            notes: request.admin_notes || request.approval_notes || null,
            notifications_sent: [],
            migrated: true
          });
        }

        // Update the request with the activity log
        const updatedRequest = { ...request, activity_log: activityLog };
        const requestKey = request.id ? `request:${request.id}` : null;
        if (requestKey) {
          await kv.set(requestKey, updatedRequest);
          migratedCount++;
        } else {
          console.log('Skipping request without id:', JSON.stringify(request).substring(0, 100));
          errorCount++;
        }
      } catch (reqError) {
        console.error(`Error migrating request ${request.id}:`, reqError);
        errorCount++;
      }
    }

    console.log(`Activity log migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);

    return c.json({
      success: true,
      message: 'Migration complete',
      stats: { total: allRequests.length, migrated: migratedCount, skipped: skippedCount, errors: errorCount }
    });
  } catch (error) {
    console.error('Activity log migration error:', error);
    return c.json({ success: false, message: `Migration failed: ${error.message}` }, 500);
  }
});

// ==================== END ACTIVITY LOG MIGRATION ====================

// ==================== HR PERMISSIONS MANAGEMENT (Super Admin) ====================

// Get HR permissions
app.get('/make-server-fdcde35a/admin/hr-permissions', async (c) => {
  try {
    let permissions = await kv.get('hr_permissions');
    if (!permissions) {
      permissions = {
        can_upload_documents: false,
        can_edit_employee_info: false,
        can_edit_financial_info: false,
        can_resend_emails: true,
        can_cancel_requests: false,
        updated_at: new Date().toISOString()
      };
      await kv.set('hr_permissions', permissions);
    }
    // Back-fill can_cancel_requests for older stored records
    if (typeof permissions.can_cancel_requests === 'undefined') {
      permissions.can_cancel_requests = false;
      await kv.set('hr_permissions', permissions);
    }
    // Back-fill can_post_announcements for older stored records
    if (typeof permissions.can_post_announcements === 'undefined') {
      permissions.can_post_announcements = false;
      await kv.set('hr_permissions', permissions);
    }
    return c.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching HR permissions:', error);
    return c.json({ success: false, message: 'Error fetching HR permissions' }, 500);
  }
});

// Update HR permissions
app.patch('/make-server-fdcde35a/admin/hr-permissions', async (c) => {
  try {
    const { permissions, admin_id, admin_name } = await c.req.json();

    const existing = await kv.get('hr_permissions') || {};
    const updatedPermissions = {
      ...existing,
      ...permissions,
      updated_at: new Date().toISOString(),
      updated_by: admin_id
    };

    await kv.set('hr_permissions', updatedPermissions);

    // Log the action
    const logId = `log_${Date.now()}_perm`;
    await kv.set(`admin_log:${logId}`, {
      id: logId,
      timestamp: new Date().toISOString(),
      action: 'update_hr_permissions',
      performed_by: admin_id,
      performed_by_name: admin_name || 'Super Admin',
      details: { permissions: updatedPermissions }
    });

    console.log(`HR permissions updated by ${admin_name || admin_id}: ${JSON.stringify(updatedPermissions)}`);
    return c.json({ success: true, permissions: updatedPermissions });
  } catch (error) {
    console.error('Error updating HR permissions:', error);
    return c.json({ success: false, message: 'Error updating HR permissions' }, 500);
  }
});

// ==================== ADVANCE DISBURSEMENT CONFIRMATION ====================

/**
 * GET /advance/confirm-disbursement/:token
 * One-click link for accountant to confirm an advance disbursement.
 * No auth required — token acts as the credential.
 */
app.get('/make-server-fdcde35a/advance/confirm-disbursement/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const tokenData = await kv.get(`advance_disburse_token:${token}`);

    if (!tokenData) {
      return c.html(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#DC2626;">⚠️ Invalid or Expired Link</h2>
          <p>This disbursement confirmation link is invalid or has already been used.</p>
          <p dir="rtl" style="font-family:Tahoma,sans-serif;">الرابط غير صالح أو تم استخدامه مسبقاً.</p>
        </body></html>`, 400);
    }

    if (Date.now() > tokenData.expires_at) {
      await kv.del(`advance_disburse_token:${token}`);
      return c.html(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#DC2626;">⚠️ Link Expired</h2>
          <p>This disbursement link has expired. Please contact HR to generate a new one.</p>
          <p dir="rtl" style="font-family:Tahoma,sans-serif;">انتهت صلاحية الرابط. يرجى التواصل مع الموارد البشرية.</p>
        </body></html>`, 400);
    }

    const { request_id, employee_id, amount } = tokenData;
    const request = await kv.get(`request:${request_id}`);

    if (!request) {
      return c.html(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#DC2626;">⚠️ Request Not Found</h2>
          <p>The associated advance request could not be found.</p>
        </body></html>`, 404);
    }

    if (request.status === 'disbursed') {
      return c.html(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#10B981;">✅ Already Confirmed</h2>
          <p>This advance has already been marked as disbursed.</p>
          <p dir="rtl" style="font-family:Tahoma,sans-serif;">تم تأكيد صرف هذه السلفة مسبقاً.</p>
        </body></html>`);
    }

    // Update request status to disbursed
    const nowISO = new Date().toISOString();
    const updatedRequest = {
      ...request,
      status: 'disbursed',
      disbursed_at: nowISO,
      updated_at: nowISO,
      activity_log: [
        ...(Array.isArray(request.activity_log) ? request.activity_log : []),
        {
          id: `act_${Date.now()}_disburse`,
          action: 'disbursed',
          performed_by: 'accountant',
          performed_by_name: 'Accountant',
          performed_by_name_ar: 'المحاسب',
          performed_by_role: 'accountant',
          timestamp: nowISO,
          notes: 'Advance confirmed disbursed via one-click email link',
          notifications_sent: []
        }
      ]
    };
    await kv.set(`request:${request_id}`, updatedRequest);

    // Delete token (one-use)
    await kv.del(`advance_disburse_token:${token}`);

    // Notify employee via portal notification + email
    const employee = await kv.get(`employee:${employee_id}`);
    const shortId = request_id.substring(0, 8).toUpperCase();
    const amountFormatted = parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 });

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`notification:${notifId}`, {
      id: notifId,
      employee_id: parseInt(employee_id),
      title: 'Advance Disbursed',
      title_ar: 'تم صرف السلفة',
      message: `Your advance of ${amountFormatted} SAR (Request #${shortId}) has been disbursed by the finance team.`,
      message_ar: `تم صرف سلفتك بمبلغ ${amountFormatted} ر.س (طلب رقم ${shortId}) من قِبَل الفريق المالي.`,
      type: 'advance_disbursed',
      read: false,
      created_at: nowISO,
      metadata: { request_id, amount }
    });

    if (employee?.email) {
      const emailData = {
        employeeName: employee.full_name || 'Employee',
        employeeNameAr: employee.full_name_ar || employee.full_name,
        amount: amountFormatted,
        requestId: shortId,
        portalUrl: 'https://portal.yahala.co'
      };
      await sendEmail(employee.email, 'advanceDisbursed', emailData, 'en');
      await sendEmail(employee.email, 'advanceDisbursed', emailData, 'ar');
      console.log(`✅ Disbursement confirmed email sent to employee: ${employee.email}`);
    }

    return c.html(`
      <html>
      <head><meta charset="UTF-8"><title>Disbursement Confirmed</title></head>
      <body style="font-family:Arial,sans-serif;background:#f0fdf4;min-height:100vh;display:flex;align-items:center;justify-content:center;">
        <div style="background:white;padding:50px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:500px;text-align:center;">
          <div style="width:80px;height:80px;background:#10B981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
            <span style="color:white;font-size:40px;">✓</span>
          </div>
          <h1 style="color:#10B981;margin:0 0 10px 0;">Disbursement Confirmed!</h1>
          <h2 style="color:#374151;font-family:Tahoma,sans-serif;direction:rtl;">تم تأكيد الصرف!</h2>
          <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;">
            <p style="color:#666;margin:0 0 5px 0;font-size:14px;">Amount / المبلغ</p>
            <p style="font-size:28px;font-weight:bold;color:#10B981;margin:0;">${amountFormatted} SAR</p>
            <p style="color:#888;margin:5px 0 0 0;font-size:12px;">Request ID: ${shortId}</p>
          </div>
          <p style="color:#6B7280;">The employee has been notified automatically.</p>
          <p style="color:#6B7280;font-family:Tahoma,sans-serif;direction:rtl;">تم إشعار الموظف تلقائياً.</p>
          <p style="color:#9CA3AF;font-size:12px;margin-top:30px;">Ya Hala Group HR E-Portal</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Confirm disbursement error:', error);
    return c.html(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2 style="color:#DC2626;">Server Error</h2>
        <p>An error occurred. Please try again or contact IT support.</p>
      </body></html>`, 500);
  }
});

// ==================== CONTRACT EXPIRY ALERTS ====================

/**
 * GET /admin/check-contract-alerts
 * Checks all employees for contracts ending in 60–70 days.
 * Sends alerts to employee + manager + HR (once per expiry event, tracked in KV).
 */
app.get('/make-server-fdcde35a/admin/check-contract-alerts', async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allEmployees = await getValuesByPrefix('employee:');
    const activeEmployees = allEmployees.filter((emp: any) => emp && !emp.deleted_at && emp.contract_end_date);

    const alertsSent: any[] = [];
    const nowISO = new Date().toISOString();

    for (const emp of activeEmployees) {
      try {
        const contractEnd = new Date(emp.contract_end_date);
        contractEnd.setHours(0, 0, 0, 0);
        const daysUntilEnd = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Trigger window: 45 to 55 days before contract end (centred on 50-day rule)
        if (daysUntilEnd < 45 || daysUntilEnd > 55) continue;

        // Check if alert already sent for this contract end date
        const alertKey = `contract_alert:${emp.id}:${emp.contract_end_date}`;
        const alreadySent = await kv.get(alertKey);
        if (alreadySent) continue;

        const contractEndFormatted = contractEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const noticeDeadline = new Date(contractEnd);
        noticeDeadline.setDate(noticeDeadline.getDate() - 60);
        const noticeDeadlineFormatted = noticeDeadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const employeeEmailData = {
          employeeName: emp.full_name || 'Employee',
          employeeNameAr: emp.full_name_ar || emp.full_name,
          contractEndDate: contractEndFormatted,
          daysRemaining: daysUntilEnd,
          noticeDeadline: noticeDeadlineFormatted,
          portalUrl: 'https://portal.yahala.co'
        };

        // 1. Portal notification + email to employee
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await kv.set(`notification:${notifId}`, {
          id: notifId,
          employee_id: emp.id,
          title: 'Contract Information',
          title_ar: 'معلومات العقد',
          message: `Your contract ends on ${contractEndFormatted} (${daysUntilEnd} days remaining). You have the right to express your intention before ${noticeDeadlineFormatted}. No action required if no changes planned.`,
          message_ar: `ينتهي عقدك بتاريخ ${contractEndFormatted} (${daysUntilEnd} يوماً متبقياً). لك الحق في التعبير عن نيتك قبل ${noticeDeadlineFormatted}. لا حاجة لأي إجراء إذا لم تكن تخطط لأي تغييرات.`,
          type: 'contract_expiry_info',
          read: false,
          created_at: nowISO,
          metadata: { contract_end_date: emp.contract_end_date, days_remaining: daysUntilEnd }
        });

        if (emp.email) {
          await sendEmail(emp.email, 'contractExpiryEmployee', employeeEmailData, 'en');
          await sendEmail(emp.email, 'contractExpiryEmployee', employeeEmailData, 'ar');
        }

        // 2. Portal notification + email to manager
        if (emp.manager_id) {
          const manager = await kv.get(`employee:${emp.manager_id}`);
          if (manager) {
            const mgrNotifId = `notif_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
            await kv.set(`notification:${mgrNotifId}`, {
              id: mgrNotifId,
              employee_id: manager.id,
              title: 'Contract Expiry — Routine Notice',
              title_ar: 'انتهاء عقد — إشعار دوري',
              message: `${emp.full_name}'s contract ends on ${contractEndFormatted} (${daysUntilEnd} days remaining). The employee has been informed. This is for your planning purposes.`,
              message_ar: `ينتهي عقد ${emp.full_name_ar || emp.full_name} بتاريخ ${contractEndFormatted} (${daysUntilEnd} يوماً متبقياً). تم إبلاغ الموظف. هذا للتخطيط الإداري.`,
              type: 'contract_expiry_info',
              read: false,
              created_at: nowISO,
              metadata: { employee_id: emp.id, contract_end_date: emp.contract_end_date }
            });

            if (manager.email) {
              await sendEmail(manager.email, 'contractExpiryHRManager', {
                recipientName: manager.full_name || 'Manager',
                employeeName: emp.full_name || 'Employee',
                employeeNameAr: emp.full_name_ar || emp.full_name,
                contractEndDate: contractEndFormatted,
                daysRemaining: daysUntilEnd,
                noticeDeadline: noticeDeadlineFormatted,
                portalUrl: 'https://portal.yahala.co'
              }, 'en');
              await sendEmail(manager.email, 'contractExpiryHRManager', {
                recipientName: manager.full_name_ar || manager.full_name || 'المدير',
                employeeName: emp.full_name || 'Employee',
                employeeNameAr: emp.full_name_ar || emp.full_name,
                contractEndDate: contractEndFormatted,
                daysRemaining: daysUntilEnd,
                noticeDeadline: noticeDeadlineFormatted,
                portalUrl: 'https://portal.yahala.co'
              }, 'ar');
            }
          }
        }

        // 3. Portal notification + email to all HR employees (role === 'manager' with no specific target or role === 'hr')
        const hrEmployees = allEmployees.filter((e: any) =>
          e.role === 'manager' && e.id !== emp.manager_id && e.email && !e.deleted_at
        );
        for (const hr of hrEmployees) {
          const hrNotifId = `notif_${Date.now() + 2}_${Math.random().toString(36).substr(2, 9)}`;
          await kv.set(`notification:${hrNotifId}`, {
            id: hrNotifId,
            employee_id: hr.id,
            title: 'Contract Expiry — Routine Notice',
            title_ar: 'انتهاء عقد — إشعار دوري',
            message: `${emp.full_name}'s contract ends on ${contractEndFormatted}. Routine administrative notice.`,
            message_ar: `ينتهي عقد ${emp.full_name_ar || emp.full_name} بتاريخ ${contractEndFormatted}. إشعار إداري دوري.`,
            type: 'contract_expiry_info',
            read: false,
            created_at: nowISO,
            metadata: { employee_id: emp.id }
          });
          if (hr.email) {
            await sendEmail(hr.email, 'contractExpiryHRManager', {
              recipientName: hr.full_name || 'HR',
              employeeName: emp.full_name || 'Employee',
              employeeNameAr: emp.full_name_ar || emp.full_name,
              contractEndDate: contractEndFormatted,
              daysRemaining: daysUntilEnd,
              noticeDeadline: noticeDeadlineFormatted,
              portalUrl: 'https://portal.yahala.co'
            }, 'en');
          }
        }

        // Mark alert as sent (keyed to the contract_end_date to prevent re-sending)
        await kv.set(alertKey, { sent_at: nowISO, days_remaining: daysUntilEnd });

        alertsSent.push({
          employee_id: emp.id,
          employee_name: emp.full_name,
          contract_end_date: emp.contract_end_date,
          days_remaining: daysUntilEnd
        });
        console.log(`✅ Contract expiry alert sent for employee ${emp.id} (${emp.full_name}), ${daysUntilEnd} days remaining`);
      } catch (empError) {
        console.error(`Error processing contract alert for employee ${emp.id}:`, empError);
      }
    }

    return c.json({
      success: true,
      checked: activeEmployees.length,
      alerts_sent: alertsSent.length,
      alerts: alertsSent,
      message: alertsSent.length === 0
        ? 'No contracts in the 60-70 day alert window today'
        : `${alertsSent.length} contract expiry alert(s) sent`
    });
  } catch (error) {
    console.error('Check contract alerts error:', error);
    return c.json({ success: false, message: `Error checking contract alerts: ${error.message}` }, 500);
  }
});

// ── GET /admin/contracts-expiring ─────────────────────────────────────────────
// Returns employees with contracts expiring within the next `days` days (default 90).
// Used by the dashboard widget — does NOT send any emails.
// Protected by the admin session middleware (X-Admin-Token required, see line 75).
app.get('/make-server-fdcde35a/admin/contracts-expiring', async (c) => {
  try {
    const withinDays = parseInt(c.req.query('days') || '90');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEmployees = await getValuesByPrefix('employee:');
    const activeWithContract = allEmployees.filter(
      (emp: any) => emp && !emp.deleted_at && emp.contract_end_date
    );

    const expiring: any[] = [];

    for (const emp of activeWithContract) {
      try {
        const contractEnd = new Date(emp.contract_end_date);
        if (isNaN(contractEnd.getTime())) continue;   // skip invalid dates
        contractEnd.setHours(0, 0, 0, 0);
        const daysUntilEnd = Math.ceil(
          (contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilEnd >= 0 && daysUntilEnd <= withinDays) {
          let companyName: string | null = null;
          try {
            if (emp.company_id) {
              const company = await kv.get(`company:${emp.company_id}`);
              companyName = company?.name || null;
            }
          } catch { /* ignore */ }

          let alertSent = false;
          try {
            alertSent = !!(await kv.get(`contract_alert:${emp.id}:${emp.contract_end_date}`));
          } catch { /* ignore */ }

          expiring.push({
            id:                emp.id,
            full_name:         emp.full_name         ?? null,
            full_name_ar:      emp.full_name_ar       ?? null,
            position:          emp.position           ?? null,
            position_ar:       emp.position_ar        ?? null,
            role:              emp.role               ?? 'employee',
            company_id:        emp.company_id         ?? null,
            company_name:      companyName,
            contract_end_date: emp.contract_end_date,
            days_remaining:    daysUntilEnd,
            // Alert state: already notified at 70-day mark?
            alert_sent:        alertSent
          });
        }
      } catch (empErr) {
        // Skip individual employee errors rather than crashing the whole request
        console.error(`contracts-expiring: skipping emp ${emp?.id}:`, empErr);
      }
    }

    // Sort: soonest first
    expiring.sort((a, b) => a.days_remaining - b.days_remaining);

    // Explicitly serialise to avoid any double-response edge cases with Hono
    const payload = JSON.stringify({ success: true, contracts: expiring, total: expiring.length });
    return new Response(payload, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    console.error('contracts-expiring error:', error);
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ── POST /admin/seed-role-employees ──────────────────────────────────────────
// Idempotent: adds the missing role-based demo employees (manager, accountant,
// owner) if they are not yet in the KV store.  Safe to call on existing setups.
app.post('/make-server-fdcde35a/admin/seed-role-employees', async (c) => {
  try {
    const { sampleEmployees } = await import('./seed.tsx');
    const added: number[] = [];
    const skipped: number[] = [];

    for (const emp of sampleEmployees) {
      const existing = await kv.get(`employee:${emp.id}`);
      if (existing) {
        // If the existing record has no role, patch it silently
        if (!existing.role && emp.role) {
          const patched = {
            ...existing,
            role: emp.role,
            hire_date: existing.hire_date || emp.hire_date || null,
            contract_end_date: existing.contract_end_date || emp.contract_end_date || null,
            email: existing.email || emp.email || null,
            salary: existing.salary ?? emp.salary ?? null,
            status: existing.status || 'active',
            profile_completed: existing.profile_completed ?? true,
            limits: existing.limits || emp.limits
          };
          await kv.set(`employee:${emp.id}`, patched);
          added.push(emp.id); // Patched
        } else {
          skipped.push(emp.id);
        }
        continue;
      }
      // New employee — hash password before storing
      const hashedEmp = {
        ...emp,
        password: emp.password ? await hashPassword(emp.password) : undefined
      };
      await kv.set(`employee:${emp.id}`, hashedEmp);
      added.push(emp.id);
    }

    return c.json({
      success: true,
      message: `Role employees seeded: ${added.length} added/patched, ${skipped.length} already up-to-date`,
      added,
      skipped
    });
  } catch (error) {
    console.error('seed-role-employees error:', error);
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ── GET /make-server-fdcde35a/manager/contracts-expiring ──────────────────────
// Registered BEFORE app.route() so Hono matches this handler first, preventing
// the sub-router from intercepting the request and returning 404.
app.get('/make-server-fdcde35a/manager/contracts-expiring', async (c) => {
  try {
    const managerId  = c.req.query('manager_id');
    const withinDays = parseInt(c.req.query('days') || '90');

    if (!managerId) {
      return c.json({ success: false, message: 'manager_id is required' }, 400);
    }

    // Authorization: must be an elevated role
    const managerEmp = await kv.get(`employee:${managerId}`);
    const ALLOWED = new Set(['manager', 'admin', 'super_admin', 'accountant', 'owner']);
    if (!managerEmp || managerEmp.deleted_at || !ALLOWED.has(managerEmp.role)) {
      return c.json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        messageAr: 'تم رفض الوصول. صلاحيات غير كافية.'
      }, 403);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEmployees = await getValuesByPrefix('employee:');
    const active = allEmployees.filter(
      (emp: any) => emp && !emp.deleted_at && emp.contract_end_date
    );

    const expiring: any[] = [];

    for (const emp of active) {
      try {
        const contractEnd = new Date(emp.contract_end_date);
        if (isNaN(contractEnd.getTime())) continue;
        contractEnd.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil(
          (contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysRemaining >= 0 && daysRemaining <= withinDays) {
          let companyName: string | null = null;
          try {
            if (emp.company_id) {
              const company = await kv.get(`company:${emp.company_id}`);
              companyName = company?.name || null;
            }
          } catch { /* ignore */ }

          let alertSent = false;
          try {
            alertSent = !!(await kv.get(`contract_alert:${emp.id}:${emp.contract_end_date}`));
          } catch { /* ignore */ }

          expiring.push({
            id:                emp.id,
            full_name:         emp.full_name         ?? null,
            full_name_ar:      emp.full_name_ar       ?? null,
            position:          emp.position           ?? null,
            position_ar:       emp.position_ar        ?? null,
            role:              emp.role               ?? 'employee',
            company_id:        emp.company_id         ?? null,
            company_name:      companyName,
            contract_end_date: emp.contract_end_date,
            days_remaining:    daysRemaining,
            alert_sent:        alertSent
          });
        }
      } catch (empErr) {
        console.error(`manager/contracts-expiring: skipping emp ${emp?.id}:`, empErr);
      }
    }

    expiring.sort((a, b) => a.days_remaining - b.days_remaining);

    const payload = JSON.stringify({ success: true, contracts: expiring, total: expiring.length });
    return new Response(payload, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    console.error('manager/contracts-expiring route error:', error);
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== MANAGER / HR PORTAL ROUTES ====================
app.route('/make-server-fdcde35a/manager', managerRoutes);

// ==================== DOCUMENT EXPIRY ALERTS ====================
/**
 * GET /admin/check-document-expiry-alerts
 * Checks all employees for passport/iqama expiry within 30/60/90 days.
 * Sends email alerts once per expiry event (tracked in KV).
 */
app.get('/make-server-fdcde35a/admin/check-document-expiry-alerts', async (c) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nowISO = new Date().toISOString();
    const allEmployees = await getValuesByPrefix('employee:');
    const active = allEmployees.filter((e: any) => e && !e.deleted_at && e.status !== 'inactive');
    const alertsSent: any[] = [];

    const ALERT_WINDOWS = [30, 60, 90]; // days before expiry

    for (const emp of active) {
      const docs = [
        { field: 'passport_expiry', label: 'Passport', labelAr: 'جواز السفر', val: emp.extra_info?.passport_expiry || emp.passport_expiry },
        { field: 'iqama_expiry', label: 'Iqama (Residence Permit)', labelAr: 'الإقامة', val: emp.extra_info?.iqama_expiry || emp.iqama_expiry },
        { field: 'work_permit_expiry', label: 'Work Permit', labelAr: 'تصريح العمل', val: emp.extra_info?.work_permit_expiry || emp.work_permit_expiry },
      ];

      for (const doc of docs) {
        if (!doc.val) continue;
        try {
          const expiryDate = new Date(doc.val); expiryDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          for (const window of ALERT_WINDOWS) {
            if (daysUntil > window || daysUntil < window - 5) continue;
            const alertKey = `doc_expiry_alert:${emp.id}:${doc.field}:${doc.val}:${window}`;
            const alreadySent = await kv.get(alertKey);
            if (alreadySent) continue;

            const expiryFormatted = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            // Portal notification for employee
            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await kv.set(`notification:${notifId}`, {
              id: notifId,
              employee_id: emp.id,
              title: `${doc.label} Expiry Alert — ${window} Days`,
              title_ar: `تنبيه انتهاء ${doc.labelAr} — ${window} يوم`,
              message: `Your ${doc.label} expires on ${expiryFormatted} (${daysUntil} days remaining). Please renew it before expiry.`,
              message_ar: `ينتهي ${doc.labelAr} بتاريخ ${expiryFormatted} (${daysUntil} يوم متبقي). يرجى تجديده قبل انتهاء الصلاحية.`,
              type: 'document_expiry',
              read: false,
              created_at: nowISO,
              metadata: { document: doc.field, expiry_date: doc.val, days_remaining: daysUntil }
            });

            // Email to employee
            if (emp.email) {
              await sendEmail(emp.email, 'approvalNeeded', {
                managerName: emp.full_name || 'Employee',
                employeeName: emp.full_name || 'Employee',
                requestType: `${doc.label} Expiry Alert`,
                requestTypeAr: `تنبيه انتهاء ${doc.labelAr}`,
                requestId: `DOC-${daysUntil}D`,
                submittedAt: nowISO,
                details: `Your ${doc.label} expires on ${expiryFormatted} (${daysUntil} days). Please renew immediately to avoid issues.`,
                portalUrl: 'https://portal.yahala.co'
              }, 'en');
            }

            // Email to HR (can_approve_requests)
            const hrList = allEmployees.filter((e: any) => e.can_approve_requests && !e.deleted_at && e.email);
            for (const hr of hrList) {
              await sendEmail(hr.email, 'approvalNeeded', {
                managerName: hr.full_name || 'HR',
                employeeName: emp.full_name || 'Employee',
                requestType: `${doc.label} Expiry Alert`,
                requestTypeAr: `تنبيه انتهاء ${doc.labelAr}`,
                requestId: `DOC-${daysUntil}D`,
                submittedAt: nowISO,
                details: `${emp.full_name}'s ${doc.label} expires on ${expiryFormatted} (${daysUntil} days remaining). Action required.`,
                portalUrl: 'https://portal.yahala.co'
              }, 'en');
            }

            await kv.set(alertKey, { sent_at: nowISO, days_remaining: daysUntil });
            alertsSent.push({ employee_id: emp.id, document: doc.field, days_remaining: daysUntil });
            console.log(`✅ Document expiry alert: ${emp.full_name} — ${doc.label} — ${daysUntil} days`);
          }
        } catch (docErr) {
          console.error(`Error processing doc expiry for emp ${emp.id}:`, docErr);
        }
      }
    }

    return c.json({ success: true, alertsSent, total: alertsSent.length,
      message: alertsSent.length === 0 ? 'No document expiry alerts needed today' : `${alertsSent.length} document expiry alert(s) sent` });
  } catch (error) {
    console.error('check-document-expiry-alerts error:', error);
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// GET /admin/document-expiry-report — list of employees with expiring docs
app.get('/make-server-fdcde35a/admin/document-expiry-report', async (c) => {
  try {
    const withinDays = parseInt(c.req.query('days') || '90');
    const today = new Date(); today.setHours(0,0,0,0);
    const allEmployees = await getValuesByPrefix('employee:');
    const active = allEmployees.filter((e: any) => e && !e.deleted_at && e.status !== 'inactive');
    const expiring: any[] = [];

    for (const emp of active) {
      const docs = [
        { field: 'passport_expiry', label: 'Passport', labelAr: 'جواز السفر', val: emp.extra_info?.passport_expiry || emp.passport_expiry },
        { field: 'iqama_expiry', label: 'Iqama', labelAr: 'الإقامة', val: emp.extra_info?.iqama_expiry || emp.iqama_expiry },
        { field: 'work_permit_expiry', label: 'Work Permit', labelAr: 'تصريح العمل', val: emp.extra_info?.work_permit_expiry || emp.work_permit_expiry },
        { field: 'reentry_visa_expiry', label: 'Re-Entry Visa', labelAr: 'تأشيرة الخروج والعودة', val: emp.extra_info?.reentry_visa_expiry || emp.reentry_visa_expiry },
      ];
      for (const doc of docs) {
        if (!doc.val) continue;
        try {
          const expiryDate = new Date(doc.val); expiryDate.setHours(0,0,0,0);
          const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= withinDays) {
            expiring.push({
              employee_id: emp.id,
              full_name: emp.full_name,
              full_name_ar: emp.full_name_ar,
              position: emp.position,
              company_id: emp.company_id,
              document: doc.field,
              document_label: doc.label,
              document_label_ar: doc.labelAr,
              expiry_date: doc.val,
              days_remaining: daysUntil,
              is_expired: daysUntil < 0
            });
          }
        } catch { /* skip */ }
      }
    }

    expiring.sort((a, b) => a.days_remaining - b.days_remaining);
    return c.json({ success: true, expiring, total: expiring.length });
  } catch (error) {
    console.error('document-expiry-report error:', error);
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== TICKET BANDS MANAGEMENT ====================

// GET /admin/ticket-bands — Get all ticket price bands
app.get('/make-server-fdcde35a/admin/ticket-bands', async (c) => {
  try {
    const config = (await kv.get('system_config:ticket_bands')) || { bands: getDefaultBands() };
    return c.json({ success: true, bands: config.bands });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

function getDefaultBands() {
  return [
    { id: 'band_beirut', destination: 'Beirut', destination_ar: 'بيروت', country: 'Lebanon', country_ar: 'لبنان', min_sar: 1500, max_sar: 2300 },
    { id: 'band_cairo', destination: 'Cairo', destination_ar: 'القاهرة', country: 'Egypt', country_ar: 'مصر', min_sar: 1500, max_sar: 1700 },
    { id: 'band_alexandria', destination: 'Alexandria', destination_ar: 'الإسكندرية', country: 'Egypt', country_ar: 'مصر', min_sar: 1500, max_sar: 1750 },
    { id: 'band_amman', destination: 'Amman', destination_ar: 'عمّان', country: 'Jordan', country_ar: 'الأردن', min_sar: 1500, max_sar: 1750 },
    { id: 'band_trivandrum', destination: 'Trivandrum', destination_ar: 'تريفاندروم', country: 'India', country_ar: 'الهند', min_sar: 1500, max_sar: 2200 },
    { id: 'band_pakistan', destination: 'Pakistan (from Arar)', destination_ar: 'باكستان (من عرعر)', country: 'Pakistan', country_ar: 'باكستان', min_sar: 1500, max_sar: 2000 },
  ];
}

// POST /admin/ticket-bands — Create a new band
app.post('/make-server-fdcde35a/admin/ticket-bands', async (c) => {
  try {
    const { destination, destination_ar, country, country_ar, min_sar, max_sar } = await c.req.json();
    if (!destination || !max_sar) return c.json({ success: false, message: 'destination and max_sar are required' }, 400);
    const config = (await kv.get('system_config:ticket_bands')) || { bands: getDefaultBands() };
    const newBand = {
      id: `band_${Date.now()}`,
      destination, destination_ar: destination_ar || destination,
      country: country || '', country_ar: country_ar || country || '',
      min_sar: min_sar || 1500, max_sar
    };
    config.bands = [...(config.bands || []), newBand];
    await kv.set('system_config:ticket_bands', config);
    return c.json({ success: true, band: newBand });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// PATCH /admin/ticket-bands/:id — Update a band
app.patch('/make-server-fdcde35a/admin/ticket-bands/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const config = (await kv.get('system_config:ticket_bands')) || { bands: getDefaultBands() };
    config.bands = (config.bands || []).map((b: any) => b.id === id ? { ...b, ...updates } : b);
    await kv.set('system_config:ticket_bands', config);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// DELETE /admin/ticket-bands/:id — Delete a band
app.delete('/make-server-fdcde35a/admin/ticket-bands/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const config = (await kv.get('system_config:ticket_bands')) || { bands: getDefaultBands() };
    config.bands = (config.bands || []).filter((b: any) => b.id !== id);
    await kv.set('system_config:ticket_bands', config);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== OPERATIONS TEAM MANAGEMENT ====================

// GET /admin/operations-team — Get operations team members
app.get('/make-server-fdcde35a/admin/operations-team', async (c) => {
  try {
    const config = (await kv.get('system_config:operations_team')) || { members: [] };
    return c.json({ success: true, members: config.members });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// POST /admin/operations-team — Add an operations member
app.post('/make-server-fdcde35a/admin/operations-team', async (c) => {
  try {
    const { name, name_ar, email, phone } = await c.req.json();
    if (!name || !email) return c.json({ success: false, message: 'name and email are required' }, 400);
    const config = (await kv.get('system_config:operations_team')) || { members: [] };
    const member = { id: `ops_${Date.now()}`, name, name_ar: name_ar || name, email, phone: phone || '', created_at: new Date().toISOString() };
    config.members = [...(config.members || []), member];
    await kv.set('system_config:operations_team', config);
    return c.json({ success: true, member });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// DELETE /admin/operations-team/:id — Remove a member
app.delete('/make-server-fdcde35a/admin/operations-team/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const config = (await kv.get('system_config:operations_team')) || { members: [] };
    config.members = (config.members || []).filter((m: any) => m.id !== id);
    await kv.set('system_config:operations_team', config);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== TICKET BALANCE ====================

// GET /admin/ticket-balance/:employeeId — Get ticket usage for employee
app.get('/make-server-fdcde35a/admin/ticket-balance/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const employee = await kv.get(`employee:${employeeId}`);
    if (!employee) return c.json({ success: false, message: 'Employee not found' }, 404);

    const thisYear = new Date().getFullYear();
    const nextYear = thisYear + 1;

    // Check annual ticket eligibility
    let annualTicketEligible = false;
    let eligibleDate: string | null = null;
    if (employee.hire_date) {
      const hire = new Date(employee.hire_date);
      const elig = new Date(hire); elig.setFullYear(elig.getFullYear() + 1);
      const today = new Date(); today.setHours(0,0,0,0); elig.setHours(0,0,0,0);
      annualTicketEligible = today >= elig;
      if (!annualTicketEligible) eligibleDate = elig.toISOString().split('T')[0];
    }

    // Get ticket balance for this year and next
    const thisYearBal = (await kv.get(`ticket_balance:${employeeId}:${thisYear}`)) || { used: 0, special_case_used: 0 };
    const nextYearBal = (await kv.get(`ticket_balance:${employeeId}:${nextYear}`)) || { used: 0, special_case_used: 0 };

    // Get ticket requests
    const allRequests = await getValuesByPrefix('request:');
    const ticketReqs = allRequests.filter((r: any) =>
      r && r.employee_id?.toString() === employeeId.toString() && r.type === 'ticket'
    );

    const usedThisYear = ticketReqs.filter((r: any) => {
      const y = new Date(r.created_at).getFullYear();
      return y === thisYear && r.status === 'approved' && !r.deduct_from_next_year;
    }).length;

    const specialCaseThisYear = ticketReqs.filter((r: any) => {
      const y = new Date(r.created_at).getFullYear();
      return y === thisYear && r.is_special_case && r.status === 'approved';
    }).length;

    const pendingThisYear = ticketReqs.filter((r: any) => {
      const y = new Date(r.created_at).getFullYear();
      return y === thisYear && r.status === 'pending';
    }).length;

    return c.json({
      success: true,
      employee: { id: employee.id, full_name: employee.full_name, hire_date: employee.hire_date },
      annualTicketEligible,
      eligibleDate,
      currentYear: thisYear,
      balance: {
        thisYear: { allowed: 1, used: usedThisYear, special_case: specialCaseThisYear, pending: pendingThisYear, available: Math.max(0, 1 - usedThisYear - pendingThisYear) },
        nextYear: { deducted: specialCaseThisYear } // special cases deduct from next year
      },
      ticketHistory: ticketReqs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// GET /admin/ticket-bands-public — Public endpoint for employee portal
app.get('/make-server-fdcde35a/ticket-bands', async (c) => {
  try {
    const config = (await kv.get('system_config:ticket_bands')) || { bands: getDefaultBands() };
    return c.json({ success: true, bands: config.bands });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== EMPLOYEE SELF-VIEW: DOCUMENT EXPIRY ====================

// GET /employee-document-expiry/:employeeId — Own documents only (no admin token)
app.get('/make-server-fdcde35a/employee-document-expiry/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const emp = await kv.get(`employee:${employeeId}`);
    if (!emp) return c.json({ success: false, message: 'Employee not found' }, 404);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const docs = [
      { field: 'passport_expiry',     label: 'Passport',          labelAr: 'جواز السفر',              val: emp.extra_info?.passport_expiry     || emp.passport_expiry },
      { field: 'iqama_expiry',        label: 'Iqama (Residency)', labelAr: 'الإقامة',                  val: emp.extra_info?.iqama_expiry        || emp.iqama_expiry },
      { field: 'work_permit_expiry',  label: 'Work Permit',       labelAr: 'تصريح العمل',              val: emp.extra_info?.work_permit_expiry  || emp.work_permit_expiry },
      { field: 'contract_end_date',   label: 'Contract',          labelAr: 'العقد',                    val: emp.contract_end_date },
      { field: 'reentry_visa_expiry', label: 'Re-Entry Visa',     labelAr: 'تأشيرة الخروج والعودة',   val: emp.extra_info?.reentry_visa_expiry || emp.reentry_visa_expiry },
    ];

    const documents = docs.map(doc => {
      if (!doc.val) return null;
      try {
        const expiry = new Date(doc.val); expiry.setHours(0, 0, 0, 0);
        const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
        return { field: doc.field, label: doc.label, labelAr: doc.labelAr, expiry_date: doc.val, days_remaining: days, is_expired: days < 0 };
      } catch { return null; }
    }).filter(Boolean);

    return c.json({ success: true, documents });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== MANAGER: TEAM DOCUMENT EXPIRY ====================

// GET /manager/team-document-expiry?manager_id=X&days=90
app.get('/make-server-fdcde35a/manager/team-document-expiry', async (c) => {
  try {
    const managerId = c.req.query('manager_id');
    const withinDays = parseInt(c.req.query('days') || '90');
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const allEmployees = await getValuesByPrefix('employee:');
    const teamMembers = managerId
      ? allEmployees.filter((e: any) => e && !e.deleted_at && e.status !== 'inactive' && e.manager_id?.toString() === managerId.toString())
      : allEmployees.filter((e: any) => e && !e.deleted_at && e.status !== 'inactive');

    const alerts: any[] = [];
    for (const emp of teamMembers) {
      const docs = [
        { field: 'passport_expiry',     label: 'Passport',        labelAr: 'جواز السفر',            val: emp.extra_info?.passport_expiry     || emp.passport_expiry },
        { field: 'iqama_expiry',        label: 'Iqama',           labelAr: 'الإقامة',                val: emp.extra_info?.iqama_expiry        || emp.iqama_expiry },
        { field: 'work_permit_expiry',  label: 'Work Permit',     labelAr: 'تصريح العمل',            val: emp.extra_info?.work_permit_expiry  || emp.work_permit_expiry },
        { field: 'contract_end_date',   label: 'Contract',        labelAr: 'العقد',                  val: emp.contract_end_date },
        { field: 'reentry_visa_expiry', label: 'Re-Entry Visa',   labelAr: 'تأشيرة الخروج والعودة', val: emp.extra_info?.reentry_visa_expiry || emp.reentry_visa_expiry },
      ];
      for (const doc of docs) {
        if (!doc.val) continue;
        try {
          const expiry = new Date(doc.val); expiry.setHours(0, 0, 0, 0);
          const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
          if (days <= withinDays) {
            alerts.push({
              employee_id: emp.id, full_name: emp.full_name, full_name_ar: emp.full_name_ar,
              position: emp.position, field: doc.field, label: doc.label, labelAr: doc.labelAr,
              expiry_date: doc.val, days_remaining: days, is_expired: days < 0
            });
          }
        } catch { /* skip */ }
      }
    }
    alerts.sort((a, b) => a.days_remaining - b.days_remaining);
    return c.json({ success: true, alerts, total: alerts.length });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== TICKET BAND BY NATIONALITY LOOKUP ====================

// Nationality → country mapping table
const NATIONALITY_TO_COUNTRY: Record<string, string> = {
  lebanese: 'lebanon', egyptian: 'egypt', indian: 'india', pakistani: 'pakistan',
  bangladeshi: 'bangladesh', philippine: 'philippines', filipino: 'philippines',
  indonesian: 'indonesia', nepali: 'nepal', 'sri lankan': 'sri lanka',
  jordanian: 'jordan', syrian: 'syria', yemeni: 'yemen', sudanese: 'sudan',
  somali: 'somalia', ethiopian: 'ethiopia', kenyan: 'kenya', ghanaian: 'ghana',
  nigerian: 'nigeria', moroccan: 'morocco', tunisian: 'tunisia', algerian: 'algeria',
  turkish: 'turkey', irani: 'iran', iraqi: 'iraq', afghan: 'afghanistan',
};

// GET /ticket-band-by-nationality?nationality=Egyptian
app.get('/make-server-fdcde35a/ticket-band-by-nationality', async (c) => {
  try {
    const raw = (c.req.query('nationality') || '').toLowerCase().trim();
    const country = NATIONALITY_TO_COUNTRY[raw] || raw; // fall back to raw as country name

    const config = (await kv.get('system_config:ticket_bands')) || { bands: getDefaultBands() };
    const bands: any[] = config.bands || [];

    // Find best match: exact country match first, then partial
    const matched = bands.find((b: any) => b.country?.toLowerCase() === country)
      || bands.find((b: any) => b.country?.toLowerCase().includes(country) || country.includes(b.country?.toLowerCase()));

    return c.json({ success: true, band: matched || null, country_searched: country });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== SPECIAL CASE APPROVAL ====================
// Mark a special-case ticket as approved and update balance
app.post('/make-server-fdcde35a/admin/approve-special-ticket/:requestId', async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const { notes } = await c.req.json().catch(() => ({ notes: '' }));
    const request = await kv.get(`request:${requestId}`);
    if (!request) return c.json({ success: false, message: 'Request not found' }, 404);

    const nextYear = new Date().getFullYear() + 1;
    // Deduct from next year balance
    const nextYearKey = `ticket_balance:${request.employee_id}:${nextYear}`;
    const nextYearBal = (await kv.get(nextYearKey)) || { used: 0, special_case_used: 0 };
    nextYearBal.special_case_used = (nextYearBal.special_case_used || 0) + 1;
    await kv.set(nextYearKey, nextYearBal);

    // Approve the request
    const updated = { ...request, status: 'approved', special_case_approved: true, approval_notes: notes, processed_at: new Date().toISOString() };
    await kv.set(`request:${requestId}`, updated);

    return c.json({ success: true, message: 'Special case ticket approved and deducted from next year balance' });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// ==================== HR-ACCESSIBLE DOCUMENT EXPIRY (no admin token required) ====================
// GET /hr/document-expiry-report — same logic as admin version but accessible to HR/Manager roles
app.get('/make-server-fdcde35a/hr/document-expiry-report', async (c) => {
  try {
    const employeeId = c.req.query('employee_id');
    if (!employeeId) {
      return c.json({ success: false, message: 'employee_id is required for HR access' }, 400);
    }

    // Verify the caller is a manager or has can_approve_requests
    const caller = await kv.get(`employee:${employeeId}`);
    if (!caller || caller.deleted_at) {
      return c.json({ success: false, message: 'Employee not found' }, 404);
    }
    if (caller.role !== 'manager' && caller.role !== 'owner' && !caller.can_approve_requests) {
      return c.json({ success: false, message: 'Insufficient permissions. Only HR/Manager can access this report.' }, 403);
    }

    const withinDays = parseInt(c.req.query('days') || '90');
    const today = new Date(); today.setHours(0,0,0,0);
    const allEmployees = await getValuesByPrefix('employee:');
    const active = allEmployees.filter((e: any) => e && !e.deleted_at && e.status !== 'inactive');
    const expiring: any[] = [];

    for (const emp of active) {
      const docs = [
        { field: 'passport_expiry', label: 'Passport', labelAr: 'جواز السفر', val: emp.extra_info?.passport_expiry || emp.passport_expiry },
        { field: 'iqama_expiry', label: 'Iqama', labelAr: 'الإقامة', val: emp.extra_info?.iqama_expiry || emp.iqama_expiry },
        { field: 'work_permit_expiry', label: 'Work Permit', labelAr: 'تصريح العمل', val: emp.extra_info?.work_permit_expiry || emp.work_permit_expiry },
        { field: 'reentry_visa_expiry', label: 'Re-Entry Visa', labelAr: 'تأشيرة الخروج والعودة', val: emp.extra_info?.reentry_visa_expiry || emp.reentry_visa_expiry },
      ];
      for (const doc of docs) {
        if (!doc.val) continue;
        try {
          const expiryDate = new Date(doc.val); expiryDate.setHours(0,0,0,0);
          const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= withinDays) {
            expiring.push({
              employee_id: emp.id,
              full_name: emp.full_name,
              full_name_ar: emp.full_name_ar,
              position: emp.position,
              company_id: emp.company_id,
              document: doc.field,
              document_label: doc.label,
              document_label_ar: doc.labelAr,
              expiry_date: doc.val,
              days_remaining: daysUntil,
              is_expired: daysUntil < 0
            });
          }
        } catch { /* skip */ }
      }
    }

    expiring.sort((a, b) => a.days_remaining - b.days_remaining);
    return c.json({ success: true, expiring, total: expiring.length });
  } catch (error) {
    console.error('hr/document-expiry-report error:', error);
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

// POST /hr/check-document-expiry-alerts — HR-accessible alert sender
app.post('/make-server-fdcde35a/hr/check-document-expiry-alerts', async (c) => {
  try {
    const { employee_id } = await c.req.json().catch(() => ({ employee_id: null }));
    if (!employee_id) {
      return c.json({ success: false, message: 'employee_id required' }, 400);
    }
    const caller = await kv.get(`employee:${employee_id}`);
    if (!caller || caller.deleted_at || (caller.role !== 'manager' && caller.role !== 'owner' && !caller.can_approve_requests)) {
      return c.json({ success: false, message: 'Insufficient permissions' }, 403);
    }
    return c.json({ success: true, total: 0, message: 'Alert check completed. Use admin panel for full alert dispatch.' });
  } catch (error) {
    return c.json({ success: false, message: `Error: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch); 