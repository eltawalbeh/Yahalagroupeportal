import React, { useState, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  LogOut as EntryIcon,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  BarChart3,
  Eye,
  ArrowUpRight,
  Filter,
  ChevronRight,
  Info,
  Layers,
  Activity,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../components/ui/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface Request {
  id: string;
  type: string;
  sub_type?: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
  employees?: {
    full_name: string;
    full_name_ar?: string;
    companies?: { name: string };
  };
}

interface AdminPortalServicesProps {
  requests?: Request[];
  onNavigate?: (page: string) => void;
}

type ServiceType = 'all' | 'leave' | 'advance' | 'entry';

const SERVICE_CONFIG = {
  leave: {
    key: 'leave' as ServiceType,
    color: '#006B7D',
    gradient: 'from-[#006B7D] to-[#008fa6]',
    bg: 'bg-[#006B7D]',
    lightBg: 'bg-[#006B7D]/10 dark:bg-[#006B7D]/20',
    text: 'text-[#006B7D] dark:text-[#4db8cc]',
    border: 'border-[#006B7D]/20',
    icon: Calendar,
    labelEn: 'Leave Request',
    labelAr: 'طلب إجازة',
    descEn: 'Annual, sick, personal & unpaid leave',
    descAr: 'إجازة سنوية، مرضية، شخصية وبدون راتب',
    chartColor: '#006B7D',
  },
  advance: {
    key: 'advance' as ServiceType,
    color: '#7AC143',
    gradient: 'from-[#7AC143] to-[#5ea32e]',
    bg: 'bg-[#7AC143]',
    lightBg: 'bg-[#7AC143]/10 dark:bg-[#7AC143]/20',
    text: 'text-[#5ea32e] dark:text-[#9fd65e]',
    border: 'border-[#7AC143]/20',
    icon: DollarSign,
    labelEn: 'Advance Request',
    labelAr: 'طلب سلفة مالية',
    descEn: 'Salary advance for employees in need',
    descAr: 'سلفة راتب للموظفين المحتاجين',
    chartColor: '#7AC143',
  },
  entry: {
    key: 'entry' as ServiceType,
    color: '#00A89C',
    gradient: 'from-[#00A89C] to-[#007d73]',
    bg: 'bg-[#00A89C]',
    lightBg: 'bg-[#00A89C]/10 dark:bg-[#00A89C]/20',
    text: 'text-[#00A89C] dark:text-[#33c5bb]',
    border: 'border-[#00A89C]/20',
    icon: EntryIcon,
    labelEn: 'Entry Permission',
    labelAr: 'خروج وعودة',
    descEn: 'Permission to leave and return during work hours',
    descAr: 'إذن للخروج والعودة خلال ساعات العمل',
    chartColor: '#00A89C',
  },
};

export function AdminPortalServices({ requests = [], onNavigate }: AdminPortalServicesProps) {
  const { t, language } = useLanguage();
  const [activeService, setActiveService] = useState<ServiceType>('all');
  const [showAll, setShowAll] = useState(false);

  // Per-service stats
  const serviceStats = useMemo(() => {
    const result: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {
      leave: { total: 0, pending: 0, approved: 0, rejected: 0 },
      advance: { total: 0, pending: 0, approved: 0, rejected: 0 },
      entry: { total: 0, pending: 0, approved: 0, rejected: 0 },
    };

    requests.forEach((r) => {
      const type = r.type === 'entry_permission' ? 'entry' : r.type;
      if (!result[type]) return;
      result[type].total++;
      if (r.status === 'pending') result[type].pending++;
      else if (r.status === 'approved') result[type].approved++;
      else if (r.status === 'rejected') result[type].rejected++;
    });
    return result;
  }, [requests]);

  // Monthly breakdown data for bar chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { name: string; leave: number; advance: number; entry: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = {
        name: language === 'ar' ? monthNamesAr[d.getMonth()] : monthNames[d.getMonth()],
        leave: 0,
        advance: 0,
        entry: 0,
      };
    }

    requests.forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) return;
      const type = r.type === 'entry_permission' ? 'entry' : r.type;
      if (type === 'leave') months[key].leave++;
      else if (type === 'advance') months[key].advance++;
      else if (type === 'entry') months[key].entry++;
    });

    return Object.values(months);
  }, [requests, language]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: t('Leave', 'إجازة'), value: serviceStats.leave.total, color: '#006B7D' },
      { name: t('Advance', 'سلفة'), value: serviceStats.advance.total, color: '#7AC143' },
      { name: t('Entry', 'خروج وعودة'), value: serviceStats.entry.total, color: '#00A89C' },
    ].filter((d) => d.value > 0);
  }, [serviceStats, t]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (activeService === 'all') return requests;
    return requests.filter((r) => {
      const type = r.type === 'entry_permission' ? 'entry' : r.type;
      return type === activeService;
    });
  }, [requests, activeService]);

  const displayedRequests = showAll ? filteredRequests : filteredRequests.slice(0, 8);

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: t('Pending', 'معلق') },
      approved: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: t('Approved', 'موافق') },
      rejected: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t('Rejected', 'مرفوض') },
    };
    const c = config[status as keyof typeof config] || config.pending;
    return <Badge className={cn('text-xs font-medium', c.cls)}>{c.label}</Badge>;
  };

  const getSubTypeLabel = (sub: string) => {
    const map: Record<string, { en: string; ar: string }> = {
      hourly: { en: 'Hourly', ar: 'ساعية' },
      annual: { en: 'Annual', ar: 'سنوية' },
      sick: { en: 'Sick', ar: 'مرضية' },
      unpaid: { en: 'Unpaid', ar: 'بدون راتب' },
      personal: { en: 'Personal', ar: 'شخصية' },
      work: { en: 'Work', ar: 'للعمل' },
    };
    return map[sub] ? t(map[sub].en, map[sub].ar) : sub;
  };

  const totalRequests = serviceStats.leave.total + serviceStats.advance.total + serviceStats.entry.total;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('Portal Services', 'خدمات البوابة')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('Admin overview of employee-facing portal services and usage analytics.', 'نظرة عامة للمسؤول على خدمات بوابة الموظفين وتحليلات الاستخدام.')}
          </p>
        </div>
        <Button
          className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          onClick={() => onNavigate?.('requests')}
        >
          <BarChart3 className="w-4 h-4 me-2" />
          {t('All Requests', 'جميع الطلبات')}
        </Button>
      </div>

      {/* ── Service Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(Object.values(SERVICE_CONFIG) as typeof SERVICE_CONFIG[keyof typeof SERVICE_CONFIG][]).map((svc) => {
          const stats = serviceStats[svc.key as string] || { total: 0, pending: 0, approved: 0, rejected: 0 };
          const approvalRate = (stats.approved + stats.rejected) > 0
            ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
            : 0;
          const Icon = svc.icon;
          const isActive = activeService === svc.key;

          return (
            <button
              key={svc.key}
              onClick={() => setActiveService(isActive ? 'all' : svc.key)}
              className={cn(
                'relative text-start p-5 rounded-2xl border-2 transition-all duration-300 group w-full',
                isActive
                  ? 'border-transparent shadow-xl scale-[1.02]'
                  : 'border-border bg-card hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
              )}
              style={isActive ? { backgroundColor: svc.color } : {}}
            >
              {/* Icon + Title */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={cn(
                  'p-2.5 rounded-xl transition-all',
                  isActive ? 'bg-white/20' : svc.lightBg
                )}>
                  <Icon className={cn('w-6 h-6', isActive ? 'text-white' : svc.text)} />
                </div>
                {isActive && (
                  <div className="flex items-center gap-1 text-white/70 text-xs">
                    <Filter className="w-3 h-3" />
                    {t('Filtering', 'تصفية')}
                  </div>
                )}
                {!isActive && stats.pending > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                    {stats.pending} {t('pending', 'معلق')}
                  </span>
                )}
              </div>

              <h3 className={cn('font-bold text-base mb-0.5', isActive ? 'text-white' : 'text-slate-800 dark:text-slate-100')}>
                {t(svc.labelEn, svc.labelAr)}
              </h3>
              <p className={cn('text-xs mb-4', isActive ? 'text-white/70' : 'text-muted-foreground')}>
                {t(svc.descEn, svc.descAr)}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t('Total', 'الكل'), value: stats.total, cls: isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200' },
                  { label: t('Approved', 'موافق'), value: stats.approved, cls: isActive ? 'text-white/90' : 'text-emerald-600 dark:text-emerald-400' },
                  { label: t('Pending', 'معلق'), value: stats.pending, cls: isActive ? 'text-white/90' : 'text-amber-600 dark:text-amber-400' },
                ].map((st) => (
                  <div key={st.label} className={cn('text-center p-2 rounded-lg', isActive ? 'bg-white/10' : 'bg-muted/60')}>
                    <p className={cn('text-lg font-bold leading-none', st.cls)}>{st.value}</p>
                    <p className={cn('text-[10px] mt-1', isActive ? 'text-white/60' : 'text-muted-foreground')}>{st.label}</p>
                  </div>
                ))}
              </div>

              {/* Approval rate bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className={isActive ? 'text-white/70' : 'text-muted-foreground'}>{t('Approval Rate', 'نسبة القبول')}</span>
                  <span className={cn('font-semibold', isActive ? 'text-white' : svc.text)}>{approvalRate}%</span>
                </div>
                <div className={cn('h-1.5 rounded-full w-full', isActive ? 'bg-white/20' : 'bg-muted')}>
                  <div
                    className={cn('h-1.5 rounded-full transition-all duration-500', isActive ? 'bg-white' : svc.bg)}
                    style={{ width: `${approvalRate}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Analytics Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly volume bar chart */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>{t('Monthly Service Volume', 'حجم الخدمة الشهري')}</CardTitle>
            <CardDescription>{t('Requests submitted per service over the last 6 months', 'الطلبات المقدمة لكل خدمة خلال الأشهر الستة الماضية')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {totalRequests > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Legend
                    formatter={(value) => {
                      const map: Record<string, string> = {
                        leave: t('Leave', 'إجازة'),
                        advance: t('Advance', 'سلفة'),
                        entry: t('Entry Permission', 'خروج وعودة'),
                      };
                      return map[value] || value;
                    }}
                  />
                  <Bar dataKey="leave" name="leave" fill="#006B7D" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="advance" name="advance" fill="#7AC143" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="entry" name="entry" fill="#00A89C" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Activity className="w-10 h-10 opacity-30" />
                <p className="text-sm">{t('No request data available yet', 'لا توجد بيانات طلبات بعد')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart + summary */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('Service Distribution', 'توزيع الخدمات')}</CardTitle>
              <CardDescription>{t(`${totalRequests} total requests`, `${totalRequests} إجمالي الطلبات`)}</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700 dark:text-slate-300 text-xs">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{item.value}</span>
                          <span className="text-muted-foreground text-[10px]">
                            ({totalRequests > 0 ? Math.round((item.value / totalRequests) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                  <Layers className="w-8 h-8 opacity-30" />
                  <p className="text-xs">{t('No data yet', 'لا توجد بيانات بعد')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats card */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('Portal Summary', 'ملخص البوابة')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  icon: Clock,
                  label: t('Total Pending', 'إجمالي المعلقة'),
                  value: serviceStats.leave.pending + serviceStats.advance.pending + serviceStats.entry.pending,
                  cls: 'text-amber-600',
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                },
                {
                  icon: CheckCircle2,
                  label: t('Total Approved', 'إجمالي الموافقة'),
                  value: serviceStats.leave.approved + serviceStats.advance.approved + serviceStats.entry.approved,
                  cls: 'text-emerald-600',
                  bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                },
                {
                  icon: XCircle,
                  label: t('Total Rejected', 'إجمالي المرفوضة'),
                  value: serviceStats.leave.rejected + serviceStats.advance.rejected + serviceStats.entry.rejected,
                  cls: 'text-red-500',
                  bg: 'bg-red-50 dark:bg-red-900/20',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('p-1.5 rounded-lg', item.bg)}>
                      <item.icon className={cn('w-3.5 h-3.5', item.cls)} />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                  </div>
                  <span className={cn('text-sm font-bold', item.cls)}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Service Filter Tabs + Request Table ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t('Recent Requests', 'الطلبات الأخيرة')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filteredRequests.length} {t('requests', 'طلب')}
              {activeService !== 'all' && (
                <> — {t(SERVICE_CONFIG[activeService as keyof typeof SERVICE_CONFIG].labelEn, SERVICE_CONFIG[activeService as keyof typeof SERVICE_CONFIG].labelAr)}</>
              )}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl">
            {([
              { id: 'all', labelEn: 'All Services', labelAr: 'جميع الخدمات' },
              { id: 'leave', labelEn: 'Leave', labelAr: 'إجازة' },
              { id: 'advance', labelEn: 'Advance', labelAr: 'سلفة' },
              { id: 'entry', labelEn: 'Entry', labelAr: 'خروج وعودة' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveService(tab.id as ServiceType); setShowAll(false); }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap',
                  activeService === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {t(tab.labelEn, tab.labelAr)}
                {tab.id !== 'all' && serviceStats[tab.id]?.pending > 0 && (
                  <span className="ms-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full bg-amber-500 text-white">
                    {serviceStats[tab.id].pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {displayedRequests.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('Service', 'الخدمة')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('Employee', 'الموظف')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                        {t('Company', 'الشركة')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        {t('Date', 'التاريخ')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                        {t('Details', 'التفاصيل')}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('Status', 'الحالة')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {displayedRequests.map((req, i) => {
                      const type = req.type === 'entry_permission' ? 'entry' : req.type;
                      const svc = SERVICE_CONFIG[type as keyof typeof SERVICE_CONFIG];
                      const Icon = svc?.icon || Calendar;

                      return (
                        <tr key={req.id || i} className="hover:bg-muted/20 transition-colors group">
                          {/* Service */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="p-1.5 rounded-lg flex-shrink-0"
                                style={{ backgroundColor: `${svc?.color}18` }}
                              >
                                <Icon className="w-3.5 h-3.5" style={{ color: svc?.color }} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {svc ? t(svc.labelEn, svc.labelAr) : req.type}
                                </p>
                                {req.sub_type && (
                                  <p className="text-[10px] text-muted-foreground">{getSubTypeLabel(req.sub_type)}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Employee */}
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {language === 'ar'
                                ? req.employees?.full_name_ar || req.employees?.full_name || '—'
                                : req.employees?.full_name || '—'}
                            </p>
                          </td>

                          {/* Company */}
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {req.employees?.companies?.name || '—'}
                            </p>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground">
                              {new Date(req.created_at).toLocaleDateString(
                                language === 'ar' ? 'ar-SA' : 'en-US',
                                { dateStyle: 'medium' }
                              )}
                            </p>
                          </td>

                          {/* Details */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-xs text-muted-foreground">
                              {req.amount
                                ? `${req.amount} ${t('SAR', 'ر.س')}`
                                : req.start_date
                                ? req.start_date + (req.end_date ? ` → ${req.end_date}` : '')
                                : '—'}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {getStatusBadge(req.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Show more / View all */}
              {filteredRequests.length > 8 && (
                <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t(`Showing ${displayedRequests.length} of ${filteredRequests.length}`, `عرض ${displayedRequests.length} من ${filteredRequests.length}`)}
                  </p>
                  <div className="flex gap-2">
                    {!showAll && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAll(true)}>
                        {t('Show All', 'عرض الكل')}
                        <ChevronRight className="w-3 h-3 ms-1" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
                      onClick={() => onNavigate?.('requests')}
                    >
                      {t('Manage in Requests', 'الإدارة في الطلبات')}
                      <ArrowUpRight className="w-3 h-3 ms-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Info className="w-10 h-10 opacity-25" />
              <p className="text-sm font-medium">{t('No requests for this service', 'لا توجد طلبات لهذه الخدمة')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => { setActiveService('all'); setShowAll(false); }}
              >
                {t('Show all services', 'عرض جميع الخدمات')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Employee Portal Preview Info ── */}
      <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {t('Employee Portal Services', 'خدمات بوابة الموظفين')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t(
                  'Employees access 3 core services via the portal: Leave Request (annual, sick, personal, unpaid & hourly), Advance Request (salary advances), and Entry Permission (exit-and-return during work hours). Service availability is controlled via HR permissions.',
                  'يصل الموظفون إلى 3 خدمات أساسية عبر البوابة: طلب إجازة (سنوية، مرضية، شخصية، بدون راتب وساعية)، طلب سلفة مالية (سلف الرواتب)، وإذن خروج وعودة (خلال ساعات العمل). تُدار توفر الخدمات عبر صلاحيات الموارد البشرية.'
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex-shrink-0"
              onClick={() => onNavigate?.('settings')}
            >
              <TrendingUp className="w-3.5 h-3.5 me-1.5" />
              {t('HR Permissions', 'صلاحيات الموارد البشرية')}
            </Button>
          </div>

          {/* Service quick-reference tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            {Object.values(SERVICE_CONFIG).map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.key}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: `${svc.color}14` }}
                >
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${svc.color}22` }}>
                    <Icon className="w-4 h-4" style={{ color: svc.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {t(svc.labelEn, svc.labelAr)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(serviceStats[svc.key as string]?.total || 0)} {t('requests total', 'طلب إجمالي')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
