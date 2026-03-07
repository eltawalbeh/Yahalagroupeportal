import React, { useState } from 'react';
import {
  User, Building2, Calendar, Clock, Banknote, FileText,
  CheckCircle2, XCircle, Plane, Stethoscope, UserCheck,
  DoorOpen, MessageCircle, Activity, Info, ChevronRight,
  Mail, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { cn } from './ui/utils';
import { RequestComments } from './RequestComments';
import { RequestActivityLog } from './RequestActivityLog';
import { ResendEmailButton } from './ResendEmailButton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RequestEmployee {
  full_name?: string;
  full_name_ar?: string;
  phone?: string;
  position?: string;
  email?: string;
  companies?: { name?: string };
}

interface RequestData {
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
  employees?: RequestEmployee;
  employee_name?: string;
  employee_name_ar?: string;
  medical_report_url?: string;
  activity_log?: any[];
  // Manager-specific fields
  reason?: string;
  approval_notes?: string;
  processed_at?: string;
  processed_by_name?: string;
}

interface RequestDetailViewProps {
  request: RequestData;
  adminInfo?: { id?: string; name?: string };
  /** For manager context, pass caller details */
  callerRole?: 'admin' | 'manager';
  callerInfo?: { id?: string | number; name?: string; name_ar?: string };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRefresh: () => void;
  /** Custom ResendEmailButton props for manager context */
  resendEmailProps?: {
    callerRole?: string;
    callerInfo?: { id: number; name: string; name_ar?: string };
  };
}

