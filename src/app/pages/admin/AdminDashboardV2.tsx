import React, { useId, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  Megaphone,
  Building2,
  UserPlus,
  CalendarClock,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../components/ui/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdminDashboardV2Props {
  stats?: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  recentRequests?: any[];
  employeesCount?: number;
  companiesCount?: number;
  companies?: any[];
  employees?: any[];
  contractsExpiring?: any[];
  onNavigate?: (page: string) => void;
}

export function AdminDashboardV2({ 
  stats, 
  recentRequests = [], 
  employeesCount = 0, 
  companiesCount = 0,
  companies = [],
  employees = [],
  contractsExpiring = [],
  onNavigate 
}: AdminDashboardV2Props) {
  const { t, language } = useLanguage();
  // useId() provides a stable, unique ID per component instance — eliminates Recharts SVG key collisions
  const uid = useId().replace(/:/g, '');
  const gradientApprovedId = `colorApproved-${uid}`;
  const gradientRejectedId = `colorRejected-${uid}`;

  // Generate real chart data from requests grouped by month
  const chartData = useMemo(() => {
    const months: Record<string, { approved: number; rejected: number; pending: number; label: string }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      // Append year if window might span two calendar years
      const label = i > 0 && d.getMonth() === 11 ? `Dec '${String(d.getFullYear()).slice(2)}` : monthNames[d.getMonth()];
      months[key] = { approved: 0, rejected: 0, pending: 0, label };
    }

    recentRequests.forEach(req => {
      const d = new Date(req.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (months[key]) {
        if (req.status === 'approved') months[key].approved++;
        else if (req.status === 'rejected') months[key].rejected++;
        else months[key].pending++;
      }
    });

    return Object.entries(months).map(([key, val]) => ({
      name: val.label,
      key,
      approved: val.approved,
      rejected: val.rejected,
      pending: val.pending,
    }));
  }, [recentRequests]);

  // Company distribution - employees per company
  const companyDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    employees.forEach(emp => {
      const companyName = emp.companies?.name || emp.company_name || 'Unknown';
      dist[companyName] = (dist[companyName] || 0) + 1;
    });
    return Object.entries(dist)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [employees]);

  // Approval rate
  const approvalRate = stats && (stats.approved + stats.rejected) > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
    : 0;

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

  // Partition contracts: critical (≤30 days), warning (31–70 days)
  const criticalContracts = contractsExpiring.filter(c => c.days_remaining <= 30);
  const warningContracts  = contractsExpiring.filter(c => c.days_remaining > 30 && c.days_remaining <= 70);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('Dashboard Overview', 'نظرة عامة')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("Here's what's happening at Ya Hala Group today.", "إليك ما يحدث في مجموعة يا هلا اليوم.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9">
            <CalendarDays className="w-4 h-4 me-2" />
            {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' })}
          </Button>
          <Button className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20" onClick={() => onNavigate?.('requests')}>
            <TrendingUp className="w-4 h-4 me-2" />
            {t('View Reports', 'عرض التقارير')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title={t('Total Requests', 'إجالي الطلبات')}
          value={stats?.total?.toString() || "0"}
          trend={`${stats?.total || 0} ${t('all time', 'إجمالي')}`}
          trendUp={true}
          icon={FileText}
          description={t('All time', 'جميع الأوقات')}
          onClick={() => onNavigate?.('requests')}
        />
        <KPICard 
          title={t('Pending Requests', 'طلبات معلقة')}
          value={stats?.pending?.toString() || "0"}
          trend={stats?.pending && stats.pending > 5 ? t('High', 'عالي') : t('Low', 'منخفض')}
          trendUp={!(stats?.pending && stats.pending > 5)}
          inverseColor
          icon={Clock}
          description={t('Awaiting approval', 'بانتظار الموافقة')}
          onClick={() => onNavigate?.('requests')}
        />
        <KPICard 
          title={t('Total Employees', 'إجمالي الموظفين')}
          value={employeesCount.toString()}
          trend={`${employeesCount} ${t('active', 'نشط')}`}
          trendUp={true}
          icon={Users}
          description={t('Active employees', 'الموظفون النشطون')}
          onClick={() => onNavigate?.('employees')}
        />
        <KPICard 
          title={t('Approval Rate', 'نسبة القبول')}
          value={`${approvalRate}%`}
          trend={approvalRate >= 70 ? t('Good', 'جيد') : t('Low', 'منخفض')}
          trendUp={approvalRate >= 50}
          icon={CheckCircle2}
          description={t('Of completed requests', 'من الطلبات المكتملة')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Request Trends */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>{t('Request Trends', 'اتجاهات الطلبات')}</CardTitle>
            <CardDescription>{t('Approved vs rejected requests over the last 6 months', 'الطلبات المعتمدة مقابل المرفوضة خلال آخر 6 أشهر')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart id={`areachart-${uid}`} data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientApprovedId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id={gradientRejectedId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="approved" name={t('Approved', 'موافق')} stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill={`url(#${gradientApprovedId})`} />
                <Area type="monotone" dataKey="rejected" name={t('Rejected', 'مرفوض')} stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill={`url(#${gradientRejectedId})`} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Company / Employee Distribution */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">{t('Employees by Company', 'الموظفون حسب الشركة')}</CardTitle>
              <CardDescription>{t(`${companiesCount} companies`, `${companiesCount} شركات`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companyDistribution.length > 0 ? companyDistribution.map((item, i) => {
                  const maxVal = companyDistribution[0]?.value || 1;
                  const pct = Math.round((item.value / maxVal) * 100);
                  const colors = ['bg-indigo-600', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'];
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="truncate">{item.name}</span>
                        <span className="text-muted-foreground shrink-0">{item.value} {t('emp', 'موظف')}</span>
                      </div>
                      <Progress value={pct} className="h-2" indicatorClassName={colors[i % colors.length]} />
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('No employee data', 'لا توجد بيانات موظفين')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">{t('Recent Activity', 'النشاط الأخير')}</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => onNavigate?.('requests')}>
                {t('View All', 'عرض الكل')}
              </Button>
            </CardHeader>
            <CardContent className="px-0">
               <div className="space-y-0">
                 {recentRequests.slice(0, 5).map((req, i) => (
                   <div key={req.id || i} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-b border-border/50 last:border-0">
                     <div className={cn(
                       "mt-1 w-2 h-2 rounded-full shrink-0",
                       req.status === 'approved' ? "bg-emerald-500" : req.status === 'pending' ? "bg-orange-500" : "bg-red-500"
                     )} />
                     <div className="space-y-1 flex-1 min-w-0">
                       <p className="text-sm font-medium leading-none truncate">
                         {language === 'ar' 
                           ? req.employees?.full_name_ar || req.employees?.full_name || t('Employee', 'موظف') 
                           : req.employees?.full_name || t('Employee', 'موظف')}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {getRequestTypeLabel(req.request_type || req.type || '')}
                         {' — '}
                         <span className={cn(
                           req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                         )}>
                           {req.status === 'approved' ? t('Approved', 'موافق') : req.status === 'rejected' ? t('Rejected', 'مرفوض') : t('Pending', 'معلق')}
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

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('Quick Actions', 'إجراءات سريعة')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
           <Button 
             variant="outline" 
             className="h-auto py-4 flex flex-col gap-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 transition-all"
             onClick={() => onNavigate?.('employees')}
           >
             <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
               <UserPlus className="w-5 h-5" />
             </div>
             <span className="font-medium">{t('Manage Employees', 'إداة الموظفين')}</span>
           </Button>
           <Button 
             variant="outline" 
             className="h-auto py-4 flex flex-col gap-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-all"
             onClick={() => onNavigate?.('documents')}
           >
             <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
               <FileText className="w-5 h-5" />
             </div>
             <span className="font-medium">{t('Documents', 'المستندات')}</span>
           </Button>
           <Button 
             variant="outline" 
             className="h-auto py-4 flex flex-col gap-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 transition-all"
             onClick={() => onNavigate?.('announcements')}
           >
             <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
               <Megaphone className="w-5 h-5" />
             </div>
             <span className="font-medium">{t('Announcements', 'التعاميم')}</span>
           </Button>
           <Button 
             variant="outline" 
             className="h-auto py-4 flex flex-col gap-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 transition-all"
             onClick={() => onNavigate?.('companies')}
           >
             <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
               <Building2 className="w-5 h-5" />
             </div>
             <span className="font-medium">{t('Companies', 'الشركات')}</span>
           </Button>
        </div>
      </div>

      {/* ── Contracts Expiring Soon Widget ──────────────────────────────────── */}
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
                    {t('Within the next 90 days — alerts sent at 70 days', 'خلال الـ 90 يوماً القادمة — يُرسَل التنبيه قبل 70 يوماً')}
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
                const isAlert   = c.days_remaining <= 70 && c.days_remaining > 30;
                return (
                  <div
                    key={c.id || i}
                    className={cn(
                      "flex items-center gap-4 px-6 py-3 border-b border-border/50 last:border-0",
                      "hover:bg-white/80 dark:hover:bg-slate-800/50 transition-colors"
                    )}
                  >
                    {/* Urgency indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isCritical ? "bg-red-500" : isAlert ? "bg-amber-500" : "bg-blue-400"
                    )} />

                    {/* Employee name + position */}
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

                    {/* Contract end date */}
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

                    {/* Alert sent indicator */}
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

            {/* Summary footer */}
            <div className="px-6 pt-3 pb-1 flex items-center justify-between border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {criticalContracts.length > 0 && (
                  <span className="text-red-600 font-medium me-3">
                    {criticalContracts.length} {t('critical (≤30 days)', 'بالغة الأهمية (≤30 يوم)')}
                  </span>
                )}
                {warningContracts.length > 0 && (
                  <span className="text-amber-600 font-medium">
                    {warningContracts.length} {t('in 70-day window', 'في نطاق الـ 70 يوماً')}
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-indigo-600"
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

function KPICard({ title, value, trend, trendUp, icon: Icon, description, inverseColor, onClick }: any) {
  return (
    <Card 
      className={cn(
        "shadow-sm hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg",
          inverseColor ? "bg-amber-50 dark:bg-amber-900/20" : "bg-indigo-50 dark:bg-indigo-900/20"
        )}>
          <Icon className={cn("h-4 w-4", inverseColor ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400")} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="flex items-center text-xs mt-1">
          <span className={cn(
            "flex items-center font-medium",
            trendUp ? "text-emerald-600" : "text-rose-600"
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3 me-1" /> : <ArrowDownRight className="w-3 h-3 me-1" />}
            {trend}
          </span>
          <span className="text-muted-foreground ms-2 truncate">
            {description}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}