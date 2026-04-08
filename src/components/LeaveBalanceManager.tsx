import React, { useState, useEffect } from 'react';
import {
  Calendar, Stethoscope, AlertCircle, BanknoteIcon, RefreshCw, Search,
  ChevronDown, ChevronUp, Edit3, Save, X, History, User, Clock, Shield
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';

interface Employee {
  id: number;
  full_name: string;
  full_name_ar?: string;
  hire_date?: string;
  position?: string;
  position_ar?: string;
  company_id?: number;
  status?: string;
}

interface LeaveBalance {
  allowance: number;
  approved: number;
  pending: number;
  cancelled: number;
  adjustment: number;
  adjustmentHistory: AdjustmentEntry[];
  available: number;
}

interface AdjustmentEntry {
  id: string;
  previousAmount: number;
  newAmount: number;
  reason: string;
  reasonAr: string;
  adjustedBy: string;
  timestamp: string;
}

interface BalanceData {
  employee: Employee;
  financialYear: string;
  annualEligible: boolean;
  eligibleDate: string | null;
  balances: Record<string, LeaveBalance>;
}

const LEAVE_TYPE_CONFIG = [
  { id: 'annual', icon: Calendar, color: '#006B7D', label: 'Annual Leave', labelAr: 'إجازة سنوية', limit: 30 },
  { id: 'sick', icon: Stethoscope, color: '#DC2626', label: 'Sick Leave', labelAr: 'إجازة مرضية', limit: 14 },
  { id: 'emergency', icon: AlertCircle, color: '#EA580C', label: 'Emergency Leave', labelAr: 'إجازة طارئة', limit: 5 },
  { id: 'unpaid', icon: BanknoteIcon, color: '#92400E', label: 'Unpaid Leave', labelAr: 'إجازة بدون راتب', limit: 30 },
];

export function LeaveBalanceManager() {
  const { t, language } = useLanguage();
  const { adminInfo } = useAuth() as any;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected employee state
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Adjustment dialog
  const [adjustDialog, setAdjustDialog] = useState<{ type: string; open: boolean }>({ type: '', open: false });
  const [adjustDays, setAdjustDays] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustReasonAr, setAdjustReasonAr] = useState('');
  const [saving, setSaving] = useState(false);

  // History dialog
  const [historyDialog, setHistoryDialog] = useState<{ type: string; open: boolean }>({ type: '', open: false });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    let result = employees;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.full_name.toLowerCase().includes(q) ||
        (e.full_name_ar || '').includes(q) ||
        e.id.toString().includes(q)
      );
    }
    if (filterCompany !== 'all') {
      result = result.filter(e => e.company_id?.toString() === filterCompany);
    }
    setFilteredEmployees(result);
  }, [employees, searchQuery, filterCompany]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/admin/employees');
      // Parse as text first for safe error handling
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch (parseErr) {
        console.error('Error parsing employees response:', text.slice(0, 200), parseErr);
        return;
      }
      if (data.success) {
        const active = (data.employees || []).filter((e: any) => e.status !== 'inactive' && !e.deleted_at);
        setEmployees(active);
        setFilteredEmployees(active);
      }
      // Use /companies (no /admin prefix — publicly accessible endpoint)
      const compRes = await adminFetch('/companies');
      const compText = await compRes.text();
      let compData: any;
      try { compData = JSON.parse(compText); } catch (parseErr) {
        console.error('Error parsing companies response:', compText.slice(0, 200), parseErr);
        return;
      }
      if (compData.success) setCompanies(compData.companies || []);
    } catch (err) {
      console.error('Error fetching employees for leave balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async (empId: number) => {
    setLoadingBalance(true);
    setSelectedEmpId(empId);
    try {
      const res = await adminFetch(`/admin/leave-balances/${empId}`);
      const data = await res.json();
      if (data.success) {
        setBalanceData(data);
      } else {
        toast.error(data.message || t('Failed to load balances', 'فشل تحميل الأرصدة'));
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      toast.error(t('Error loading leave balances', 'خطأ في تحميل أرصدة الإجازات'));
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleAdjust = async () => {
    if (!selectedEmpId || !adjustDialog.type) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/admin/leave-balances/${selectedEmpId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          leaveType: adjustDialog.type,
          adjustmentDays: parseFloat(adjustDays),
          reason: adjustReason,
          reasonAr: adjustReasonAr,
          adjustedBy: adminInfo?.name || 'HR Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('Balance adjusted successfully', 'تم تعديل الرصيد بنجاح'));
        setAdjustDialog({ type: '', open: false });
        fetchBalance(selectedEmpId);
      } else {
        toast.error(data.message || t('Failed to adjust balance', 'فشل تعديل الرصيد'));
      }
    } catch (err) {
      console.error('Adjustment error:', err);
      toast.error(t('Error adjusting balance', 'خطأ في تعديل الرصيد'));
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return d; }
  };

  const getServiceYears = (hireDate?: string) => {
    if (!hireDate) return null;
    const hire = new Date(hireDate);
    const now = new Date();
    const years = (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(years * 10) / 10;
  };

  const empName = (e: Employee) => language === 'ar' ? (e.full_name_ar || e.full_name) : e.full_name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('Leave Balance Management', 'إدارة أرصدة الإجازات')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('View and adjust employee leave balances. Corrections override auto-calculated usage.',
              'عرض وتعديل أرصدة إجازات الموظفين. التعديلات تتجاوز الحسابات التلقائية.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEmployees} className="gap-1.5 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
          {t('Refresh', 'تحديث')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('Search by name or ID...', 'البحث بالاسم أو الرقم...')}
            className="ps-9"
          />
        </div>
        {companies.length > 1 && (
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('All Companies', 'جميع الشركات')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Companies', 'جميع الشركات')}</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="lg:col-span-1 border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm font-semibold">
              {t('Employees', 'الموظفون')} <span className="text-muted-foreground font-normal">({filteredEmployees.length})</span>
            </p>
          </div>
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto divide-y">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin me-2" />
                {t('Loading...', 'جاري التحميل...')}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {t('No employees found', 'لا يوجد موظفون')}
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmpId === emp.id;
                const serviceYears = getServiceYears(emp.hire_date);
                return (
                  <button
                    key={emp.id}
                    onClick={() => fetchBalance(emp.id)}
                    className={`w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-s-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{empName(emp)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">#{emp.id}</span>
                          {emp.hire_date && (
                            <>
                              <span>-</span>
                              <span>{fmtDate(emp.hire_date)}</span>
                            </>
                          )}
                        </div>
                        {serviceYears !== null && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {serviceYears >= 1
                              ? t(`${serviceYears} years service`, `${serviceYears} سنة خدمة`)
                              : t(`${Math.round(serviceYears * 12)} months service`, `${Math.round(serviceYears * 12)} شهر خدمة`)
                            }
                          </p>
                        )}
                      </div>
                      {!emp.hire_date && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 shrink-0">
                          {t('No hire date', 'بدون تاريخ')}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Balance Detail Panel */}
        <div className="lg:col-span-2">
          {!selectedEmpId ? (
            <div className="border rounded-xl bg-card flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Calendar className="w-12 h-12 opacity-20" />
              <p className="text-sm">{t('Select an employee to view leave balances', 'اختر موظفاً لعرض أرصدة الإجازات')}</p>
            </div>
          ) : loadingBalance ? (
            <div className="border rounded-xl bg-card flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin me-2" />
              {t('Loading balances...', 'جاري تحميل الأرصدة...')}
            </div>
          ) : balanceData ? (
            <div className="space-y-4">
              {/* Employee Info Card */}
              <div className="border rounded-xl bg-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold">{empName(balanceData.employee)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('Financial Year', 'السنة المالية')}: <span className="font-mono font-semibold">{balanceData.financialYear}</span>
                    </p>
                  </div>
                  <div className="text-end text-sm">
                    <p className="text-muted-foreground">{t('Hire Date', 'تاريخ التعيين')}</p>
                    <p className="font-semibold">{fmtDate(balanceData.employee.hire_date || '')}</p>
                    {!balanceData.annualEligible && balanceData.eligibleDate && (
                      <Badge className="mt-1 text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                        {t(`Annual eligible: ${fmtDate(balanceData.eligibleDate)}`, `مؤهل للسنوية: ${fmtDate(balanceData.eligibleDate)}`)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Balance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LEAVE_TYPE_CONFIG.map(cfg => {
                  const bal = balanceData.balances[cfg.id];
                  if (!bal) return null;
                  const Icon = cfg.icon;
                  const effectiveTotal = bal.allowance + bal.adjustment;
                  const usedPercent = effectiveTotal > 0 ? Math.min(100, ((bal.approved + bal.pending) / effectiveTotal) * 100) : 0;
                  const isNotEligible = cfg.id === 'annual' && !balanceData.annualEligible;

                  return (
                    <div key={cfg.id} className={`border rounded-xl bg-card overflow-hidden ${isNotEligible ? 'opacity-60' : ''}`}>
                      {/* Card Header */}
                      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ backgroundColor: `${cfg.color}08` }}>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${cfg.color}18` }}>
                            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                          </div>
                          <span className="font-semibold text-sm">{t(cfg.label, cfg.labelAr)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {bal.adjustmentHistory.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title={t('Adjustment History', 'سجل التعديلات')}
                              onClick={() => setHistoryDialog({ type: cfg.id, open: true })}
                            >
                              <History className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={t('Adjust Balance', 'تعديل الرصيد')}
                            onClick={() => {
                              setAdjustDays(bal.adjustment.toString());
                              setAdjustReason('');
                              setAdjustReasonAr('');
                              setAdjustDialog({ type: cfg.id, open: true });
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        {isNotEligible && (
                          <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 px-3 py-2 text-xs text-sky-700 dark:text-sky-400">
                            {t('Not yet eligible (< 1 year service)', 'غير مؤهل بعد (أقل من سنة خدمة)')}
                          </div>
                        )}

                        {/* Main stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xl font-bold" style={{ color: cfg.color }}>{bal.available}</p>
                            <p className="text-[10px] text-muted-foreground">{t('Available', 'المتاح')}</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-foreground">{bal.approved}</p>
                            <p className="text-[10px] text-muted-foreground">{t('Used', 'مستخدم')}</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-amber-500">{bal.pending}</p>
                            <p className="text-[10px] text-muted-foreground">{t('Pending', 'معلق')}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{t('Usage', 'الاستخدام')}</span>
                            <span>{bal.approved + bal.pending} / {effectiveTotal} {t('days', 'يوم')}</span>
                          </div>
                          <div className="h-2 rounded-full bg-border/50">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${usedPercent}%`, backgroundColor: usedPercent > 90 ? '#DC2626' : cfg.color }}
                            />
                          </div>
                        </div>

                        {/* Detail row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <span>{t('Allowance', 'المسموح')}: <strong className="text-foreground">{bal.allowance}</strong></span>
                          {bal.adjustment !== 0 && (
                            <span className={bal.adjustment > 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {t('HR Adjust', 'تعديل HR')}: <strong>{bal.adjustment > 0 ? '+' : ''}{bal.adjustment}</strong>
                            </span>
                          )}
                          {bal.cancelled > 0 && (
                            <span>{t('Cancelled', 'ملغي')}: <strong>{bal.cancelled}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info notice */}
              <div className="rounded-xl p-4 flex items-start gap-3 border border-indigo-200 bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-950/20">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                    {t('How Balances Work', 'كيف تعمل الأرصدة')}
                  </p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                    {t(
                      'Balances are auto-calculated from approved & pending requests. Use "Adjust" to add or subtract days for corrections (e.g., paper-recorded leaves not in the system). Adjustments are logged with full history.',
                      'الأرصدة تُحسب تلقائياً من الطلبات المعتمدة والمعلقة. استخدم "تعديل" لإضافة أو خصم أيام للتصحيحات (مثلاً: إجازات مسجلة ورقياً وليست في النظام). جميع التعديلات مسجلة بالتاريخ الكامل.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={adjustDialog.open} onOpenChange={o => { if (!o) setAdjustDialog({ type: '', open: false }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              {t('Adjust Leave Balance', 'تعديل رصيد الإجازة')}
            </DialogTitle>
            <DialogDescription>
              {t(
                `Adjust the ${adjustDialog.type} leave balance for ${balanceData ? empName(balanceData.employee) : ''}. Use positive numbers to add days and negative to subtract.`,
                `تعديل رصيد إجازة ${adjustDialog.type === 'annual' ? 'السنوية' : adjustDialog.type === 'sick' ? 'المرضية' : adjustDialog.type === 'emergency' ? 'الطارئة' : 'بدون راتب'} للموظف ${balanceData ? empName(balanceData.employee) : ''}. أرقام موجبة لإضافة أيام وسالبة للخصم.`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Adjustment (days)', 'التعديل (أيام)')}</Label>
              <Input
                type="number"
                value={adjustDays}
                onChange={e => setAdjustDays(e.target.value)}
                placeholder="e.g., -5 or +3"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'Example: -5 means "this employee used 5 days that were not recorded on the system"',
                  'مثال: -5 تعني "هذا الموظف استخدم 5 أيام لم تُسجل في النظام"'
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('Reason (English)', 'السبب (إنجليزي)')}</Label>
              <Textarea
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder={t('Why is this adjustment needed?', 'لماذا هذا التعديل مطلوب؟')}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Reason (Arabic)', 'السبب (عربي)')}</Label>
              <Textarea
                value={adjustReasonAr}
                onChange={e => setAdjustReasonAr(e.target.value)}
                placeholder={t('Arabic reason (optional)', 'السبب بالعربي (اختياري)')}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustDialog({ type: '', open: false })}>{t('Cancel', 'إلغاء')}</Button>
            <Button
              onClick={handleAdjust}
              disabled={saving || !adjustReason.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <RefreshCw className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
              {t('Save Adjustment', 'حفظ التعديل')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={o => { if (!o) setHistoryDialog({ type: '', open: false }); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              {t('Adjustment History', 'سجل التعديلات')}
            </DialogTitle>
            <DialogDescription>
              {t('Complete log of balance adjustments made by HR.', 'السجل الكامل لتعديلات الأرصدة من قِبل الموارد البشرية.')}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {balanceData?.balances[historyDialog.type]?.adjustmentHistory?.length ? (
              [...balanceData.balances[historyDialog.type].adjustmentHistory]
                .reverse()
                .map((entry, idx) => (
                  <div key={entry.id || idx} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {entry.previousAmount} &rarr; <span className={entry.newAmount > entry.previousAmount ? 'text-emerald-600' : entry.newAmount < entry.previousAmount ? 'text-red-500' : ''}>{entry.newAmount}</span> {t('days', 'يوم')}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDate(entry.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('By', 'بواسطة')}: {entry.adjustedBy}</p>
                    {entry.reason && <p className="text-xs bg-muted/50 rounded px-2 py-1">{entry.reason}</p>}
                    {entry.reasonAr && <p className="text-xs bg-muted/50 rounded px-2 py-1 text-end" dir="rtl">{entry.reasonAr}</p>}
                  </div>
                ))
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">{t('No adjustments recorded', 'لا توجد تعديلات مسجلة')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}