// ─── Leave type visual config ────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  labelEn: string; labelAr: string;
  gradient: string; iconBg: string; textColor: string; borderColor: string;
  icon: React.ElementType;
}> = {
  annual:   { labelEn: 'Annual Leave',    labelAr: 'إجازة سنوية',     gradient: 'from-indigo-500 to-indigo-600',    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',   textColor: 'text-indigo-600 dark:text-indigo-400',   borderColor: 'border-indigo-200 dark:border-indigo-800',   icon: Plane },
  sick:     { labelEn: 'Sick Leave',      labelAr: 'إجازة مرضية',     gradient: 'from-rose-500 to-rose-600',        iconBg: 'bg-rose-100 dark:bg-rose-900/40',       textColor: 'text-rose-600 dark:text-rose-400',       borderColor: 'border-rose-200 dark:border-rose-800',       icon: Stethoscope },
  unpaid:   { labelEn: 'Unpaid Leave',    labelAr: 'إجازة بدون راتب', gradient: 'from-amber-500 to-amber-600',      iconBg: 'bg-amber-100 dark:bg-amber-900/40',     textColor: 'text-amber-600 dark:text-amber-400',     borderColor: 'border-amber-200 dark:border-amber-800',     icon: Banknote },
  personal: { labelEn: 'Personal Leave',  labelAr: 'إجازة شخصية',     gradient: 'from-violet-500 to-violet-600',    iconBg: 'bg-violet-100 dark:bg-violet-900/40',   textColor: 'text-violet-600 dark:text-violet-400',   borderColor: 'border-violet-200 dark:border-violet-800',   icon: UserCheck },
  hourly:   { labelEn: 'Hourly Leave',    labelAr: 'إجازة ساعية',     gradient: 'from-sky-500 to-sky-600',          iconBg: 'bg-sky-100 dark:bg-sky-900/40',         textColor: 'text-sky-600 dark:text-sky-400',         borderColor: 'border-sky-200 dark:border-sky-800',         icon: Clock },
  advance:  { labelEn: 'Salary Advance',  labelAr: 'سلفة راتب',       gradient: 'from-emerald-500 to-emerald-600',  iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', textColor: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-800', icon: Banknote },
  entry:    { labelEn: 'Exit & Return',   labelAr: 'خروج وعودة',      gradient: 'from-teal-500 to-teal-600',        iconBg: 'bg-teal-100 dark:bg-teal-900/40',       textColor: 'text-teal-600 dark:text-teal-400',       borderColor: 'border-teal-200 dark:border-teal-800',       icon: DoorOpen },
  leave:    { labelEn: 'Leave Request',   labelAr: 'طلب إجازة',       gradient: 'from-blue-500 to-blue-600',        iconBg: 'bg-blue-100 dark:bg-blue-900/40',       textColor: 'text-blue-600 dark:text-blue-400',       borderColor: 'border-blue-200 dark:border-blue-800',       icon: Plane },
};

function getConfig(type: string, subType?: string) {
  return TYPE_CONFIG[subType || ''] || TYPE_CONFIG[type] || TYPE_CONFIG['leave'];
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type TabKey = 'details' | 'activity' | 'discussion';

// ─── Component ───────────────────────────────────────────────────────────────

export function RequestDetailView({
  request,
  adminInfo,
  callerRole,
  callerInfo,
  onApprove,
  onReject,
  onRefresh,
  resendEmailProps,
}: RequestDetailViewProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const cfg = getConfig(request.type, request.sub_type);
  const Icon = cfg.icon;

  const employeeName = t(
    request.employees?.full_name || request.employee_name || '',
    request.employees?.full_name_ar || request.employee_name_ar || request.employees?.full_name || ''
  );

  const companyName = request.employees?.companies?.name || '';

  const getTypeLabel = () => {
    const sub = request.sub_type;
    const cfgSub = sub ? TYPE_CONFIG[sub] : null;
    if (cfgSub) return language === 'ar' ? cfgSub.labelAr : cfgSub.labelEn;
    const cfgType = TYPE_CONFIG[request.type];
    if (cfgType) return language === 'ar' ? cfgType.labelAr : cfgType.labelEn;
    return request.type;
  };

  const statusConfig: Record<string, { label: string; bg: string; ring: string }> = {
    pending:  { label: t('Pending Review', 'قيد المراجعة'),  bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',    ring: 'ring-amber-500/30' },
    approved: { label: t('Approved', 'تمت الموافقة'),        bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', ring: 'ring-emerald-500/30' },
    rejected: { label: t('Rejected', 'مرفوض'),              bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',             ring: 'ring-red-500/30' },
  };

  const status = statusConfig[request.status] || statusConfig['pending'];

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const tabs: { key: TabKey; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'details',    label: t('Details', 'التفاصيل'),     icon: Info },
    { key: 'activity',   label: t('Activity', 'النشاط'),      icon: Activity, count: (request as any).activity_log?.length },
    { key: 'discussion', label: t('Discussion', 'المناقشة'),   icon: MessageCircle },
  ];

  // ─── Details fields ──────────────────────────────────────────────────────

  const detailFields: { label: string; value: React.ReactNode; icon: React.ElementType; full?: boolean }[] = [];

  if (request.start_date) {
    detailFields.push({
      label: t('Start Date', 'تاريخ البدء'),
      value: formatDate(request.start_date),
      icon: Calendar,
    });
  }
  if (request.end_date && request.end_date !== request.start_date) {
    detailFields.push({
      label: t('End Date', 'تاريخ الانتهاء'),
      value: formatDate(request.end_date),
      icon: Calendar,
    });
  }
  if (request.start_time) {
    detailFields.push({
      label: t('Time', 'الوقت'),
      value: request.start_time,
      icon: Clock,
    });
  }
  if (request.amount) {
    detailFields.push({
      label: t('Amount', 'المبلغ'),
      value: `${request.amount.toLocaleString()} ${t('SAR', 'ر.س')}`,
      icon: Banknote,
    });
  }
  if (request.notes) {
    detailFields.push({
      label: t('Employee Notes', 'ملاحظات الموظف'),
      value: request.notes,
      icon: FileText,
      full: true,
    });
  }
  if (request.admin_notes) {
    detailFields.push({
      label: t('Admin Notes', 'ملاحظات الإدارة'),
      value: request.admin_notes,
      icon: FileText,
      full: true,
    });
  }
  // Manager-specific fields
  if (request.reason && request.reason !== request.notes) {
    detailFields.push({
      label: t('Reason', 'السبب'),
      value: request.reason,
      icon: FileText,
      full: true,
    });
  }
  if (request.approval_notes) {
    detailFields.push({
      label: t('Decision Notes', 'ملاحظات القرار'),
      value: request.approval_notes,
      icon: FileText,
      full: true,
    });
  }
  if (request.processed_by_name) {
    detailFields.push({
      label: t('Processed By', 'تمت المعالجة بواسطة'),
      value: request.processed_by_name,
      icon: User,
    });
  }
  if (request.processed_at) {
    detailFields.push({
      label: t('Processed At', 'تاريخ المعالجة'),
      value: formatDate(request.processed_at),
      icon: Calendar,
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 -mt-2">

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        'relative rounded-xl overflow-hidden bg-gradient-to-r p-5 sm:p-6',
        cfg.gradient
      )}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-6 -start-6 w-24 h-24 rounded-full bg-white/10" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                {getTypeLabel()}
              </h2>
              <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1',
                status.bg, status.ring
              )}>
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 text-sm">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {employeeName}
              </span>
              {companyName && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {companyName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(request.created_at)}
              </span>
            </div>

            <div className="mt-2">
              <span className="text-white/50 text-xs font-mono">
                #{request.id}
              </span>
            </div>
          </div>

          {/* Quick decision buttons in header for pending */}
          {request.status === 'pending' && (
            <div className="flex gap-2 sm:flex-col shrink-0">
              <Button
                onClick={() => onApprove?.(request.id)}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm flex-1 sm:flex-auto"
                size="sm"
              >
                <CheckCircle2 className="w-4 h-4 me-1.5" />
                {t('Approve', 'موافقة')}
              </Button>
              <Button
                onClick={() => onReject?.(request.id)}
                className="bg-white/10 hover:bg-red-500/40 text-white border border-white/20 backdrop-blur-sm flex-1 sm:flex-auto"
                size="sm"
              >
                <XCircle className="w-4 h-4 me-1.5" />
                {t('Reject', 'رفض')}
              </Button>
            </div>
          )}

          {/* Resend email for processed */}
          {(request.status === 'approved' || request.status === 'rejected') && (
            <div className="shrink-0">
              <ResendEmailButton
                requestId={request.id}
                requestStatus={request.status}
                employeeName={request.employees?.full_name}
                onResendComplete={onRefresh}
                {...resendEmailProps}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB BAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-1 mt-4 border-b border-border">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative',
                'hover:text-foreground',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <TabIcon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              )}
              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="mt-4 min-h-[300px]">

        {/* ── Details Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-5">
            {/* Employee card */}
            <Card className="p-4 sm:p-5 border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cfg.iconBg)}>
                  <User className={cn('w-4 h-4', cfg.textColor)} />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('Employee Information', 'معلومات الموظف')}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('Full Name', 'الاسم الكامل')}</p>
                  <p className="font-semibold text-sm">{employeeName}</p>
                </div>
                {request.employees?.position && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('Position', 'المنصب')}</p>
                    <p className="font-medium text-sm">{request.employees.position}</p>
                  </div>
                )}
                {companyName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('Company', 'الشركة')}</p>
                    <p className="font-medium text-sm">{companyName}</p>
                  </div>
                )}
                {request.employees?.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('Email', 'البريد')}</p>
                    <p className="font-medium text-sm">{request.employees.email}</p>
                  </div>
                )}
                {request.employees?.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('Phone', 'الهاتف')}</p>
                    <p className="font-medium text-sm dir-ltr">{request.employees.phone}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Request details card */}
            <Card className={cn('p-4 sm:p-5 border', cfg.borderColor)}>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cfg.iconBg)}>
                  <Icon className={cn('w-4 h-4', cfg.textColor)} />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('Request Details', 'تفاصيل الطلب')}
                </h3>
              </div>

              {detailFields.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detailFields.map((field, idx) => {
                    const FieldIcon = field.icon;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex gap-3 p-3 rounded-lg bg-muted/30 dark:bg-muted/10',
                          field.full && 'sm:col-span-2'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          cfg.iconBg
                        )}>
                          <FieldIcon className={cn('w-4 h-4', cfg.textColor)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">{field.label}</p>
                          <p className="text-sm font-medium break-words">{field.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t('No additional details', 'لا توجد تفاصيل إضافية')}
                </p>
              )}

              {/* Medical report */}
              {request.medical_report_url && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" asChild className={cn(cfg.textColor, cfg.borderColor)}>
                    <a href={request.medical_report_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 me-2" />
                      {t('View Medical Report', 'عرض التقرير الطبي')}
                    </a>
                  </Button>
                </div>
              )}
            </Card>

            {/* Decision card for pending — duplicate here for details tab visibility */}
            {request.status === 'pending' && (
              <Card className="p-4 sm:p-5 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('Pending Decision', 'بانتظار القرار')}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(
                    'This request is awaiting your review. Please approve or reject it.',
                    'هذا الطلب بانتظار مراجعتك. يرجى الموافقة أو الرفض.'
                  )}
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    onClick={() => onApprove?.(request.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {t('Approve Request', 'الموافقة على الطلب')}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => onReject?.(request.id)}
                  >
                    <XCircle className="w-4 h-4 me-2" />
                    {t('Reject Request', 'رفض الطلب')}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Activity Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <Card className="p-4 sm:p-6 border-border/60">
            <RequestActivityLog activityLog={(request as any).activity_log} />
          </Card>
        )}

        {/* ── Discussion Tab ───────────────────────────────────────────────── */}
        {activeTab === 'discussion' && (
          <Card className="p-4 sm:p-6 border-border/60">
            <RequestComments
              requestId={request.id.toString()}
              currentUserId={(callerInfo?.id || adminInfo?.id || 'admin').toString()}
              currentUserName={callerInfo?.name || adminInfo?.name || 'Super Admin'}
              currentUserRole={callerRole || 'admin'}
              onCommentAdded={onRefresh}
            />
          </Card>
        )}
      </div>
    </div>
  );
}