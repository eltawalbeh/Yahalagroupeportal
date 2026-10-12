import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { sendRequestStatusEmail } from '../utils/emailService';

// Manager-specific Design System
import { ManagerLayout } from '../components/layout/ManagerLayout';
import { ManagerDashboardV2 } from './manager/ManagerDashboardV2';

// Reusable Page Components
import { EmployeeManagement } from './EmployeeManagement';
import { LeaveRequest } from './LeaveRequest';
import { AdvanceRequest } from './AdvanceRequest';
import { EntryPermissionRequest } from './EntryPermissionRequest';
import { EmployeeProfile } from './EmployeeProfile';
import { LeaveCalendar } from './LeaveCalendar';
import { RequestActivityLog } from '../components/RequestActivityLog';
import { RequestComments } from '../components/RequestComments';
import { ResendEmailButton } from '../components/ResendEmailButton';
import { RequestDetailView } from '../components/RequestDetailView';
import { DocumentManagement } from '../components/DocumentManagement';
import { DocumentExpiryReport } from '../components/DocumentExpiryReport';
import { EmployeeRequestHistory } from '../components/EmployeeRequestHistory';
import { AnnouncementBoard } from '../components/AnnouncementBoard';
import { AnnouncementView } from '../components/AnnouncementView';
import { HRAnnouncementBoard } from '../components/HRAnnouncementBoard';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { cn } from '../components/ui/utils';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Eye, 
  ChevronLeft,
  Mail,
  Phone,
  Briefcase,
  CalendarDays,
  ArrowLeft,
  Edit2,
  Save,
  FileText as FileTextIcon,
  Upload,
  Info,
  Lock,
  Loader2,
  Ban,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface Request {
  id: number;
  employee_id: number;
  type?: string;
  request_type?: string;
  sub_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  leave_type?: string;
  amount?: number;
  reason?: string;
  notes?: string;
  employees: {
    id: number;
    full_name: string;
    full_name_ar?: string;
    position?: string;
  };
  approval_notes?: string;
  processed_at?: string;
  activity_log?: any[];
  processed_by_name?: string;
}

interface ManagerDashboardProps {
  onLogout?: () => void;
}

