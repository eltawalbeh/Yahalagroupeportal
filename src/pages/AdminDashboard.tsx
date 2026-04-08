import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { LogOut, Users, FileText, Plus, Trash2, Eye, Building2, Edit2, Download, Search, BarChart3, Calendar as CalendarIcon, FileDown, Megaphone, Settings, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { AdvancedSearchFilter, FilterCriteria } from '../components/AdvancedSearchFilter';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { DocumentManagement } from '../components/DocumentManagement';
import { RequestComments } from '../components/RequestComments';
import { RequestActivityLog } from '../components/RequestActivityLog';
import { ResendEmailButton } from '../components/ResendEmailButton';
import { AnnouncementBoard } from '../components/AnnouncementBoard';
import { SettingsPage } from '../components/SettingsPage';
import { RequestDetailView } from '../components/RequestDetailView';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { adminFetch } from '../utils/adminApi';
import { exportRequestsToPDF } from '../utils/pdfExport';
import { sendRequestStatusEmail } from '../utils/emailService';

// New Layout & Dashboard
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDashboardV2 } from './admin/AdminDashboardV2';
import { AdminPortalServices } from './admin/AdminPortalServices';
import { LeaveCalendar } from './admin/LeaveCalendar';
import { EmployeeManagement } from './EmployeeManagement';
import { TicketBandsManager } from '../components/TicketBandsManager';
import { DocumentExpiryReport } from '../components/DocumentExpiryReport';

interface AdminDashboardProps {
  onLogout?: () => void;
  onNavigate?: (page: string) => void;
}

interface Request {
  id: string;
  type: string;
  sub_type?: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  notes?: string;
  admin_notes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  medical_report_url?: string;
  employees?: {
    id: number;
    full_name: string;
    full_name_ar?: string;
    company_id?: number;
    companies?: {
      name: string;
    };
  };
}

interface Employee {
  id: number;
  full_name: string;
  full_name_ar?: string;
  position?: string;
  phone?: string;
  iban?: string;
  company_id?: number;
  company_name?: string;
  companies?: {
    name: string;
  };
}

interface Company {
  id: number;
  name: string;
  slug: string;
}

