import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Download, Edit2, Trash2, UserCheck, UserX,
  Calendar, Mail, Phone, Building2, User,
  History, Banknote, MapPin,
  X, Save, RefreshCw,
  Globe, Briefcase, CheckCircle2,
  Key, Eye, Shield,
  FileText, Users, Upload, Table,
  CalendarDays, IdCard, Heart, CreditCard
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { EmployeeRequestHistory } from '../components/EmployeeRequestHistory';
import { BulkEmployeeImport } from '../components/BulkEmployeeImport';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { adminFetch } from '../utils/adminApi';
import { sendPasswordResetEmail } from '../utils/emailService';

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface EmployeeManagementProps {
  onBack: () => void;
  /** When 'hr', uses manager-accessible endpoints and hides admin-only actions */
  callerRole?: 'admin' | 'hr';
  /** HR permissions from ManagerDashboard (only used when callerRole='hr') */
  hrPermissions?: {
    can_edit_employee_info: boolean;
    can_edit_financial_info: boolean;
    can_upload_documents: boolean;
    can_cancel_requests?: boolean;
  };
  /** The logged-in HR manager's employee ID (used as manager_id in API calls) */
  hrManagerId?: number;
}

interface Employee {
  id: number;
  full_name: string;
  full_name_ar?: string;
  email?: string;
  phone?: string;
  position?: string;
  position_ar?: string;
  company_id?: number;
  iban?: string;
  bank_name?: string;
  date_of_birth?: string;
  nationality?: string;
  iqama?: string;
  hire_date?: string | null;
  contract_end_date?: string | null;
  salary?: number;
  status?: 'active' | 'inactive';
  gender?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  manager_id?: number;
  role?: 'employee' | 'manager' | 'accountant' | 'owner';
  can_approve_requests?: boolean;
  extra_info?: {
    passport_expiry?: string;
    iqama_expiry?: string;
    work_permit_expiry?: string;
    reentry_visa_expiry?: string;
    passport_number?: string;
    [key: string]: string | undefined;
  };
  companies?: { name: string };
}

interface Company { id: number; name: string; slug: string; }

interface LeaveBalance {
  allowance: number; approved: number; pending: number;
  cancelled: number; adjustment: number; available: number;
  adjustmentHistory?: any[];
}
interface BalanceData {
  employee: any; financialYear: string;
  annualEligible: boolean; eligibleDate: string | null;
  balances: Record<string, LeaveBalance>;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
function getAvatarColor(id: number) {
  const palette = [
    'bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500',
    'bg-rose-500','bg-amber-500','bg-cyan-500','bg-teal-500',
  ];
  return palette[id % palette.length];
}

function getDaysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function DocExpiryPill({ date, label }: { date?: string; label: string }) {
  const { t } = useLanguage();
  const days = getDaysLeft(date);
  if (days === null)
    return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium">{label} —</span>;
  const cls = days < 0
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : days <= 30
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    : days <= 60
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>
      {label}
      {days < 0 ? ` ${t('Exp', 'منتهي')}` : days <= 60 ? ` ${days}d` : ' ✓'}
    </span>
  );
}

function ExpiryRow({ label, labelAr, date, number: num }: { label: string; labelAr: string; date?: string; number?: string }) {
  const { t } = useLanguage();
  const days = getDaysLeft(date);
  const statusCls = days === null ? 'text-muted-foreground' :
    days < 0 ? 'text-red-600 dark:text-red-400 font-semibold' :
    days <= 30 ? 'text-orange-600 dark:text-orange-400 font-semibold' :
    days <= 60 ? 'text-amber-600 dark:text-amber-400' :
    'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm font-medium">{t(label, labelAr)}</p>
        {num && <p className="text-xs text-muted-foreground mt-0.5">{t('No.', 'رقم:')} {num}</p>}
      </div>
      <div className="text-right">
        {date ? (
          <>
            <p className={`text-sm ${statusCls}`}>{date}</p>
            {days !== null && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {days < 0 ? t('Expired', 'منتهي الصلاحية') :
                  days === 0 ? t('Expires today!', 'ينتهي اليوم!') :
                  `${days} ${t('days left', 'يوم متبقي')}`}
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{t('Not set', 'غير محدد')}</span>
        )}
      </div>
    </div>
  );
}

function LeaveTypeBar({ label, labelAr, used, available, total, color }: {
  label: string; labelAr: string; used: number; available: number; total: number; color: string;
}) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t(label, labelAr)}</span>
        <span className="text-muted-foreground text-xs">{used} / {total} {t('days used', 'أيام مستخدمة')}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{available} {t('available', 'متاح')}</span>
        <span style={{ color }}>{Math.round(pct)}% {t('used', 'مستخدم')}</span>
      </div>
    </div>
  );
}