export function ManagerDashboard({ onLogout }: ManagerDashboardProps = {}) {
  const { t, language } = useLanguage();
  const { employee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive initial activePage from URL
  const getPageFromUrl = () => {
    const sub = location.pathname.replace(/^\/manager\/?/, '').replace(/\/$/, '');
    if (!sub || sub === '') return 'dashboard';
    return sub;
  };
  
  // State
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [contractsExpiring, setContractsExpiring] = useState<any[]>([]);
  
  // Navigation State
  const [activePage, setActivePage] = useState(getPageFromUrl);

  // Sync URL when activePage changes
  useEffect(() => {
    const urlPage = getPageFromUrl();
    if (activePage !== urlPage) {
      const path = activePage === 'dashboard' ? '/manager' : `/manager/${activePage}`;
      navigate(path, { replace: true });
    }
  }, [activePage]);

  // Sync activePage when URL changes (browser back/forward)
  useEffect(() => {
    const urlPage = getPageFromUrl();
    if (urlPage !== activePage) {
      setActivePage(urlPage);
    }
  }, [location.pathname]);

  // Request processing
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected'>('approved');

  // Filters for requests page
  const [requestFilter, setRequestFilter] = useState('all');
  const [requestSearch, setRequestSearch] = useState('');

  // Employee detail view
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editingLimits, setEditingLimits] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    annual_leave_balance: 21,
    sick_leave_balance: 30,
    emergency_leave_balance: 5
  });

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  // Team document alerts (B)
  const [teamDocAlerts, setTeamDocAlerts] = useState<any[]>([]);

  // HR Permissions (toggled by Super Admin)
  const [hrPermissions, setHrPermissions] = useState({
    can_upload_documents: false,
    can_edit_employee_info: false,
    can_edit_financial_info: false,
    can_resend_emails: true,
    can_cancel_requests: false,
    can_post_announcements: false,
  });

  // Whether this specific employee is allowed to approve/reject requests
  const [canApproveRequests, setCanApproveRequests] = useState(false);

  // Cancel request state
  const [cancelTarget, setCancelTarget] = useState<Request | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonAr, setCancelReasonAr] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Date range filter for requests
  const [requestDateFrom, setRequestDateFrom] = useState('');
  const [requestDateTo, setRequestDateTo] = useState('');

  // Extra Info editing
  const [editingExtraInfo, setEditingExtraInfo] = useState(false);
  const [extraInfoForm, setExtraInfoForm] = useState({
    nationality: '',
    marital_status: '',
    blood_type: '',
    education_level: '',
    iqama_expiry: '',
    work_permit_expiry: '',
    passport_number: '',
    passport_expiry: '',
    notes: '',
    special_case: false,
    special_case_ceiling: '',
  });
  const [savingExtraInfo, setSavingExtraInfo] = useState(false);

  // --- Data Fetching ---

  useEffect(() => {
    if (employee) {
      fetchAllRequests();
      fetchAllEmployees();
      fetchHrPermissions();
      fetchContractsExpiring();
      fetchApprovalPermission();
      fetchTeamDocAlerts();
    }
  }, [employee]);

  const fetchHrPermissions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/hr-permissions`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.permissions) {
          setHrPermissions({
            can_upload_documents: data.permissions.can_upload_documents || false,
            can_edit_employee_info: data.permissions.can_edit_employee_info || false,
            can_edit_financial_info: data.permissions.can_edit_financial_info || false,
            can_resend_emails: data.permissions.can_resend_emails !== false,
            can_cancel_requests: data.permissions.can_cancel_requests || false,
            can_post_announcements: data.permissions.can_post_announcements || false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching HR permissions:', error);
    }
  };

  const fetchApprovalPermission = async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/can-approve?employee_id=${employee.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCanApproveRequests(data.can_approve === true);
        console.log(`[ManagerDashboard] Approval permission for employee ${employee.id}: ${data.can_approve}`);
      }
    } catch (error) {
      console.error('Error fetching approval permission:', error);
      setCanApproveRequests(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/team-members?manager_id=${employee?.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setEmployeesList(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchContractsExpiring = async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/contracts-expiring?manager_id=${employee.id}&days=90`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (!response.ok) {
        console.warn('Contracts expiring fetch returned non-OK status:', response.status);
        return;
      }
      // Read as text first so we can log the raw body if JSON parsing fails
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Error parsing manager contracts-expiring response. Raw body:', text, parseErr);
        return;
      }
      if (data && data.success) {
        setContractsExpiring(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching contracts expiring:', error);
    }
  };

  const fetchTeamDocAlerts = async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/team-document-expiry?manager_id=${employee.id}&days=90`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) setTeamDocAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching team doc alerts:', error);
    }
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/team-requests?manager_id=${employee?.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const reqs = data.requests || [];
        setRequests(reqs);
        
        setStats({
          pending: reqs.filter((r: Request) => r.status === 'pending').length,
          approved: reqs.filter((r: Request) => r.status === 'approved').length,
          rejected: reqs.filter((r: Request) => r.status === 'rejected').length,
          total: reqs.length
        });
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Request Processing ---

  const handleQuickProcess = (requestId: string, status: 'approved' | 'rejected') => {
    const req = requests.find(r => r.id.toString() === requestId.toString());
    if (req) {
      setSelectedRequest(req);
      setProcessAction(status);
      setApprovalNotes('');
      setShowProcessDialog(true);
    }
  };

  const processRequest = async () => {
    if (!selectedRequest) return;
    
    setProcessingId(selectedRequest.id.toString());
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/process-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            request_id: selectedRequest.id,
            status: processAction,
            manager_id: employee?.id,
            approval_notes: approvalNotes
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(
          processAction === 'approved' 
            ? t('Request approved successfully', 'تمت الموافقة على الطلب بنجاح')
            : t('Request rejected', 'تم رفض الطلب')
        );

        // Send email notification
        if (selectedRequest.employees?.id) {
          sendRequestStatusEmail(
            selectedRequest.employees.id,
            processAction,
            language as 'en' | 'ar',
            selectedRequest
          ).catch(err => console.error('Failed to send email notification:', err));
        }

        setShowProcessDialog(false);
        setSelectedRequest(null);
        setApprovalNotes('');
        fetchAllRequests();
      } else {
        toast.error(data.message || t('Failed to process request', 'فشل معالجة الطلب'));
      }
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error(t('Connection error', 'خطأ في الاتصال'));
    } finally {
      setProcessingId(null);
    }
  };

  // --- Employee Limits ---

  const updateEmployeeLimits = async (employeeId: number) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/update-employee-limits`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            manager_id: employee?.id,
            employee_id: employeeId,
            limits: limitsForm
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(t('Leave balances updated', 'تم تحديث أرصدة الإجازات'));
        setEditingLimits(false);
        fetchAllEmployees();
      } else {
        toast.error(data.message || t('Failed to update', 'فشل التحديث'));
      }
    } catch (error) {
      console.error('Error updating limits:', error);
      toast.error(t('Connection error', 'خطأ في الاتصال'));
    }
  };

  // --- Helpers ---

  const getRequestTypeLabel = (req: Request) => {
    const type = req.request_type || req.type || '';
    const types: Record<string, { en: string; ar: string }> = {
      leave: { en: 'Leave', ar: 'إجازة' },
      advance: { en: 'Advance', ar: 'سلفة' },
      entry: { en: 'Entry Permission', ar: 'إذن خروج وعودة' },
      entry_permission: { en: 'Entry Permission', ar: 'إذن خروج وعودة' },
    };
    const found = types[type];
    return found ? t(found.en, found.ar) : type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, string> = {
      pending: t('Pending', 'معلق'),
      approved: t('Approved', 'موافق'),
      rejected: t('Rejected', 'مرفوض'),
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  // --- Filtered Requests ---

  const filteredRequests = requests.filter(r => {
    if (requestFilter !== 'all' && r.status !== requestFilter) return false;
    if (requestSearch) {
      const search = requestSearch.toLowerCase();
      return (
        r.employees?.full_name?.toLowerCase().includes(search) ||
        r.employees?.full_name_ar?.toLowerCase().includes(search) ||
        (r.request_type || r.type || '').toLowerCase().includes(search) ||
        r.reason?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // --- Page Renderers ---

  const renderRequestsPage = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('Team Requests', 'طلبات الفريق')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t('Review and process employee requests', 'مراجعة ومعالجة طلبات الموظفين')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('Total:', 'الإجمالي:')} {requests.length}</span>
          <span className="text-amber-500 font-medium">
            {stats.pending} {t('pending', 'معلق')}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('Search by employee name...', 'بحث بإسم الموظف...')}
            value={requestSearch}
            onChange={(e) => setRequestSearch(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select value={requestFilter} onValueChange={setRequestFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="w-4 h-4 me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses', 'جميع الحالات')}</SelectItem>
            <SelectItem value="pending">{t('Pending', 'معلق')}</SelectItem>
            <SelectItem value="approved">{t('Approved', 'موافق')}</SelectItem>
            <SelectItem value="rejected">{t('Rejected', 'مرفوض')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {requestFilter === 'pending' 
              ? t('No pending requests', 'لا توجد طلبات معلقة')
              : t('No requests found', 'لا توجد طلبات')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => (
            <Card key={request.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                {/* Employee Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold shrink-0">
                    {request.employees?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {language === 'ar' 
                        ? request.employees?.full_name_ar || request.employees?.full_name 
                        : request.employees?.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{request.employees?.position}</span>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <Badge variant="outline" className="text-xs">
                    {getRequestTypeLabel(request)}
                  </Badge>
                  {request.start_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(request.start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                      {request.end_date && request.end_date !== request.start_date && (
                        <> → {new Date(request.end_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</>
                      )}
                    </span>
                  )}
                  {request.amount && (
                    <span className="text-xs font-medium">{request.amount} SAR</span>
                  )}
                  {getStatusBadge(request.status)}
                </div>

                {/* Actions */}
                {request.status === 'pending' && canApproveRequests && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={() => handleQuickProcess(request.id.toString(), 'rejected')}
                      disabled={processingId === request.id.toString()}
                    >
                      <XCircle className="w-4 h-4 me-1" />
                      {t('Reject', 'رفض')}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleQuickProcess(request.id.toString(), 'approved')}
                      disabled={processingId === request.id.toString()}
                    >
                      <CheckCircle2 className="w-4 h-4 me-1" />
                      {t('Approve', 'موافقة')}
                    </Button>
                  </div>
                )}
                {request.status === 'pending' && !canApproveRequests && (
                  <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-md px-2.5 py-1.5">
                    <Lock className="w-3 h-3" />
                    {t('Awaiting HR/Admin', 'بانتظار الموارد البشرية')}
                  </div>
                )}
                {request.status !== 'pending' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4 me-1" />
                    {t('Details', 'التفاصيل')}
                  </Button>
                )}
              </div>
              {request.reason && (
                <div className="px-5 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2 italic">
                    "{request.reason || request.notes}"
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderEmployeesPage = () => {
    if (selectedEmployee) {
      const empLimits = selectedEmployee.limits || {
        annual_leave_balance: 21,
        sick_leave_balance: 30,
        emergency_leave_balance: 5
      };
      // Derive company info for the history component
      const employeeCompany = selectedEmployee.company_id
        ? { id: selectedEmployee.company_id, name: selectedEmployee.companies?.name || selectedEmployee.company_name || '' }
        : null;

      return (
        <div className="space-y-6">
          <Button variant="ghost" className="gap-2" onClick={() => { setSelectedEmployee(null); setEditingLimits(false); setEditingExtraInfo(false); }}>
            <ArrowLeft className="w-4 h-4" />
            {t('Back to Team', 'العودة للفريق')}
          </Button>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Employee Info Card */}
            <Card className="p-6 md:col-span-1">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-2xl mx-auto mb-4">
                  {selectedEmployee.full_name?.charAt(0)}
                </div>
                <h3 className="text-lg font-bold">
                  {language === 'ar' ? selectedEmployee.full_name_ar || selectedEmployee.full_name : selectedEmployee.full_name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar' ? selectedEmployee.position_ar || selectedEmployee.position : selectedEmployee.position}
                </p>
                <Badge variant="outline" className="mt-2">ID: {selectedEmployee.id}</Badge>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                {selectedEmployee.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{selectedEmployee.phone}</span>
                  </div>
                )}
                {selectedEmployee.iqama && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span>{t('Iqama:', 'الإقامة:')} {selectedEmployee.iqama}</span>
                  </div>
                )}
                {/* Hire Date Display & Edit */}
                <div className="pt-3 mt-3 border-t border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('Hire Date', 'تاريخ التعيين')}
                    </span>
                    {hrPermissions.can_edit_employee_info && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs"
                        onClick={() => {
                          const newDate = prompt(
                            t('Enter hire date (YYYY-MM-DD):', 'أدخل تاريخ التعيين (YYYY-MM-DD):'),
                            selectedEmployee.hire_date || ''
                          );
                          if (newDate !== null) {
                            // Validate date format
                            if (newDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                              toast.error(t('Invalid date format. Use YYYY-MM-DD', 'صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD'));
                              return;
                            }
                            (async () => {
                              try {
                                const response = await fetch(
                                  `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/update-employee-hire-date`,
                                  {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
                                    body: JSON.stringify({ manager_id: employee?.id, employee_id: selectedEmployee.id, hire_date: newDate || null })
                                  }
                                );
                                const data = await response.json();
                                if (data.success) {
                                  toast.success(t('Hire date updated', 'تم تحديث تاريخ التعيين'));
                                  setSelectedEmployee({ ...selectedEmployee, hire_date: newDate || null });
                                  fetchAllEmployees();
                                } else {
                                  toast.error(data.message || t('Failed to update', 'فشل التحديث'));
                                }
                              } catch (err) {
                                console.error('Error updating hire date:', err);
                                toast.error(t('Connection error', 'خطأ في الاتصال'));
                              }
                            })();
                          }
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {selectedEmployee.hire_date ? (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-teal-600" />
                      <span className="font-medium">
                        {new Date(selectedEmployee.hire_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                        {t('Not set — please add hire date', 'غير محدد — يرجى إضافة تاريخ التعيين')}
                      </span>
                    </div>
                  )}
                  {selectedEmployee.hire_date && (() => {
                    const hire = new Date(selectedEmployee.hire_date);
                    const now = new Date();
                    const years = (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                    const rounded = Math.floor(years * 10) / 10;
                    return (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {rounded >= 1
                          ? t(`${rounded} years of service`, `${rounded} سنة خدمة`)
                          : t(`${Math.round(rounded * 12)} months of service`, `${Math.round(rounded * 12)} شهر خدمة`)
                        }
                      </p>
                    );
                  })()}
                </div>
              </div>
            </Card>

            {/* Leave Balances Card */}
            <Card className="p-6 md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">{t('Leave Balances', 'أرصدة الإجازات')}</h3>
                {!editingLimits ? (
                  <Button size="sm" variant="outline" onClick={() => {
                    setLimitsForm({
                      annual_leave_balance: empLimits.annual_leave_balance ?? 21,
                      sick_leave_balance: empLimits.sick_leave_balance ?? 30,
                      emergency_leave_balance: empLimits.emergency_leave_balance ?? 5
                    });
                    setEditingLimits(true);
                  }}>
                    <Edit2 className="w-4 h-4 me-1" />
                    {t('Edit', 'تعديل')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingLimits(false)}>
                      {t('Cancel', 'إلغاء')}
                    </Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => updateEmployeeLimits(selectedEmployee.id)}>
                      <Save className="w-4 h-4 me-1" />
                      {t('Save', 'حفظ')}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { key: 'annual_leave_balance', label: t('Annual Leave', 'إجازة سنوية'), color: 'teal', max: 30 },
                  { key: 'sick_leave_balance', label: t('Sick Leave', 'إجازة مرضية'), color: 'blue', max: 30 },
                  { key: 'emergency_leave_balance', label: t('Emergency Leave', 'إجازة طارئة'), color: 'amber', max: 10 },
                ].map(item => {
                  const val = editingLimits ? (limitsForm as any)[item.key] : empLimits[item.key] ?? 0;
                  return (
                    <div key={item.key} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                      {editingLimits ? (
                        <Input 
                          type="number" 
                          value={val}
                          onChange={(e) => setLimitsForm(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                          className="text-center text-2xl font-bold h-14"
                        />
                      ) : (
                        <p className="text-3xl font-bold">{val}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{t('days remaining', 'أيام متبقية')}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Employee's Full Request History */}
          <Card className="p-6">
            <EmployeeRequestHistory
              employee={selectedEmployee}
              company={employeeCompany}
              onClose={() => setSelectedEmployee(null)}
              managerContext={{
                managerId: employee?.id || 0,
                managerName: employee?.full_name || '',
                managerNameAr: employee?.full_name_ar || '',
                canCancel: hrPermissions.can_cancel_requests
              }}
            />
          </Card>

          {/* Extra Information (requires permission) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold">{t('Extra Information', 'معلومات إضافية')}</h3>
              </div>
              {hrPermissions.can_edit_employee_info ? (
                !editingExtraInfo ? (
                  <Button size="sm" variant="outline" onClick={() => {
                    const existing = selectedEmployee.extra_info || {};
                    setExtraInfoForm({
                      nationality: existing.nationality || '',
                      marital_status: existing.marital_status || '',
                      blood_type: existing.blood_type || '',
                      education_level: existing.education_level || '',
                      iqama_expiry: existing.iqama_expiry || '',
                      work_permit_expiry: existing.work_permit_expiry || '',
                      passport_number: existing.passport_number || '',
                      passport_expiry: existing.passport_expiry || '',
                      notes: existing.notes || '',
                      special_case: existing.special_case || false,
                      special_case_ceiling: existing.special_case_ceiling || '',
                    });
                    setEditingExtraInfo(true);
                  }}>
                    <Edit2 className="w-4 h-4 me-1" />
                    {t('Edit', 'تعديل')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingExtraInfo(false)}>
                      {t('Cancel', 'إلغاء')}
                    </Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={savingExtraInfo} onClick={async () => {
                      setSavingExtraInfo(true);
                      try {
                        const response = await fetch(
                          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/update-employee-extra-info`,
                          {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
                            body: JSON.stringify({ manager_id: employee?.id, employee_id: selectedEmployee.id, extra_info: extraInfoForm })
                          }
                        );
                        const data = await response.json();
                        if (data.success) {
                          toast.success(t('Extra info updated', 'تم تحديث المعلومات الإضافية'));
                          setEditingExtraInfo(false);
                          setSelectedEmployee({ ...selectedEmployee, extra_info: { ...extraInfoForm, updated_at: new Date().toISOString(), updated_by: employee?.id } });
                          fetchAllEmployees();
                        } else {
                          toast.error(data.message || t('Failed to update', 'فشل التحديث'));
                        }
                      } catch (error) {
                        console.error('Error saving extra info:', error);
                        toast.error(t('Connection error', 'خطأ في الاتصال'));
                      } finally {
                        setSavingExtraInfo(false);
                      }
                    }}>
                      {savingExtraInfo ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
                      {t('Save', 'حفظ')}
                    </Button>
                  </div>
                )
              ) : (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  {t('View Only', 'عرض فقط')}
                </Badge>
              )}
            </div>
            {editingExtraInfo ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: 'nationality', label: t('Nationality', 'الجنسية'), type: 'text' },
                  { key: 'marital_status', label: t('Marital Status', 'الحالة الاجتماعية'), type: 'text' },
                  { key: 'blood_type', label: t('Blood Type', 'فصيلة الدم'), type: 'text' },
                  { key: 'education_level', label: t('Education Level', 'الستوى التعليمي'), type: 'text' },
                  { key: 'iqama_expiry', label: t('Iqama Expiry', 'انتهاء الإقامة'), type: 'date' },
                  { key: 'work_permit_expiry', label: t('Work Permit Expiry', 'انتهاء تصريح العمل'), type: 'date' },
                  { key: 'passport_number', label: t('Passport Number', 'رقم الجواز'), type: 'text' },
                  { key: 'passport_expiry', label: t('Passport Expiry', 'انتهاء الجواز'), type: 'date' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
                    <Input
                      type={field.type}
                      value={(extraInfoForm as any)[field.key]}
                      onChange={(e) => setExtraInfoForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.label}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('Notes', 'ملاحظات')}</label>
                  <Textarea
                    value={extraInfoForm.notes}
                    onChange={(e) => setExtraInfoForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('Additional notes about this employee...', 'ملاحظات إضافية حول هذا الموظف...')}
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {(() => {
                  const info = selectedEmployee.extra_info || {};
                  const fields = [
                    { key: 'nationality', label: t('Nationality', 'الجنسية') },
                    { key: 'marital_status', label: t('Marital Status', 'الحالة الاجتماعية') },
                    { key: 'blood_type', label: t('Blood Type', 'فصيلة الدم') },
                    { key: 'education_level', label: t('Education Level', 'المستوى التعليمي') },
                    { key: 'iqama_expiry', label: t('Iqama Expiry', 'انتهاء الإقامة') },
                    { key: 'work_permit_expiry', label: t('Work Permit Expiry', 'انتهاء تصريح العمل') },
                    { key: 'passport_number', label: t('Passport Number', 'رقم الجواز') },
                    { key: 'passport_expiry', label: t('Passport Expiry', 'انتهاء الجواز') },
                  ];
                  const hasAnyInfo = fields.some(f => info[f.key]);
                  if (!hasAnyInfo) {
                    return (
                      <div className="sm:col-span-2 text-center py-6">
                        <Info className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {t('No extra information recorded yet', 'لم يتم تسجيل معلومات إضافية بعد')}
                        </p>
                      </div>
                    );
                  }
                  return fields.filter(f => info[f.key]).map(field => (
                    <div key={field.key} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-xs text-muted-foreground">{field.label}</span>
                      <span className="text-sm font-medium">{info[field.key]}</span>
                    </div>
                  ));
                })()}
                {selectedEmployee.extra_info?.notes && (
                  <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs text-muted-foreground block mb-1">{t('Notes', 'ملاحظات')}</span>
                    <p className="text-sm">{selectedEmployee.extra_info.notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Documents (requires permission) */}
          {hrPermissions.can_upload_documents ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileTextIcon className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold">{t('Employee Documents', 'مستندات الموظف')}</h3>
              </div>
              <DocumentManagement employeeId={selectedEmployee.id?.toString()} />
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileTextIcon className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold text-muted-foreground">{t('Employee Documents', 'مستندات الموظف')}</h3>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('Document upload is not enabled', 'تحميل المستندات غير مفعّل')}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t('Contact the Super Admin to enable this feature.', 'تواصل مع المسؤول الأعلى لتفعيل هذه الميزة.')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t('Team Members', 'أعضاء الفريق')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t(`${employeesList.length} active employees`, `${employeesList.length} موظف نشط`)}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employeesList.map(member => (
            <Card 
              key={member.id} 
              className="p-5 hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700"
              onClick={() => setSelectedEmployee(member)}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-lg shrink-0">
                  {member.full_name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">
                    {language === 'ar' ? member.full_name_ar || member.full_name : member.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {language === 'ar' ? member.position_ar || member.position : member.position}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] h-5">ID: {member.id}</Badge>
                    {member.limits && (
                      <span className="text-[10px] text-muted-foreground">
                        {t('Annual:', 'سنوي:')} {member.limits.annual_leave_balance ?? 21}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <ManagerDashboardV2 
            stats={stats} 
            recentRequests={requests} 
            employeesCount={employeesList.length}
            contractsExpiring={contractsExpiring}
            teamDocAlerts={teamDocAlerts}
            onNavigate={setActivePage}
            onProcessRequest={handleQuickProcess}
            canApproveRequests={canApproveRequests}
          />
        );
      case 'requests':
        return renderRequestsPage();
      case 'employees':
        return (
          <EmployeeManagement
            onBack={() => setActivePage('dashboard')}
            callerRole="hr"
            hrPermissions={{
              can_edit_employee_info: hrPermissions.can_edit_employee_info,
              can_edit_financial_info: hrPermissions.can_edit_financial_info,
              can_upload_documents: hrPermissions.can_upload_documents,
              can_cancel_requests: hrPermissions.can_cancel_requests,
            }}
            hrManagerId={employee?.id}
          />
        );
      case 'calendar':
        return <LeaveCalendar onBack={() => setActivePage('dashboard')} managerId={employee?.id} />;
      case 'announcements':
        return hrPermissions.can_post_announcements
          ? <HRAnnouncementBoard />
          : <AnnouncementView />;
      case 'documents':
        return (
          hrPermissions.can_upload_documents
            ? <DocumentManagement />
            : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{t('Documents', 'المستندات')}</h2>
                <div className="flex items-center gap-3 p-6 rounded-xl bg-card border border-border/50 shadow-sm">
                  <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                    <FileTextIcon className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium">{t('Document upload not enabled', 'تحميل المستندات غير مفعّل')}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('Contact the Super Admin to enable this feature.', 'تواصل مع المسؤول الأعلى لتفعيل هذه الميزة.')}
                    </p>
                  </div>
                </div>
              </div>
            )
        );
      case 'leave':
        return (
          <LeaveRequest
            onBack={() => setActivePage('dashboard')}
            onSuccess={() => { setActivePage('requests'); fetchAllRequests(); }}
            onNavigateToTickets={() => setActivePage('ticket')}
          />
        );
      case 'advance':
        return (
          <AdvanceRequest 
            onBack={() => setActivePage('dashboard')} 
            onSuccess={() => { setActivePage('requests'); fetchAllRequests(); }} 
          />
        );
      case 'entry':
        return (
          <EntryPermissionRequest 
            onBack={() => setActivePage('dashboard')} 
            onSuccess={() => { setActivePage('requests'); fetchAllRequests(); }} 
          />
        );
      case 'document-expiry':
        return <DocumentExpiryReport callerRole="manager" />;
      case 'profile':
        return <EmployeeProfile onBack={() => setActivePage('dashboard')} />;
      default:
        return (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t('Page under construction', 'الصفحة قيد الإنشاء')}</p>
          </div>
        );
    }
  };

  return (
    <>
      <ManagerLayout 
        activePage={activePage} 
        onNavigate={(page) => {
          setActivePage(page);
          setSelectedEmployee(null);
          setEditingLimits(false);
        }}
        pendingCount={stats.pending}
      >
        {renderContent()}
      </ManagerLayout>

      {/* Process Request Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approved' 
                ? t('Approve Request', 'الموافقة على الطلب')
                : t('Reject Request', 'رفض الطلب')}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  {getRequestTypeLabel(selectedRequest)} {t('from', 'من')} {selectedRequest.employees?.full_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {selectedRequest && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
                {selectedRequest.start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Date:', 'التاريخ:')}</span>
                    <span className="font-medium">
                      {new Date(selectedRequest.start_date).toLocaleDateString()}
                      {selectedRequest.end_date && selectedRequest.end_date !== selectedRequest.start_date && (
                        <> → {new Date(selectedRequest.end_date).toLocaleDateString()}</>
                      )}
                    </span>
                  </div>
                )}
                {selectedRequest.amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Amount:', 'المبلغ:')}</span>
                    <span className="font-medium">{selectedRequest.amount} SAR</span>
                  </div>
                )}
                {(selectedRequest.reason || selectedRequest.notes) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Reason:', 'السبب:')}</span>
                    <span className="font-medium text-end max-w-[200px]">{selectedRequest.reason || selectedRequest.notes}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t('Notes (optional)', 'ملاحظات (اختياري)')}
              </label>
              <Textarea
                placeholder={t('Add notes for this decision...', 'أضف ملاحظات لهذا القرار...')}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowProcessDialog(false)}>
                {t('Cancel', 'إلغاء')}
              </Button>
              <Button 
                onClick={processRequest}
                disabled={!!processingId}
                className={cn(
                  processAction === 'approved' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                )}
              >
                {processingId ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin me-2" />
                ) : processAction === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4 me-2" />
                ) : (
                  <XCircle className="w-4 h-4 me-2" />
                )}
                {processAction === 'approved' 
                  ? t('Confirm Approval', 'تأكيد الموافقة')
                  : t('Confirm Rejection', 'تأكيد الرفض')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => { setShowDetailDialog(open); if (!open) setSelectedRequest(null); }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogTitle className="sr-only">
            {selectedRequest
              ? t('Request Details', 'تفاصيل الطلب')
              : t('Request', 'الطلب')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedRequest
              ? t('Viewing full details for this request', 'عرض التفاصيل الكاملة لهذا الطلب')
              : t('Request detail view', 'عرض تفاصيل الطلب')}
          </DialogDescription>
          {selectedRequest && (
            <RequestDetailView
              request={{
                ...selectedRequest,
                id: selectedRequest.id.toString(),
                type: selectedRequest.request_type || selectedRequest.type || 'leave',
                sub_type: selectedRequest.sub_type || selectedRequest.leave_type,
                notes: selectedRequest.reason || selectedRequest.notes,
              }}
              callerRole="manager"
              callerInfo={employee ? {
                id: employee.id,
                name: employee.full_name,
                name_ar: employee.full_name_ar,
              } : undefined}
              onApprove={canApproveRequests ? (id) => handleQuickProcess(id, 'approved') : undefined}
              onReject={canApproveRequests ? (id) => handleQuickProcess(id, 'rejected') : undefined}
              onRefresh={() => fetchAllRequests()}
              resendEmailProps={employee ? {
                callerRole: 'manager',
                callerInfo: {
                  id: employee.id,
                  name: employee.full_name,
                  name_ar: employee.full_name_ar,
                },
              } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}