export function AdminDashboard({ onLogout, onNavigate }: AdminDashboardProps = {}) {
  const { t, language } = useLanguage();
  const { adminInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive initial activePage from the URL sub-path (e.g. /admin/requests → 'requests')
  const getPageFromUrl = () => {
    const sub = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '');
    if (!sub || sub === '') return 'dashboard';
    return sub;
  };

  const [activePage, setActivePage] = useState(getPageFromUrl);
  const [activeSettingsSection, setActiveSettingsSection] = useState('overview');

  // Sync URL when activePage changes
  useEffect(() => {
    const urlPage = getPageFromUrl();
    if (activePage !== urlPage) {
      const path = activePage === 'dashboard' ? '/admin' : `/admin/${activePage}`;
      navigate(path, { replace: true });
    }
  }, [activePage]);

  // Sync activePage when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const urlPage = getPageFromUrl();
    if (urlPage !== activePage) {
      setActivePage(urlPage);
    }
  }, [location.pathname]);
  
  // Requests state
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    searchQuery: '',
    types: [],
    statuses: [],
    companies: [],
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: ''
  });
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Employees state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Companies state
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    slug: ''
  });

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  // Contracts expiring soon (for dashboard widget)
  const [contractsExpiring, setContractsExpiring] = useState<any[]>([]);

  useEffect(() => {
    fetchCompanies();
    fetchRequests();
    fetchEmployees();
    fetchContractsExpiring();
    // Silently check contract expiry alerts on admin login (runs daily)
    adminFetch('/admin/check-contract-alerts').catch((e: any) => console.log('Contract alert check skipped:', e));
    // Silently check document expiry alerts on admin login
    adminFetch('/admin/check-document-expiry-alerts').catch((e: any) => console.log('Document expiry check skipped:', e));
    // Auto-credit annual leave balances on hire anniversaries (daily trigger)
    adminFetch('/admin/check-anniversary-balances').catch((e: any) => console.log('Anniversary balance check skipped:', e));

    // Auto-refresh requests every 30 seconds
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filterCriteria]);

  // Compute stats whenever requests change
  useEffect(() => {
    setStats({
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length
    });
  }, [requests]);

  const applyFilters = () => {
    let filtered = [...requests];

    if (filterCriteria.searchQuery) {
      const query = filterCriteria.searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(query) ||
        r.employees?.full_name?.toLowerCase().includes(query) ||
        r.employees?.full_name_ar?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query) ||
        r.admin_notes?.toLowerCase().includes(query) ||
        r.amount?.toString().includes(query)
      );
    }

    if (filterCriteria.types.length > 0) {
      filtered = filtered.filter(r => filterCriteria.types.includes(r.type));
    }

    if (filterCriteria.statuses.length > 0) {
      filtered = filtered.filter(r => filterCriteria.statuses.includes(r.status));
    }

    if (filterCriteria.companies.length > 0) {
      filtered = filtered.filter(r => 
        r.employees?.company_id && 
        filterCriteria.companies.includes(r.employees.company_id.toString())
      );
    }

    if (filterCriteria.dateFrom) {
      filtered = filtered.filter(r => new Date(r.created_at) >= new Date(filterCriteria.dateFrom));
    }
    if (filterCriteria.dateTo) {
      const dateTo = new Date(filterCriteria.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.created_at) <= dateTo);
    }

    if (filterCriteria.amountMin) {
      filtered = filtered.filter(r => (r.amount || 0) >= parseFloat(filterCriteria.amountMin));
    }
    if (filterCriteria.amountMax) {
      filtered = filtered.filter(r => (r.amount || 0) <= parseFloat(filterCriteria.amountMax));
    }

    setFilteredRequests(filtered);
  };

  const fetchCompanies = async () => {
    try {
      const response = await adminFetch('/companies');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchRequests = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const response = await adminFetch('/admin/requests');
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await adminFetch('/admin/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchContractsExpiring = async () => {
    try {
      const response = await adminFetch('/admin/contracts-expiring?days=90');
      if (!response.ok) {
        // 401 = session expired / token missing  |  404 = route not yet deployed
        console.log(`Contracts expiring widget unavailable (HTTP ${response.status}). Widget will be hidden.`);
        return;
      }
      // Use text() first so we can log the raw body on parse failure
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Error parsing contracts-expiring response. Raw body:', text, parseErr);
        return;
      }
      if (data && data.success) {
        setContractsExpiring(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching contracts expiring:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Request ID', 'Employee', 'Type', 'Status', 'Date', 'Details'];
    const rows = filteredRequests.map(r => [
      r.id,
      r.employees?.full_name || 'N/A',
      r.type,
      r.status,
      new Date(r.created_at).toLocaleDateString(),
      r.start_date || r.amount || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t('Export completed', 'تم التصدير'));
  };

  const handleExportPDF = async () => {
    try {
      await exportRequestsToPDF(filteredRequests, language);
      toast.success(t('PDF exported successfully', 'تم تصدير PDF بنجاح'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('Failed to export PDF', 'فشل تصدير PDF'));
    }
  };

  const toggleSelectRequest = (id: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllRequests = () => {
    if (selectedRequestIds.length === filteredRequests.filter(r => r.status === 'pending').length && filteredRequests.filter(r => r.status === 'pending').length > 0) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(filteredRequests.filter(r => r.status === 'pending').map(r => r.id));
    }
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const response = await adminFetch(`/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          status,
          admin_id: adminInfo?.id || 'admin',
          admin_name: adminInfo?.name || 'Super Admin',
          admin_name_ar: adminInfo?.name_ar || 'المسؤول الأعلى'
        })
      });
      const data = await response.json();
      if (data.success) {
        const request = requests.find(r => r.id === requestId);
        if (request && request.employees?.id) {
          sendRequestStatusEmail(
            request.employees.id,
            status as 'approved' | 'rejected',
            language as 'en' | 'ar',
            request
          ).catch(err => console.error('Failed to send email notification:', err));
        }

        toast.success(t('Status updated successfully', 'تم تحديث الحالة بنجاح'));
        fetchRequests();
        setIsRequestModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('Failed to update status', 'فشل تحديث الحالة'));
    }
  };

  const addCompany = async () => {
    if (!newCompany.name || !newCompany.slug) {
      toast.error(t('Please fill in all fields', 'يرجى ملء جميع الحقول'));
      return;
    }

    try {
      const response = await adminFetch('/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(newCompany)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Company added successfully', 'تم إضافة الشركة بنجاح'));
        setIsAddCompanyOpen(false);
        setNewCompany({ name: '', slug: '' });
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error adding company:', error);
      toast.error(t('Failed to add company', 'فشل إضافة الشركة'));
    }
  };

  const updateCompany = async () => {
    if (!editingCompany || !editingCompany.name || !editingCompany.slug) {
      toast.error(t('Please fill in all fields', 'يرجى ملء جميع الحقول'));
      return;
    }

    try {
      const response = await adminFetch(`/admin/companies/${editingCompany.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          name: editingCompany.name,
          slug: editingCompany.slug
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Company updated successfully', 'تم تحديث الشركة بنجاح'));
        setIsEditCompanyOpen(false);
        setEditingCompany(null);
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(t('Failed to update company', 'فشل تحديث الشركة'));
    }
  };

  const deleteCompany = async (id: number) => {
    if (!confirm(t('Are you sure you want to delete this company?', 'هل أنت متأكد من حذف هذه الشركة؟'))) {
      return;
    }

    try {
      const response = await adminFetch(`/admin/companies/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Company deleted successfully', 'تم حذف الشركة بنجاح'));
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(t('Failed to delete company', 'فشل حذف الشرك'));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    const labels = {
      pending: t('Pending', 'معلق'),
      approved: t('Approved', 'موافق'),
      rejected: t('Rejected', 'مرفوض')
    };
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.pending}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string, subType?: string) => {
    const types: Record<string, { en: string; ar: string }> = {
      leave: { en: 'Leave', ar: 'إجازة' },
      advance: { en: 'Advance', ar: 'سلفة' },
      entry: { en: 'Entry Permission', ar: 'خروج وعودة' }
    };
    
    let label = types[type] ? t(types[type].en, types[type].ar) : type;
    
    if (subType) {
      const subTypes: Record<string, { en: string; ar: string }> = {
        hourly: { en: 'Hourly', ar: 'ساعية' },
        annual: { en: 'Annual', ar: 'سنوية' },
        sick: { en: 'Sick', ar: 'مرضية' },
        emergency: { en: 'Emergency', ar: 'طارئة' },
        unpaid: { en: 'Unpaid', ar: 'بدون راتب' },
        personal: { en: 'Personal', ar: 'شخصية' },
        work: { en: 'Work', ar: 'للعمل' }
      };
      if (subTypes[subType]) {
        label += ` (${t(subTypes[subType].en, subTypes[subType].ar)})`;
      }
    }
    
    return label;
  };

  // Handle navigation from sidebar — always stay inside AdminLayout
  const handleNavigate = (page: string) => {
    setActivePage(page === 'employee-management' ? 'employees' : page);
  };

  // --- Page Renderers ---

  const renderDashboard = () => (
    <AdminDashboardV2 
      stats={stats} 
      recentRequests={requests}
      employeesCount={employees.length}
      companiesCount={companies.length}
      companies={companies}
      employees={employees}
      contractsExpiring={contractsExpiring}
      onNavigate={handleNavigate}
    />
  );

  const renderRequests = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('All Requests', 'جميع الطلبات')}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t('Manage and process all employee requests', 'إدارة ومعالجة جميع طلبات الموظفين')}
        </p>
      </div>

      {/* Refresh & Last Update */}
      <div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border/50 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchRequests(false)}
            disabled={isRefreshing}
            className="h-8 px-2 sm:px-3 gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('Refresh', 'تحديث')}</span>
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('Last updated:', 'آخر تحديث:')} <span className="font-medium font-mono">{lastUpdated.toLocaleTimeString()}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {t('Auto-updates every 30s', 'تحديث تلقائي كل 30 ثانية')}
           </Badge>
        </div>
      </div>

      {/* Actions and Filters */}
      <div className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => setActivePage('calendar')} variant="outline" className="flex-shrink-0">
            <CalendarIcon className="w-4 h-4 me-2" />
            {t('Calendar', 'التقويم')}
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="flex-shrink-0">
            <Download className="w-4 h-4 me-2" />
            {t('Export CSV', 'تصدير CSV')}
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="flex-shrink-0">
            <FileDown className="w-4 h-4 me-2" />
            {t('Export PDF', 'تصدير PDF')}
          </Button>
        </div>
        
        <AdvancedSearchFilter
          criteria={filterCriteria}
          onCriteriaChange={setFilterCriteria}
          companies={companies}
          showAdvanced={true}
        />
      </div>

      {/* Requests Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start">
                  <Checkbox
                    checked={selectedRequestIds.length === filteredRequests.filter(r => r.status === 'pending').length && filteredRequests.filter(r => r.status === 'pending').length > 0}
                    onCheckedChange={toggleSelectAllRequests}
                  />
                </th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Employee', 'الموظف')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Type', 'النوع')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Date/Time', 'التاريخ/الوقت')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Amount', 'المبلغ')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Status', 'الحالة')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    {request.status === 'pending' && (
                      <Checkbox
                        checked={selectedRequestIds.includes(request.id)}
                        onCheckedChange={() => toggleSelectRequest(request.id)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">
                        {t(
                          request.employees?.full_name || '',
                          request.employees?.full_name_ar || request.employees?.full_name || ''
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.employees?.companies?.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getTypeLabel(request.type, request.sub_type)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {request.start_date && <div>{request.start_date}</div>}
                    {request.end_date && <div className="text-xs text-muted-foreground">to {request.end_date}</div>}
                    {request.start_time && <div className="text-xs">{request.start_time}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {request.amount ? `${request.amount} ${t('SAR', 'ر.س')}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsRequestModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => updateRequestStatus(request.id, 'approved')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {(request.status === 'approved' || request.status === 'rejected') && (
                        <ResendEmailButton
                          requestId={request.id}
                          requestStatus={request.status}
                          employeeName={request.employees?.full_name}
                          onResendComplete={() => fetchRequests()}
                          variant="icon"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t('No requests found', 'لا توجد طلبات')}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRequestIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedRequestIds.length}
          selectedIds={selectedRequestIds}
          onClear={() => setSelectedRequestIds([])}
          onSuccess={() => {
            fetchRequests();
            setSelectedRequestIds([]);
          }}
        />
      )}
    </div>
  );

  const renderEmployees = () => (
    <EmployeeManagement onBack={() => setActivePage('dashboard')} />
  );

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('Companies', 'الشركات')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t(`${companies.length} registered companies`, `${companies.length} شركة مسجلة`)}
          </p>
        </div>
        <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 me-2" />
              {t('Add Company', 'إضافة شركة')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('Add New Company', 'إضافة شركة جديدة')}</DialogTitle>
              <DialogDescription>
                {t('Fill in the company details below', 'املأ تفاصيل الشركة أدناه')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('Company Name', 'اسم الشركة')} *</Label>
                <Input
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  placeholder={t('e.g., Ya Hala for Travel & Tours', 'مثال: يا هلا للسفر والسياحة')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Company Slug', 'معرف الشركة')} *</Label>
                <Input
                  value={newCompany.slug}
                  onChange={(e) => setNewCompany({...newCompany, slug: e.target.value})}
                  placeholder={t('e.g., ya-hala-travel-tours', 'مثال: ya-hala-travel-tours')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('Used in URLs, use lowercase letters and hyphens only', 'يُستخدم في الروابط، اسخدم أحرف صغيرة وشرطات فقط')}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddCompanyOpen(false)}>
                  {t('Cancel', 'إلغاء')}
                </Button>
                <Button onClick={addCompany} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {t('Add Company', 'إضافة شركة')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('ID', 'الرقم')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Company Name', 'اسم الشركة')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Slug', 'المعرف')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium">{t('Actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{company.id}</td>
                  <td className="px-4 py-3 font-medium">{company.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{company.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCompany(company);
                          setIsEditCompanyOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCompany(company.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {companies.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t('No companies found', 'لا توجد شركات')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return renderDashboard();
      case 'requests':
        return renderRequests();
      case 'employees':
        return <EmployeeManagement onBack={() => setActivePage('dashboard')} />;
      case 'leave-balances':
        setActivePage('employees');
        return null;
      case 'ticket-management':
        return <TicketBandsManager />;
      case 'document-expiry':
        return <DocumentExpiryReport callerRole="admin" />;
      case 'companies':
        return renderCompanies();
      case 'services':
        return (
          <AdminPortalServices
            requests={requests}
            onNavigate={handleNavigate}
          />
        );
      case 'documents':
        return <DocumentManagement />;
      case 'announcements':
        return <AnnouncementBoard />;
      case 'calendar':
        return <LeaveCalendar onBack={() => setActivePage('requests')} />;
      case 'settings':
        return <SettingsPage activeSection={activeSettingsSection} onSectionChange={setActiveSettingsSection} />;
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      <AdminLayout 
        activePage={activePage} 
        onNavigate={handleNavigate}
        pendingCount={stats.pending}
        settingsSection={activeSettingsSection}
        onSettingsSection={setActiveSettingsSection}
      >
        {renderPageContent()}
      </AdminLayout>

      {/* Edit Company Modal */}
      <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit Company', 'تعديل الشركة')}</DialogTitle>
            <DialogDescription>
              {t('Update the company details below', 'قم بتحديث تفاصيل الشركة أدناه')}
            </DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('Company Name', 'اسم الشركة')} *</Label>
                <Input
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Company Slug', 'معرف الشركة')} *</Label>
                <Input
                  value={editingCompany.slug}
                  onChange={(e) => setEditingCompany({...editingCompany, slug: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  {t('Used in URLs, use lowercase letters and hyphens only', 'يُستخدم في الروابط، استخدم أحرف صغيرة وشرطات فقط')}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditCompanyOpen(false)}>
                  {t('Cancel', 'إلغاء')}
                </Button>
                <Button onClick={updateCompany} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {t('Update Company', 'تحديث الشركة')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Details Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
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
              request={selectedRequest}
              adminInfo={adminInfo}
              onApprove={(id) => updateRequestStatus(id, 'approved')}
              onReject={(id) => updateRequestStatus(id, 'rejected')}
              onRefresh={() => fetchRequests()}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}