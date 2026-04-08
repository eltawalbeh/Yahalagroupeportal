import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, RefreshCw, Search, FileText, Shield, Clock,
  CheckCircle2, XCircle, User, ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ExpiryRecord {
  employee_id: number;
  full_name: string;
  full_name_ar?: string;
  position?: string;
  company_id?: number;
  document: string;
  document_label: string;
  document_label_ar: string;
  expiry_date: string;
  days_remaining: number;
  is_expired: boolean;
}

interface DocumentExpiryReportProps {
  callerRole?: 'admin' | 'manager';
}

// Helper: fetch for HR/Manager role (no admin token needed)
async function hrFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const isFormData = init.body instanceof FormData;
  const baseHeaders: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  };
  return fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a${path}`,
    { ...init, headers: { ...baseHeaders, ...(init.headers as Record<string, string> || {}) } }
  );
}

export function DocumentExpiryReport({ callerRole = 'admin' }: DocumentExpiryReportProps) {
  const { t, language } = useLanguage();
  const { employee } = useAuth();
  const [records, setRecords] = useState<ExpiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDays, setFilterDays] = useState('90');
  const [filterDoc, setFilterDoc] = useState('all');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [filterDays]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res: Response;
      if (callerRole === 'manager' && employee?.id) {
        // HR/Manager: use non-admin endpoint with employee_id auth
        res = await hrFetch(`/hr/document-expiry-report?days=${filterDays}&employee_id=${employee.id}`);
      } else {
        // Admin: use admin-guarded endpoint
        res = await adminFetch(`/admin/document-expiry-report?days=${filterDays}`);
      }
      const data = await res.json();
      if (data.success) setRecords(data.expiring || []);
      else toast.error(data.message || t('Failed to load report', 'فشل تحميل التقرير'));
    } catch (e) {
      console.error('Error fetching expiry report:', e);
      toast.error(t('Connection error', 'خطأ في الاتصال'));
    } finally { setLoading(false); }
  };

  const handleSendAlerts = async () => {
    setCheckingAlerts(true);
    try {
      let res: Response;
      if (callerRole === 'manager' && employee?.id) {
        res = await hrFetch('/hr/check-document-expiry-alerts', {
          method: 'POST',
          body: JSON.stringify({ employee_id: employee.id })
        });
      } else {
        res = await adminFetch('/admin/check-document-expiry-alerts');
      }
      const data = await res.json();
      if (data.success) {
        if (data.total > 0) toast.success(t(`${data.total} alert(s) sent`, `تم إرسال ${data.total} تنبيه`));
        else toast.success(t('No new alerts to send', 'لا توجد تنبيهات جديدة للإرسال'));
      } else { toast.error(data.message); }
    } catch (e) { toast.error(t('Error sending alerts', 'خطأ في إرسال التنبيهات')); }
    finally { setCheckingAlerts(false); }
  };

  const filtered = records
    .filter(r => {
      if (filterDoc !== 'all' && r.document !== filterDoc) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.full_name.toLowerCase().includes(q) || (r.full_name_ar || '').includes(q);
      }
      return true;
    })
    .sort((a, b) => sortAsc ? a.days_remaining - b.days_remaining : b.days_remaining - a.days_remaining);

  const empName = (r: ExpiryRecord) => language === 'ar' ? (r.full_name_ar || r.full_name) : r.full_name;
  const docLabel = (r: ExpiryRecord) => language === 'ar' ? r.document_label_ar : r.document_label;

  const getStatusColor = (days: number) => {
    if (days < 0) return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300';
    if (days <= 30) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
    if (days <= 60) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400';
  };

  const getStatusBadge = (days: number) => {
    if (days < 0) return <Badge className="bg-red-600 text-white text-[10px]">{t('EXPIRED', 'منتهية')}</Badge>;
    if (days <= 30) return <Badge className="bg-red-100 text-red-800 border border-red-300 text-[10px]">{t('Critical', 'حرج')}</Badge>;
    if (days <= 60) return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">{t('Urgent', 'عاجل')}</Badge>;
    return <Badge className="bg-sky-100 text-sky-800 border border-sky-200 text-[10px]">{t('Upcoming', 'قادم')}</Badge>;
  };

  const expired = records.filter(r => r.is_expired).length;
  const critical = records.filter(r => !r.is_expired && r.days_remaining <= 30).length;
  const urgent = records.filter(r => !r.is_expired && r.days_remaining > 30 && r.days_remaining <= 60).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            {t('Document Expiry Report', 'تقرير انتهاء الوثائق')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Track passport, Iqama, and work permit expiry dates for all employees.', 'تتبع تواريخ انتهاء جوازات السفر والإقامة وتصاريح العمل لجميع الموظفين.')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchReport} className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> {t('Refresh', 'تحديث')}
          </Button>
          <Button size="sm" onClick={handleSendAlerts} disabled={checkingAlerts}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
            {checkingAlerts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            {t('Send Alerts', 'إرسال التنبيهات')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('Total Expiring', 'إجمالي منتهية/قريبة'), value: records.length, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800/30' },
          { label: t('Expired', 'منتهية الصلاحية'), value: expired, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: t('Critical (≤30 days)', 'حرجة (≤30 يوم)'), value: critical, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: t('Urgent (≤60 days)', 'عاجلة (≤60 يوم)'), value: urgent, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border p-4 ${stat.bg}`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('Search by employee name...', 'البحث بالاسم...')}
            className="ps-9"
          />
        </div>
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">{t('Next 30 days', '30 يوم القادمة')}</SelectItem>
            <SelectItem value="60">{t('Next 60 days', '60 يوم القادمة')}</SelectItem>
            <SelectItem value="90">{t('Next 90 days', '90 يوم القادمة')}</SelectItem>
            <SelectItem value="180">{t('Next 6 months', 'الـ 6 أشهر القادمة')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDoc} onValueChange={setFilterDoc}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Documents', 'جميع الوثائق')}</SelectItem>
            <SelectItem value="passport_expiry">{t('Passport', 'جواز السفر')}</SelectItem>
            <SelectItem value="iqama_expiry">{t('Iqama', 'الإقامة')}</SelectItem>
            <SelectItem value="work_permit_expiry">{t('Work Permit', 'تصريح العمل')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setSortAsc(p => !p)} className="gap-1">
          {sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {sortAsc ? t('Soonest First', 'الأقرب أولاً') : t('Latest First', 'الأبعد أولاً')}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin me-2" /> {t('Loading...', 'جاري التحميل...')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border rounded-xl bg-card py-16 text-center text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 opacity-20 mx-auto mb-2" />
          <p className="text-sm">{t('No expiring documents found in this period', 'لا توجد وثائق منتهية أو قريبة الانتهاء في هذه الفترة')}</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('Employee', 'الموظف')}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('Document', 'الوثيقة')}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('Expiry Date', 'تاريخ الانتهاء')}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('Status', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r, idx) => (
                  <tr key={idx} className={`hover:bg-muted/30 ${r.is_expired ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{empName(r)}</p>
                          {r.position && <p className="text-xs text-muted-foreground">{r.position}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{docLabel(r)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm">{new Date(r.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(r.days_remaining)}
                        <span className={`text-xs font-medium ${r.is_expired ? 'text-red-600' : r.days_remaining <= 30 ? 'text-red-500' : r.days_remaining <= 60 ? 'text-amber-500' : 'text-sky-600'}`}>
                          {r.is_expired
                            ? t(`Expired ${Math.abs(r.days_remaining)} days ago`, `انتهت منذ ${Math.abs(r.days_remaining)} يوم`)
                            : t(`${r.days_remaining} days`, `${r.days_remaining} يوم`)
                          }
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/20 p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 dark:text-indigo-400">
          {t(
            'Document data is sourced from the employee\'s Extra Information section. HR can update passport, Iqama, and work permit expiry dates in Employee Management. Automated alerts are sent at 90, 60, and 30 days before expiry.',
            'بيانات الوثائق مأخوذة من قسم المعلومات الإضافية للموظف. يمكن للموارد البشرية تحديث تواريخ انتهاء جواز السفر والإقامة وتصريح العمل من إدارة الموظفين. يتم إرسال تنبيهات تلقائية قبل 90 و60 و30 يوماً من الانتهاء.'
          )}
        </p>
      </div>
    </div>
  );
}
