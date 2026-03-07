import React from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  FileText,
  ClipboardCheck,
  UserCheck,
  AlertTriangle,
  DollarSign,
  DoorOpen,
  CalendarClock
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';

interface ManagerDashboardV2Props {
  stats?: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  recentRequests?: any[];
  employeesCount?: number;
  contractsExpiring?: any[];
  onNavigate?: (page: string) => void;
  onProcessRequest?: (requestId: string, status: 'approved' | 'rejected') => void;
}

export function ManagerDashboardV2({ 
  stats, 
  recentRequests = [], 
  employeesCount = 0,
  contractsExpiring = [],
  onNavigate,
  onProcessRequest
}: ManagerDashboardV2Props) {
  const { t, language } = useLanguage();

  const pendingRequests = recentRequests.filter(r => r.status === 'pending');

  const getRequestTypeLabel = (type: string) => {
    const types: Record<string, { en: string; ar: string }> = {
      leave: { en: 'Leave', ar: 'إجازة' },
      advance: { en: 'Advance', ar: 'سلفة' },
      entry: { en: 'Entry Permission', ar: 'إذن خروج وعودة' },
      entry_permission: { en: 'Entry Permission', ar: 'إذن خروج وعودة' },
    };
    const found = types[type];
    return found ? t(found.en, found.ar) : type;
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return t('Approved', 'موافق');
    if (status === 'rejected') return t('Rejected', 'مرفوض');
    return t('Pending', 'معلق');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('HR Dashboard', 'لوحة تحكم الموارد البشرية')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("Manage your team's requests and leave balances.", "إدارة طلبات فريقك وأرصدة الإجازات.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9">
            <CalendarDays className="w-4 h-4 me-2" />
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' })}
          </Button>
        </div>
      </div>

      {/* Urgent Alert for Pending */}
      {(stats?.pending || 0) > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {t(
                `You have ${stats?.pending} pending request${stats?.pending !== 1 ? 's' : ''} awaiting your review`,
                `لديك ${stats?.pending} طلب${stats?.pending !== 1 ? 'ات' : ''} معلق بانتظار مراجعتك`
              )}
            </p>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/60 mt-0.5">
              {t('Please review and process them promptly.', 'يرجى مراجعتها ومعالجتها في أسرع وقت.')}
            </p>
          </div>
          <Button 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shrink-0"
            onClick={() => onNavigate?.('requests')}
          >
            {t('Review Now', 'مراجعة الآن')}
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title={t('Pending Requests', 'طلبات معلقة')}
          value={stats?.pending?.toString() || "0"}
          subtitle={t('Needs your action', 'بحاجة لإجراءك')}
          icon={Clock}
          color="amber"
          onClick={() => onNavigate?.('requests')}
        />
        <KPICard 
          title={t('Approved', 'تمت الموافقة')}
          value={stats?.approved?.toString() || "0"}
          subtitle={t('This period', 'هذه الفترة')}
          icon={CheckCircle2}
          color="emerald"
        />
        <KPICard 
          title={t('Rejected', 'مرفوض')}
          value={stats?.rejected?.toString() || "0"}
          subtitle={t('This period', 'هذه الفترة')}
          icon={XCircle}
          color="red"
        />
        <KPICard 
          title={t('Team Members', 'أعضاء الفريق')}
          value={employeesCount.toString()}
          subtitle={t('Active employees', 'الموظفون النشطون')}
          icon={Users}
          color="teal"
          onClick={() => onNavigate?.('employees')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pending Requests - Action Required */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('Requests Awaiting Action', 'طلبات بانتظار الإجراء')}</CardTitle>
              <CardDescription>{t('Review and process pending requests', 'مراجعة ومعالجة الطلبات المعلقة')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('requests')}>
              {t('View All', 'عرض الكل')}
            </Button>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {t('All caught up!', 'لا توجد طلبات معلقة!')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('No pending requests to review.', 'لا توجد طلبات بحاجة للمراجعة.')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm shrink-0">
                      {req.employees?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {language === 'ar' 
                            ? req.employees?.full_name_ar || req.employees?.full_name 
                            : req.employees?.full_name || t('Unknown', 'غير معروف')}
                        </p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {getRequestTypeLabel(req.request_type || req.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.start_date && (
                          <span>{new Date(req.start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')} </span>
                        )}
                        {req.end_date && req.start_date !== req.end_date && (
                          <span>→ {new Date(req.end_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                        )}
                        {req.amount && (
                          <span>{t('Amount:', 'المبلغ:')} {req.amount} SAR</span>
                        )}
                        {!req.start_date && !req.amount && (
                          <span>{new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                        )}
                      </p>
                      {req.reason && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5 italic">
                          "{req.reason}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => onProcessRequest?.(req.id, 'rejected')}
                      >
                        <XCircle className="w-3.5 h-3.5 me-1" />
                        {t('Reject', 'رفض')}
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => onProcessRequest?.(req.id, 'approved')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 me-1" />
                        {t('Approve', 'موافقة')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Recent Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">{t('Quick Actions', 'إجراءات سريعة')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-11 border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-600 transition-all"
                onClick={() => onNavigate?.('requests')}
              >
                <div className="p-1 rounded bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                {t('Process Requests', 'معالجة الطلبات')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-11 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 transition-all"
                onClick={() => onNavigate?.('employees')}
              >
                <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                {t('View Team Members', 'عرض أعضاء الفريق')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-11 border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 transition-all"
                onClick={() => onNavigate?.('calendar')}
              >
                <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                {t('Leave Calendar', 'تقويم الإجازات')}
              </Button>

              {/* Self-Service Quick Actions */}
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {t('Self Service', 'الخدمة الذاتية')}
                </p>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-11 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-all"
                  onClick={() => onNavigate?.('leave')}
                >
                  <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  {t('Request Leave', 'طلب إجازة')}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-11 mt-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 transition-all"
                  onClick={() => onNavigate?.('advance')}
                >
                  <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  {t('Request Advance', 'طلب سلفة')}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-11 mt-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 transition-all"
                  onClick={() => onNavigate?.('entry')}
                >
                  <div className="p-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  {t('Entry Permission', 'إذن خروج وعودة')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('Recent Activity', 'النشاط الأخير')}</CardTitle>
              <CardDescription>{t('Latest request updates', 'آخر تحديثات الطلبات')}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-0">
                {recentRequests.slice(0, 6).map((req, i) => (
                  <div key={req.id || i} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-b border-border/50 last:border-0">
                    <div className={cn(
                      "mt-1 w-2 h-2 rounded-full shrink-0",
                      req.status === 'approved' ? "bg-emerald-500" : req.status === 'pending' ? "bg-amber-500" : "bg-red-500"
                    )} />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {language === 'ar' 
                          ? req.employees?.full_name_ar || req.employees?.full_name 
                          : req.employees?.full_name || t('Employee', 'موظف')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRequestTypeLabel(req.request_type || req.type)}
                        {' - '}
                        <span className={cn(
                          req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                        )}>
                          {getStatusLabel(req.status)}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                ))}
                {recentRequests.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {t('No recent activity', 'لا يوجد نشاط أخير')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Contracts Expiring Soon (Manager View) ──────────────────────────────── */}
      {contractsExpiring.length > 0 && (
        <Card className="shadow-sm border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {t('Contracts Expiring Soon', 'عقود تقترب من نهايتها')}
                  </CardTitle>
                  <CardDescription>
                    {t('Within 90 days — alerts sent at 70 days', 'خلال 90 يوماً — يُرسَل التنبيه قبل 70 يوماً')}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                {contractsExpiring.length} {t('contracts', 'عقد')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="space-y-0">
              {contractsExpiring.map((c, i) => {
                const isCritical = c.days_remaining <= 30;
                const isAlert   = c.days_remaining > 30 && c.days_remaining <= 70;
                return (
                  <div
                    key={c.id || i}
                    className={cn(
                      "flex items-center gap-4 px-6 py-3 border-b border-border/50 last:border-0",
                      "hover:bg-white/80 dark:hover:bg-slate-800/50 transition-colors"
                    )}
                  >
                    {/* Urgency dot */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isCritical ? "bg-red-500" : isAlert ? "bg-amber-500" : "bg-blue-400"
                    )} />

                    {/* Name + position */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {language === 'ar' ? c.full_name_ar || c.full_name : c.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {language === 'ar' ? c.position_ar || c.position : c.position || '—'}
                        {c.company_name && (
                          <span className="text-slate-400"> · {c.company_name}</span>
                        )}
                      </p>
                    </div>

                    {/* Contract end date + badge */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {new Date(c.contract_end_date).toLocaleDateString(
                          language === 'ar' ? 'ar-SA' : 'en-US',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] mt-0.5 border-0",
                          isCritical
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : isAlert
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        )}
                      >
                        {c.days_remaining === 0
                          ? t('Today!', 'اليوم!')
                          : `${c.days_remaining} ${t('days', 'يوم')}`}
                      </Badge>
                    </div>

                    {/* Alert-sent indicator */}
                    {c.alert_sent && (
                      <div className="shrink-0" title={t('70-day alert sent', 'تم إرسال تنبيه الـ 70 يوماً')}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                    {!c.alert_sent && c.days_remaining <= 75 && (
                      <div className="shrink-0" title={t('Alert pending', 'التنبيه في الانتظار')}>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pt-3 pb-1 flex items-center justify-between border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {contractsExpiring.filter(c => c.days_remaining <= 30).length > 0 && (
                  <span className="text-red-600 font-medium me-3">
                    {contractsExpiring.filter(c => c.days_remaining <= 30).length} {t('critical (≤30 days)', 'بالغة الأهمية (≤30 يوم)')}
                  </span>
                )}
                {contractsExpiring.filter(c => c.days_remaining > 30 && c.days_remaining <= 70).length > 0 && (
                  <span className="text-amber-600 font-medium">
                    {contractsExpiring.filter(c => c.days_remaining > 30 && c.days_remaining <= 70).length} {t('in 70-day window', 'في نطاق الـ 70 يوماً')}
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-teal-600"
                onClick={() => onNavigate?.('employees')}
              >
                {t('View Employees', 'عرض الموظفين')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color, onClick }: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: 'amber' | 'emerald' | 'red' | 'teal';
  onClick?: () => void;
}) {
  const colorMap = {
    amber: {
      icon: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    emerald: {
      icon: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    },
    red: {
      icon: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'hover:border-red-300 dark:hover:border-red-700',
    },
    teal: {
      icon: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      border: 'hover:border-teal-300 dark:hover:border-teal-700',
    },
  };

  const colors = colorMap[color];

  return (
    <Card 
      className={cn(
        "shadow-sm transition-all border-slate-200 dark:border-slate-800",
        colors.border,
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <Icon className={cn("h-4 w-4", colors.icon)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}