const ROLE_BADGE: Record<string, { en: string; ar: string; cls: string }> = {
  manager:    { en: 'Manager/HR', ar: 'مدير/HR', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accountant: { en: 'Accountant', ar: 'محاسب', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  owner:      { en: 'Owner', ar: 'مالك', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

const LEAVE_TYPES = [
  { id: 'annual', label: 'Annual Leave', labelAr: 'إجازة سنوية', color: '#006B7D' },
  { id: 'sick', label: 'Sick Leave', labelAr: 'إجازة مرضية', color: '#DC2626' },
  { id: 'emergency', label: 'Emergency Leave', labelAr: 'إجازة طارئة', color: '#EA580C' },
  { id: 'unpaid', label: 'Unpaid Leave', labelAr: 'إجازة بدون راتب', color: '#92400E' },
];

/* ─── Main Component ───────────────────────────────────────────────────────── */
export function EmployeeManagement({
  onBack,
  callerRole = 'admin',
  hrPermissions,
  hrManagerId,
}: EmployeeManagementProps) {
  const { t, language } = useLanguage();
  const { adminInfo, employee: authEmployee } = useAuth() as any;

  const isHR = callerRole === 'hr';

  // Super Admin check — only the master admin login has role 'super_admin'
  const isSuperAdmin = !isHR && adminInfo?.role === 'super_admin';

  // HR can edit info / upload docs only if admin granted the permission
  const canEditInfo = isHR ? (hrPermissions?.can_edit_employee_info ?? false) : true;
  const canUploadDocs = isHR ? (hrPermissions?.can_upload_documents ?? false) : true;

  // List state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('personal');
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<any>({});

  // Leave balance
  const [leaveData, setLeaveData] = useState<BalanceData | null>(null);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState<{ type: string; open: boolean }>({ type: '', open: false });
  const [adjustDays, setAdjustDays] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustReasonAr, setAdjustReasonAr] = useState('');

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);

  // Add dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [skipSetup, setSkipSetup] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    id: '', full_name: '', full_name_ar: '', email: '', phone: '', password: '',
    company_id: '', position: '', position_ar: '', iban: '', bank_name: '',
    date_of_birth: '', nationality: '', iqama: '', hire_date: '', salary: '',
    status: 'active', gender: '', address: '', emergency_contact: '',
    emergency_phone: '', manager_id: '', role: 'employee'
  });

  // Password reset
  const [pwResetOpen, setPwResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Bulk import
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let f = [...employees];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(e =>
        e.full_name?.toLowerCase().includes(q) ||
        e.full_name_ar?.toLowerCase().includes(q) ||
        e.id?.toString().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.position?.toLowerCase().includes(q)
      );
    }
    if (filterCompany !== 'all') f = f.filter(e => e.company_id === parseInt(filterCompany));
    if (filterStatus !== 'all') f = f.filter(e => (e.status || 'active') === filterStatus);
    setFilteredEmployees(f);
  }, [employees, searchQuery, filterCompany, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchCompanies()]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      let res: Response;
      if (isHR) {
        res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/team-members?manager_id=${hrManagerId}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
      } else {
        res = await adminFetch('/admin/employees');
      }
      const data = await res.json();
      if (data.success) setEmployees(data.employees || []);
    } catch (e) { console.error(e); }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/companies`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } });
      const data = await res.json();
      if (data.success) setCompanies(data.companies || []);
    } catch (e) { console.error(e); }
  };

  const fetchLeave = async (empId: number) => {
    setLoadingLeave(true);
    setLeaveData(null);
    try {
      let res: Response;
      if (isHR) {
        res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/leave-balances/${empId}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
      } else {
        res = await adminFetch(`/admin/leave-balances/${empId}`);
      }
      const data = await res.json();
      if (data.success) setLeaveData(data);
    } catch (e) { console.error(e); }
    finally { setLoadingLeave(false); }
  };

  const openDetail = (emp: Employee, tab = 'personal') => {
    setDetailEmployee(emp);
    setDetailTab(tab);
    setEditMode(false);
    setEditDraft({});
    setLeaveData(null);
    setDetailOpen(true);
    if (tab === 'leave') fetchLeave(emp.id);
  };

  const startEdit = () => {
    if (!detailEmployee) return;
    setEditDraft({
      ...detailEmployee,
      extra_info: { ...(detailEmployee.extra_info || {}) }
    });
    setEditMode(true);
  };

  const cancelEdit = () => { setEditMode(false); setEditDraft({}); };

  const saveEdit = async () => {
    if (!detailEmployee) return;
    try {
      let res: Response;
      if (isHR) {
        res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/employees/${detailEmployee.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
            body: JSON.stringify({ manager_id: hrManagerId, ...editDraft })
          }
        );
      } else {
        res = await adminFetch(`/admin/employees/${detailEmployee.id}`, {
          method: 'PATCH',
          body: JSON.stringify(editDraft)
        });
      }
      const data = await res.json();
      if (data.success) {
        toast.success(t('Employee updated successfully', 'تم تحديث الموظف بنجاح'));
        setEditMode(false);
        setEditDraft({});
        await fetchEmployees();
        if (data.employee) setDetailEmployee(data.employee);
        else if (!isHR) {
          const refreshed = await adminFetch(`/admin/employees/${detailEmployee.id}`);
          const rData = await refreshed.json().catch(() => null);
          if (rData?.success && rData?.employee) setDetailEmployee(rData.employee);
          else setDetailEmployee({ ...detailEmployee, ...editDraft });
        } else {
          setDetailEmployee({ ...detailEmployee, ...editDraft });
        }
      } else {
        toast.error(data.message || t('Failed to update employee', 'فشل تحديث الموظف'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to update employee', 'فشل تحديث الموظف'));
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await adminFetch(`/admin/employees/${emp.id}`, {
        method: 'PATCH', body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Status updated', 'تم تحديث الحالة'));
        fetchEmployees();
        if (detailEmployee?.id === emp.id) setDetailEmployee({ ...detailEmployee, status: newStatus });
      }
    } catch (e) { toast.error(t('Failed', 'فشل')); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('Are you sure you want to delete this employee?', 'هل أنت متأكد من حذف هذا الموظف؟'))) return;
    try {
      const res = await adminFetch(`/admin/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Employee deleted', 'تم حذف الموظف'));
        setDetailOpen(false);
        fetchEmployees();
      }
    } catch (e) { toast.error(t('Failed to delete', 'فشل الحذف')); }
  };

  const handleResetPassword = async () => {
    if (!detailEmployee?.email || newPassword.length < 6) {
      toast.error(t('Password must be at least 6 characters', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'));
      return;
    }
    setIsResetting(true);
    try {
      const res = await adminFetch(`/admin/employees/${detailEmployee.id}`, {
        method: 'PATCH', body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await sendPasswordResetEmail(
        { email: detailEmployee.email!, full_name: detailEmployee.full_name, full_name_ar: detailEmployee.full_name_ar },
        newPassword, 'ar'
      );
      toast.success(t('Password reset and email sent', 'تم إعادة التعيين وإرسال البريد'));
      setPwResetOpen(false);
      setNewPassword('');
    } catch (e) { toast.error(t('Failed to reset password', 'فشل إعادة تعيين كلمة المرور')); }
    finally { setIsResetting(false); }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.id || !newEmployee.full_name || !newEmployee.email || !newEmployee.company_id) {
      toast.error(t('Please fill in required fields', 'يرجى ملء الحقول المطلوبة'));
      return;
    }
    try {
      const res = await adminFetch('/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          id: parseInt(newEmployee.id),
          full_name: newEmployee.full_name,
          full_name_ar: newEmployee.full_name_ar || null,
          email: newEmployee.email,
          phone: newEmployee.phone || null,
          company_id: parseInt(newEmployee.company_id),
          position: newEmployee.position || null,
          position_ar: newEmployee.position_ar || null,
          iban: newEmployee.iban || null,
          bank_name: newEmployee.bank_name || null,
          date_of_birth: newEmployee.date_of_birth || null,
          nationality: newEmployee.nationality || null,
          iqama: newEmployee.iqama || null,
          hire_date: newEmployee.hire_date || null,
          salary: newEmployee.salary ? parseFloat(newEmployee.salary) : null,
          status: newEmployee.status || 'active',
          gender: newEmployee.gender || null,
          address: newEmployee.address || null,
          emergency_contact: newEmployee.emergency_contact || null,
          emergency_phone: newEmployee.emergency_phone || null,
          password: skipSetup ? newEmployee.password : undefined,
          manager_id: newEmployee.manager_id && newEmployee.manager_id !== 'none' ? parseInt(newEmployee.manager_id) : null,
          role: newEmployee.role || 'employee'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Employee added successfully!', 'تم إضافة الموظف بنجاح!'));
        setIsAddOpen(false);
        resetForm();
        fetchEmployees();
      } else {
        toast.error(data.message || t('Failed to add employee', 'فشل إضافة الموظف'));
      }
    } catch (e) { toast.error(t('Failed to add employee', 'فشل إضافة الموظف')); }
  };

  const handleLeaveAdjust = async () => {
    if (!detailEmployee) return;
    try {
      let res: Response;
      if (isHR) {
        // HR portal: use the manager endpoint (no X-Admin-Token needed)
        res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/leave-adjustments/${detailEmployee.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
            body: JSON.stringify({
              manager_id: hrManagerId ?? authEmployee?.id ?? 0,
              leaveType: adjustDialog.type,
              adjustmentDays: parseFloat(adjustDays),
              reason: adjustReason,
              reasonAr: adjustReasonAr,
              adjustedBy: authEmployee?.full_name || 'HR',
            })
          }
        );
      } else {
        res = await adminFetch(`/admin/leave-balances/${detailEmployee.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            leaveType: adjustDialog.type,
            adjustmentDays: parseFloat(adjustDays),
            reason: adjustReason,
            reasonAr: adjustReasonAr,
            adjustedBy: adminInfo?.name || 'Admin',
          })
        });
      }
      const data = await res.json();
      if (data.success) {
        toast.success(t('Balance adjusted', 'تم تعديل الرصيد'));
        setAdjustDialog({ type: '', open: false });
        setAdjustDays('0'); setAdjustReason(''); setAdjustReasonAr('');
        fetchLeave(detailEmployee.id);
      } else {
        toast.error(data.message || t('Failed', 'فشل'));
      }
    } catch (e) { toast.error(t('Failed to adjust', 'فشل التعديل')); }
  };

  const resetForm = () => {
    setNewEmployee({
      id: '', full_name: '', full_name_ar: '', email: '', phone: '', password: '',
      company_id: '', position: '', position_ar: '', iban: '', bank_name: '',
      date_of_birth: '', nationality: '', iqama: '', hire_date: '', salary: '',
      status: 'active', gender: '', address: '', emergency_contact: '',
      emergency_phone: '', manager_id: '', role: 'employee'
    });
    setSkipSetup(false);
  };

  const exportCSV = () => {
    const rows = filteredEmployees.map(e => [
      e.id, e.full_name, e.full_name_ar || '', e.email || '', e.phone || '',
      e.position || '', e.companies?.name || '', e.status || 'active',
      e.hire_date || '', e.salary || '', e.nationality || '', e.iqama || ''
    ]);
    const csv = [
      ['ID','Name','Name AR','Email','Phone','Position','Company','Status','Hire Date','Salary','Nationality','Iqama'].join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(t('Exported', 'تم التصدير'));
  };

  // ── Super Admin full export (ALL fields, CONFIDENTIAL) ────────────────────
  const exportFullCSV = () => {
    const headers = [
      'ID','Full Name (EN)','Full Name (AR)','Email','Phone',
      'Position (EN)','Position (AR)','Company','Company ID',
      'Status','Role','HR Approver',
      'Hire Date','Contract End Date','Date of Birth','Gender',
      'Nationality','Iqama','Address',
      'Salary (SAR)','IBAN','Bank Name',
      'Emergency Contact','Emergency Phone','Manager ID',
      'Passport Number','Passport Expiry',
      'Iqama Expiry','Work Permit Expiry','Re-entry Visa Expiry',
      'Exported At',
    ];
    const rows = employees.map(e => [
      e.id, e.full_name, e.full_name_ar || '', e.email || '', e.phone || '',
      e.position || '', e.position_ar || '',
      e.companies?.name || '', e.company_id || '',
      e.status || 'active', e.role || 'employee',
      e.can_approve_requests ? 'Yes' : 'No',
      e.hire_date || '', e.contract_end_date || '', e.date_of_birth || '', e.gender || '',
      e.nationality || '', e.iqama || '', e.address || '',
      e.salary || '', e.iban || '', e.bank_name || '',
      e.emergency_contact || '', e.emergency_phone || '', e.manager_id || '',
      e.extra_info?.passport_number || '',
      e.extra_info?.passport_expiry || '',
      e.extra_info?.iqama_expiry || '',
      e.extra_info?.work_permit_expiry || '',
      e.extra_info?.reentry_visa_expiry || '',
      new Date().toISOString().split('T')[0],
    ]);
    const bom = '\uFEFF'; // UTF-8 BOM for Excel Arabic support
    const csv = bom + [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `YaHala_CONFIDENTIAL_Employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(t(`Full export: ${employees.length} employees`, `تصدير كامل: ${employees.length} موظف`));
  };

  const stats = {
    total: employees.length,
    active: employees.filter(e => (e.status || 'active') === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
  };

  const emp = editMode ? editDraft : detailEmployee;
  const setField = (key: string, val: any) => setEditDraft((d: any) => ({ ...d, [key]: val }));
  const setExtraField = (key: string, val: any) => setEditDraft((d: any) => ({
    ...d, extra_info: { ...(d.extra_info || {}), [key]: val }
  }));

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            {t('Employee Management', 'إدارة الموظفين')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Full employee profiles with leave, documents & salary info', 'ملفات الموظفين الكاملة مع الإجازات والوثائق والرواتب')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!isHR && (
            <Button variant="outline" onClick={() => setBulkImportOpen(true)} size="sm" className="gap-1.5">
              <Upload className="w-4 h-4" />{t('Bulk Import', 'استيراد جماعي')}
            </Button>
          )}
          <Button variant="outline" onClick={exportCSV} size="sm" className="gap-1.5">
            <Download className="w-4 h-4" />{t('Export', 'تصدير')}
          </Button>
          {isSuperAdmin && (
            <Button
              variant="outline" onClick={exportFullCSV} size="sm"
              className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
              title={t('Export ALL fields (CONFIDENTIAL) — Super Admin only', 'تصدير جميع الحقول (سري) — للمسؤول الأعلى فقط')}
            >
              <Table className="w-4 h-4" />{t('Full Export ★', 'تصدير كامل ★')}
            </Button>
          )}
          {!isHR && (
            <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
              <Plus className="w-4 h-4 me-2" />{t('Add Employee', 'إضافة موظف')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('Total', 'الإجمالي'), val: stats.total, icon: Users, cls: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
          { label: t('Active', 'نشط'), val: stats.active, icon: UserCheck, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: t('Inactive', 'غير نشط'), val: stats.inactive, icon: UserX, cls: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.cls}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.val}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('Search by name, ID, email, position...', 'ابحث بالاسم أو الرقم أو البريد...')}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-44"><SelectValue placeholder={t('Company', 'الشركة')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Companies', 'جميع الشركات')}</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('Status', 'الحالة')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All', 'الكل')}</SelectItem>
              <SelectItem value="active">{t('Active', 'نشط')}</SelectItem>
              <SelectItem value="inactive">{t('Inactive', 'غير نشط')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || filterCompany !== 'all' || filterStatus !== 'all') && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('Showing', 'عرض')} {filteredEmployees.length} {t('of', 'من')} {employees.length} {t('employees', 'موظف')}
          </p>
        )}
      </Card>

      {/* ── Card Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="p-5 space-y-3 animate-pulse">
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('No employees found', 'لا يوجد موظفين')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredEmployees.map(emp => {
            const isActive = (emp.status || 'active') === 'active';
            const role = emp.role && emp.role !== 'employee' ? ROLE_BADGE[emp.role] : null;
            const hasExpiry = emp.extra_info?.passport_expiry || emp.extra_info?.iqama_expiry ||
              emp.extra_info?.work_permit_expiry || emp.extra_info?.reentry_visa_expiry;
            return (
              <Card
                key={emp.id}
                className="group relative flex flex-col overflow-hidden border border-border/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => openDetail(emp)}
              >
                {/* Top color strip */}
                <div className={`h-1.5 w-full ${isActive ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-muted'}`} />

                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm ${getAvatarColor(emp.id)}`}>
                      {getInitials(emp.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {role && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${role.cls}`}>
                            {t(role.en, role.ar)}
                          </span>
                        )}
                        {emp.can_approve_requests && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            HR
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-base leading-tight mt-1 truncate">{emp.full_name}</p>
                      {emp.full_name_ar && (
                        <p className="text-xs text-muted-foreground truncate" dir="rtl">{emp.full_name_ar}</p>
                      )}
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                        {t(emp.position || '—', emp.position_ar || emp.position || '—')}
                      </p>
                    </div>
                  </div>

                  {/* Company + ID row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{emp.companies?.name || t('No company', 'بلا شركة')}</span>
                    </span>
                    <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">#{emp.id}</span>
                  </div>

                  {/* Key info grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {emp.hire_date && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-muted-foreground">{new Date(emp.hire_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
                      </div>
                    )}
                    {emp.nationality && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-muted-foreground truncate">{emp.nationality}</span>
                      </div>
                    )}
                    {emp.salary && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Banknote className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-medium">{Number(emp.salary).toLocaleString()} SAR</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-muted-foreground truncate">{emp.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Document expiry pills */}
                  {hasExpiry && (
                    <div className="flex flex-wrap gap-1">
                      <DocExpiryPill date={emp.extra_info?.passport_expiry} label="P" />
                      <DocExpiryPill date={emp.extra_info?.iqama_expiry} label="IQ" />
                      <DocExpiryPill date={emp.extra_info?.work_permit_expiry} label="WP" />
                      <DocExpiryPill date={emp.extra_info?.reentry_visa_expiry} label="RV" />
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between bg-muted/20">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={e => { e.stopPropagation(); openDetail(emp, 'personal'); }}>
                      <Eye className="w-3.5 h-3.5" />{t('View', 'عرض')}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-indigo-600 dark:text-indigo-400" onClick={e => { e.stopPropagation(); openDetail(emp, 'leave'); }}>
                      <Calendar className="w-3.5 h-3.5" />{t('Leave', 'إجازة')}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={e => { e.stopPropagation(); openDetail(emp, 'documents'); }}>
                      <FileText className="w-3.5 h-3.5" />{t('Docs', 'وثائق')}
                    </Button>
                  </div>
                  {!isHR && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={e => { e.stopPropagation(); handleDelete(emp.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════���════════════════
          EMPLOYEE DETAIL DIALOG
      ════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={v => { setDetailOpen(v); if (!v) { setEditMode(false); setEditDraft({}); } }}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          {/* Visually-hidden title + description satisfy Radix accessibility requirements */}
          <DialogTitle className="sr-only">
            {detailEmployee ? detailEmployee.full_name : t('Employee Details', 'تفاصيل الموظف')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {detailEmployee
              ? t('Viewing details for', 'عرض تفاصيل') + ' ' + detailEmployee.full_name
              : t('Employee detail dialog', 'نافذة تفاصيل الموظف')}
          </DialogDescription>
          {detailEmployee && (
            <>
              {/* Header */}
              <div className="flex items-center gap-4 p-5 border-b border-border/60 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 dark:from-indigo-950/30 dark:to-violet-950/20">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0 ${getAvatarColor(detailEmployee.id)}`}>
                  {getInitials(detailEmployee.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${(detailEmployee.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${(detailEmployee.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {t((detailEmployee.status || 'active') === 'active' ? 'Active' : 'Inactive', (detailEmployee.status || 'active') === 'active' ? 'نشط' : 'غير نشط')}
                    </span>
                    {detailEmployee.role && detailEmployee.role !== 'employee' && ROLE_BADGE[detailEmployee.role] && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[detailEmployee.role].cls}`}>
                        {t(ROLE_BADGE[detailEmployee.role].en, ROLE_BADGE[detailEmployee.role].ar)}
                      </span>
                    )}
                    {detailEmployee.can_approve_requests && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {t('HR Approver', 'معتمد HR')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold leading-tight truncate">{detailEmployee.full_name}</h2>
                  {detailEmployee.full_name_ar && <p className="text-sm text-muted-foreground" dir="rtl">{detailEmployee.full_name_ar}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {detailEmployee.position && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{t(detailEmployee.position, detailEmployee.position_ar || detailEmployee.position)}</span>}
                    {detailEmployee.companies?.name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{detailEmployee.companies.name}</span>}
                    <span className="font-mono">#{detailEmployee.id}</span>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {editMode ? (
                    <>
                      <Button size="sm" onClick={saveEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                        <Save className="w-3.5 h-3.5" />{t('Save', 'حفظ')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {canEditInfo && (
                        <Button size="sm" variant="outline" onClick={startEdit} className="gap-1">
                          <Edit2 className="w-3.5 h-3.5" />{t('Edit', 'تعديل')}
                        </Button>
                      )}
                      {!isHR && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setPwResetOpen(true); }} className="gap-1">
                            <Key className="w-3.5 h-3.5" />{t('Reset PW', 'كلمة المرور')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleStatus(detailEmployee)} className="gap-1">
                            {(detailEmployee.status || 'active') === 'active'
                              ? <><UserX className="w-3.5 h-3.5 text-orange-500" />{t('Deactivate', 'إيقاف')}</>
                              : <><UserCheck className="w-3.5 h-3.5 text-emerald-500" />{t('Activate', 'تفعيل')}</>}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={detailTab} onValueChange={v => {
                setDetailTab(v);
                if (v === 'leave' && detailEmployee) fetchLeave(detailEmployee.id);
              }} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-5 mt-3 grid w-[calc(100%-40px)] grid-cols-5">
                  <TabsTrigger value="personal"><User className="w-3.5 h-3.5 me-1.5" />{t('Personal', 'شخصي')}</TabsTrigger>
                  <TabsTrigger value="employment"><Briefcase className="w-3.5 h-3.5 me-1.5" />{t('Employment', 'وظيفة')}</TabsTrigger>
                  <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 me-1.5" />{t('Documents', 'وثائق')}</TabsTrigger>
                  <TabsTrigger value="leave" onClick={() => {}}>
                    <Calendar className="w-3.5 h-3.5 me-1.5" />{t('Leave', 'إجازات')}
                  </TabsTrigger>
                  <TabsTrigger value="history"><History className="w-3.5 h-3.5 me-1.5" />{t('History', 'السجل')}</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto p-5">

                  {/* ── PERSONAL TAB ── */}
                  <TabsContent value="personal" className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Full Name (EN)', labelAr: 'الاسم الكامل (EN)', key: 'full_name', icon: User },
                        { label: 'Full Name (AR)', labelAr: 'الاسم الكامل (AR)', key: 'full_name_ar', icon: User },
                        { label: 'Email', labelAr: 'البريد الإلكتروني', key: 'email', icon: Mail, type: 'email' },
                        { label: 'Phone', labelAr: 'الهاتف', key: 'phone', icon: Phone },
                        { label: 'Date of Birth', labelAr: 'تاريخ الميلاد', key: 'date_of_birth', icon: Calendar, type: 'date' },
                        { label: 'Gender', labelAr: 'الجنس', key: 'gender', icon: User },
                        { label: 'Nationality', labelAr: 'الجنسية', key: 'nationality', icon: Globe },
                        { label: 'Address', labelAr: 'العنوان', key: 'address', icon: MapPin },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <f.icon className="w-3 h-3" />{t(f.label, f.labelAr)}
                          </Label>
                          {editMode ? (
                            <Input
                              type={f.type || 'text'}
                              value={(editDraft as any)[f.key] || ''}
                              onChange={e => setField(f.key, e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <p className="text-sm font-medium py-1.5 px-3 bg-muted/30 rounded-lg min-h-[36px]">
                              {(detailEmployee as any)[f.key] || <span className="text-muted-foreground text-xs">{t('Not set', 'غير محدد')}</span>}
                            </p>
                          )}
                        </div>
                      ))}
                      {/* Emergency contact full width */}
                      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                        {[
                          { label: 'Emergency Contact', labelAr: 'جهة اتصال الطوارئ', key: 'emergency_contact', icon: Heart },
                          { label: 'Emergency Phone', labelAr: 'هاتف الطوارئ', key: 'emergency_phone', icon: Phone },
                        ].map(f => (
                          <div key={f.key} className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <f.icon className="w-3 h-3" />{t(f.label, f.labelAr)}
                            </Label>
                            {editMode ? (
                              <Input value={(editDraft as any)[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="h-9" />
                            ) : (
                              <p className="text-sm font-medium py-1.5 px-3 bg-muted/30 rounded-lg min-h-[36px]">
                                {(detailEmployee as any)[f.key] || <span className="text-muted-foreground text-xs">{t('Not set', 'غير محدد')}</span>}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── EMPLOYMENT TAB ── */}
                  <TabsContent value="employment" className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Position (EN)', labelAr: 'المنصب (EN)', key: 'position', icon: Briefcase },
                        { label: 'Position (AR)', labelAr: 'المنصب (AR)', key: 'position_ar', icon: Briefcase },
                        { label: 'Hire Date', labelAr: 'تاريخ التعيين', key: 'hire_date', icon: CalendarDays, type: 'date' },
                        { label: 'Contract End Date', labelAr: 'تاريخ انتهاء العقد', key: 'contract_end_date', icon: CalendarDays, type: 'date' },
                        { label: 'Iqama Number', labelAr: 'رقم الإقامة', key: 'iqama', icon: IdCard },
                        { label: 'Salary (SAR)', labelAr: 'الراتب (ريال)', key: 'salary', icon: Banknote, type: 'number' },
                        { label: 'IBAN', labelAr: 'رقم الآيبان', key: 'iban', icon: CreditCard },
                        { label: 'Bank Name', labelAr: 'اسم البنك', key: 'bank_name', icon: Building2 },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <f.icon className="w-3 h-3" />{t(f.label, f.labelAr)}
                          </Label>
                          {editMode ? (
                            <Input type={f.type || 'text'} value={(editDraft as any)[f.key] || ''} onChange={e => setField(f.key, e.target.value)} className="h-9" />
                          ) : (
                            <p className="text-sm font-medium py-1.5 px-3 bg-muted/30 rounded-lg min-h-[36px]">
                              {f.key === 'salary' && (detailEmployee as any)[f.key]
                                ? `${Number((detailEmployee as any)[f.key]).toLocaleString()} SAR`
                                : (detailEmployee as any)[f.key] || <span className="text-muted-foreground text-xs">{t('Not set', 'غير محدد')}</span>
                              }
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Role (select) — read-only for HR */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Shield className="w-3 h-3" />{t('Role', 'الدور')}
                        </Label>
                        {editMode && !isHR ? (
                          <Select value={(editDraft as any).role || 'employee'} onValueChange={v => setField('role', v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['employee','manager','accountant','owner'].map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium py-1.5 px-3 bg-muted/30 rounded-lg">{detailEmployee.role || 'employee'}</p>
                        )}
                      </div>

                      {/* Company (select) — read-only for HR */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="w-3 h-3" />{t('Company', 'الشركة')}
                        </Label>
                        {editMode && !isHR ? (
                          <Select value={(editDraft as any).company_id?.toString() || ''} onValueChange={v => setField('company_id', parseInt(v))}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium py-1.5 px-3 bg-muted/30 rounded-lg">
                            {detailEmployee.companies?.name || <span className="text-muted-foreground text-xs">{t('Not set', 'غير محدد')}</span>}
                          </p>
                        )}
                      </div>

                      {/* HR Approver toggle — Super Admin only */}
                      {!isHR && (
                        <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                          {editMode ? (
                            <Checkbox
                              checked={!!(editDraft as any).can_approve_requests}
                              onCheckedChange={v => setField('can_approve_requests', !!v)}
                            />
                          ) : (
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${detailEmployee.can_approve_requests ? 'bg-amber-500 text-white' : 'bg-muted'}`}>
                              {detailEmployee.can_approve_requests && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{t('HR Approver', 'معتمد HR')}</p>
                            <p className="text-xs text-muted-foreground">{t('Can approve/reject requests', 'يمكنه اعتماد أو رفض الطلبات')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── DOCUMENTS TAB ── */}
                  <TabsContent value="documents" className="mt-0">
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-indigo-500" />{t('Identity & Residency Documents', 'وثائق الهوية والإقامة')}
                        </h3>
                        <ExpiryRow label="Iqama" labelAr="الإقامة" date={detailEmployee.extra_info?.iqama_expiry} number={detailEmployee.iqama} />
                        <ExpiryRow label="Passport" labelAr="جواز السفر" date={detailEmployee.extra_info?.passport_expiry} number={detailEmployee.extra_info?.passport_number} />
                        <ExpiryRow label="Work Permit" labelAr="تصريح العمل" date={detailEmployee.extra_info?.work_permit_expiry} />
                        <ExpiryRow label="Re-entry Visa" labelAr="تأشيرة العودة" date={detailEmployee.extra_info?.reentry_visa_expiry} />
                      </div>

                      {editMode && canEditInfo && (
                        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                          <h3 className="text-sm font-semibold mb-3 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <Edit2 className="w-4 h-4" />{t('Edit Document Expiry Dates', 'تعديل تواريخ انتهاء الوثائق')}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { label: 'Passport Number', labelAr: 'رقم جواز السفر', key: 'passport_number', type: 'text' },
                              { label: 'Passport Expiry', labelAr: 'انتهاء جواز السفر', key: 'passport_expiry', type: 'date' },
                              { label: 'Iqama Expiry', labelAr: 'انتهاء الإقامة', key: 'iqama_expiry', type: 'date' },
                              { label: 'Work Permit Expiry', labelAr: 'انتهاء تصريح العمل', key: 'work_permit_expiry', type: 'date' },
                              { label: 'Re-entry Visa Expiry', labelAr: 'انتهاء تأشيرة العودة', key: 'reentry_visa_expiry', type: 'date' },
                            ].map(f => (
                              <div key={f.key} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t(f.label, f.labelAr)}</Label>
                                <Input
                                  type={f.type}
                                  value={(editDraft.extra_info || {})[f.key] || ''}
                                  onChange={e => setExtraField(f.key, e.target.value)}
                                  className="h-9"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Legend */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" />{t('Valid (>60 days)', 'صالح (أكثر من 60 يوم)')}</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" />{t('Expiring soon (30-60d)', 'ينتهي قريباً 30-60 يوم')}</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500" />{t('Critical (<30d)', 'حرج أقل من 30 يوم')}</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" />{t('Expired', 'منتهي')}</span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── LEAVE TAB ── */}
                  <TabsContent value="leave" className="mt-0">
                    {loadingLeave ? (
                      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('Loading leave balances...', 'جاري تحميل أرصدة الإجازات...')}
                      </div>
                    ) : leaveData ? (
                      <div className="space-y-4">
                        {/* Year badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800">
                              {t('Financial Year', 'السنة المالية')}: {leaveData.financialYear}
                            </Badge>
                            {leaveData.annualEligible && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3 me-1" />{t('Annual Eligible', 'مؤهل للسنوي')}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => fetchLeave(detailEmployee!.id)} className="gap-1 text-xs">
                            <RefreshCw className="w-3 h-3" />{t('Refresh', 'تحديث')}
                          </Button>
                        </div>

                        {/* Leave type cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {LEAVE_TYPES.map(lt => {
                            const b = leaveData.balances[lt.id];
                            if (!b) return null;
                            const total = b.allowance + b.adjustment;
                            return (
                              <Card key={lt.id} className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold">{t(lt.label, lt.labelAr)}</h4>
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-7 px-2 text-xs gap-1 text-indigo-600 dark:text-indigo-400"
                                    onClick={() => { setAdjustDialog({ type: lt.id, open: true }); setAdjustDays('0'); setAdjustReason(''); setAdjustReasonAr(''); }}
                                  >
                                    <Edit2 className="w-3 h-3" />{t('Adjust', 'تعديل')}
                                  </Button>
                                </div>
                                <LeaveTypeBar
                                  label={lt.label} labelAr={lt.labelAr}
                                  used={b.approved} available={b.available} total={total} color={lt.color}
                                />
                                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                                  {[
                                    { label: t('Allowance', 'المخصص'), val: b.allowance },
                                    { label: t('Approved', 'معتمد'), val: b.approved },
                                    { label: t('Pending', 'معلق'), val: b.pending },
                                    { label: t('Available', 'متاح'), val: b.available, bold: true },
                                  ].map(s => (
                                    <div key={s.label} className="bg-muted/40 rounded p-1">
                                      <p className="text-muted-foreground">{s.label}</p>
                                      <p className={`font-bold text-xs mt-0.5 ${s.bold ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{s.val}</p>
                                    </div>
                                  ))}
                                </div>
                                {b.adjustment !== 0 && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {t('Manual adjustment', 'تعديل يدوي')}: {b.adjustment > 0 ? '+' : ''}{b.adjustment} {t('days', 'أيام')}
                                  </p>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground space-y-3">
                        <Calendar className="w-12 h-12 mx-auto opacity-30" />
                        <p>{t('No leave balance data found', 'لا توجد بيانات رصيد إجازات')}</p>
                        <Button size="sm" onClick={() => fetchLeave(detailEmployee!.id)} variant="outline">
                          <RefreshCw className="w-3.5 h-3.5 me-1.5" />{t('Try again', 'حاول مجدداً')}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── HISTORY TAB ── */}
                  <TabsContent value="history" className="mt-0">
                    <EmployeeRequestHistory
                      employee={{
                        id: detailEmployee.id,
                        full_name: detailEmployee.full_name,
                        full_name_ar: detailEmployee.full_name_ar,
                        position: detailEmployee.position,
                        position_ar: detailEmployee.position_ar,
                        email: detailEmployee.email,
                        phone: detailEmployee.phone,
                        iqama: detailEmployee.iqama,
                        hire_date: detailEmployee.hire_date || undefined,
                      }}
                      company={detailEmployee.companies ? { id: detailEmployee.company_id || 0, name: detailEmployee.companies.name } : null}
                      onClose={() => setDetailOpen(false)}
                      managerContext={isHR ? {
                        managerId: hrManagerId ?? authEmployee?.id ?? 0,
                        managerName: authEmployee?.full_name || '',
                        managerNameAr: authEmployee?.full_name_ar || '',
                        canCancel: hrPermissions?.can_cancel_requests ?? false,
                      } : undefined}
                    />
                  </TabsContent>

                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Leave Adjust Dialog ── */}
      <Dialog open={adjustDialog.open} onOpenChange={v => setAdjustDialog({ ...adjustDialog, open: v })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Adjust Leave Balance', 'تعديل رصيد الإجازة')}</DialogTitle>
            <DialogDescription>
              {t('Add or subtract days from the leave balance. Use negative numbers to deduct.', 'أضف أو اطرح أياماً من رصيد الإجازة. استخدم أرقاماً سالبة للخصم.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Days Adjustment', 'تعديل الأيام')}</Label>
              <Input type="number" value={adjustDays} onChange={e => setAdjustDays(e.target.value)} placeholder="+5 or -3" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Reason (EN)', 'السبب (EN)')}</Label>
              <Textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Reason (AR)', 'السبب (AR)')}</Label>
              <Textarea value={adjustReasonAr} onChange={e => setAdjustReasonAr(e.target.value)} rows={2} dir="rtl" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustDialog({ type: '', open: false })}>{t('Cancel', 'إلغاء')}</Button>
              <Button onClick={handleLeaveAdjust} className="bg-indigo-600 hover:bg-indigo-700 text-white">{t('Apply Adjustment', 'تطبيق التعديل')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Password Reset Dialog ── */}
      <Dialog open={pwResetOpen} onOpenChange={setPwResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Reset Password', 'إعادة تعيين كلمة المرور')}</DialogTitle>
            <DialogDescription>{detailEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('New Password', 'كلمة المرور الجديدة')}</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPwResetOpen(false)}>{t('Cancel', 'إلغاء')}</Button>
              <Button onClick={handleResetPassword} disabled={isResetting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('Reset & Send Email', 'إعادة تعيين وإرسال')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          ADD EMPLOYEE DIALOG
      ════════════════════════════════════════════════════ */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-600" />{t('Add New Employee', 'إضافة موظف جديد')}</DialogTitle>
            <DialogDescription>{t('Fill in all employee information', 'املأ جميع معلومات الموظف')}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t('Basic Info', 'المعلومات الأساسية')}</TabsTrigger>
              <TabsTrigger value="employment">{t('Employment', 'الوظيفة')}</TabsTrigger>
              <TabsTrigger value="other">{t('Other Details', 'تفاصيل أخرى')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('Employee ID', 'رقم الموظف')} *</Label>
                  <Input type="number" value={newEmployee.id} onChange={e => setNewEmployee({...newEmployee, id: e.target.value})} placeholder="12345" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Email', 'البريد الإلكتروني')} *</Label>
                  <Input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} placeholder="emp@yahala.co" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Full Name (EN)', 'الاسم الكامل (EN)')} *</Label>
                  <Input value={newEmployee.full_name} onChange={e => setNewEmployee({...newEmployee, full_name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Full Name (AR)', 'الاسم الكامل (AR)')}</Label>
                  <Input value={newEmployee.full_name_ar} onChange={e => setNewEmployee({...newEmployee, full_name_ar: e.target.value})} dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Phone', 'الهاتف')}</Label>
                  <Input value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Nationality', 'الجنسية')}</Label>
                  <Input value={newEmployee.nationality} onChange={e => setNewEmployee({...newEmployee, nationality: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Date of Birth', 'تاريخ الميلاد')}</Label>
                  <Input type="date" value={newEmployee.date_of_birth} onChange={e => setNewEmployee({...newEmployee, date_of_birth: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Gender', 'الجنس')}</Label>
                  <Select value={newEmployee.gender} onValueChange={v => setNewEmployee({...newEmployee, gender: v})}>
                    <SelectTrigger><SelectValue placeholder={t('Select...', 'اختر...')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('Male', 'ذكر')}</SelectItem>
                      <SelectItem value="female">{t('Female', 'أنثى')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Skip setup */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-start gap-3">
                  <Checkbox id="skipSetup" checked={skipSetup} onCheckedChange={v => setSkipSetup(!!v)} />
                  <div className="flex-1">
                    <label htmlFor="skipSetup" className="cursor-pointer">
                      <p className="font-medium text-sm">{t('⚡ Set password now (Skip invitation)', '⚡ تعيين كلمة مرور الآن')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('Employee can login immediately without first-time setup.', 'يمكن للموظف تسجيل الدخول فوراً.')}</p>
                    </label>
                    {skipSetup && (
                      <div className="mt-3 space-y-1.5">
                        <Label>{t('Password', 'كلمة المرور')} *</Label>
                        <Input type="password" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} minLength={8} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('Company', 'الشركة')} *</Label>
                  <Select value={newEmployee.company_id} onValueChange={v => setNewEmployee({...newEmployee, company_id: v})}>
                    <SelectTrigger><SelectValue placeholder={t('Select company', 'اختر الشركة')} /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Role', 'الدور')}</Label>
                  <Select value={newEmployee.role} onValueChange={v => setNewEmployee({...newEmployee, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['employee','manager','accountant','owner'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Position (EN)', 'المنصب (EN)')}</Label>
                  <Input value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Position (AR)', 'المنصب (AR)')}</Label>
                  <Input value={newEmployee.position_ar} onChange={e => setNewEmployee({...newEmployee, position_ar: e.target.value})} dir="rtl" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Hire Date', 'تاريخ التعيين')}</Label>
                  <Input type="date" value={newEmployee.hire_date} onChange={e => setNewEmployee({...newEmployee, hire_date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Salary (SAR)', 'الراتب (ريال)')}</Label>
                  <Input type="number" value={newEmployee.salary} onChange={e => setNewEmployee({...newEmployee, salary: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('IBAN', 'آيبان')}</Label>
                  <Input value={newEmployee.iban} onChange={e => setNewEmployee({...newEmployee, iban: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Bank Name', 'اسم البنك')}</Label>
                  <Input value={newEmployee.bank_name} onChange={e => setNewEmployee({...newEmployee, bank_name: e.target.value})} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="other" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('Iqama Number', 'رقم الإقامة')}</Label>
                  <Input value={newEmployee.iqama} onChange={e => setNewEmployee({...newEmployee, iqama: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Address', 'العنوان')}</Label>
                  <Input value={newEmployee.address} onChange={e => setNewEmployee({...newEmployee, address: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Emergency Contact', 'جهة اتصال الطوارئ')}</Label>
                  <Input value={newEmployee.emergency_contact} onChange={e => setNewEmployee({...newEmployee, emergency_contact: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('Emergency Phone', 'هاتف الطوارئ')}</Label>
                  <Input value={newEmployee.emergency_phone} onChange={e => setNewEmployee({...newEmployee, emergency_phone: e.target.value})} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleAddEmployee} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 me-1.5" />{t('Add Employee', 'إضافة موظف')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkEmployeeImport
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => fetchEmployees()}
      />
    </div>
  );
}


