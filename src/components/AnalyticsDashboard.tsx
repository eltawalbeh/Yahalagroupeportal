import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, Users, FileText, BarChart3, PieChart, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { adminFetch } from '../utils/adminApi';

interface AnalyticsData {
  period: number;
  snapshots: any[];
  current: {
    totalRequests: number;
    totalEmployees: number;
    activeEmployees: number;
  };
  trends: {
    requestsByType: Record<string, number>;
    requestsByStatus: Record<string, number>;
  };
}

export function AnalyticsDashboard() {
  const { t, language } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await adminFetch(`/admin/analytics?period=${period}`);

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error(t('Failed to load analytics', 'فشل تحميل التحليلات'));
    } finally {
      setLoading(false);
    }
  };

  const recordSnapshot = async () => {
    try {
      const response = await adminFetch('/admin/analytics/snapshot', {
        method: 'POST'
      });

      if (response.ok) {
        toast.success(t('Snapshot recorded', 'تم تسجيل اللقطة'));
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error recording snapshot:', error);
      toast.error(t('Failed to record snapshot', 'فشل تسجيل اللقطة'));
    }
  };

  const COLORS = {
    primary: '#7AC143',
    secondary: '#006B7D',
    accent: '#00A89C',
    warning: '#FFA500',
    error: '#DC2626',
    success: '#10B981',
    info: '#3B82F6'
  };

  if (loading || !analytics) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  // Prepare chart data
  const trendData = analytics.snapshots.map(s => ({
    date: new Date(s.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric'
    }),
    total: s.totalRequests || 0,
    pending: s.pendingRequests || 0,
    approved: s.approvedRequests || 0,
    rejected: s.rejectedRequests || 0
  }));

  const typeData = [
    { name: t('Leave', 'إجازة'), value: analytics.trends.requestsByType.leave || 0, color: COLORS.primary },
    { name: t('Advance', 'سلفة'), value: analytics.trends.requestsByType.advance || 0, color: COLORS.secondary },
    { name: t('Permission', 'إذن'), value: analytics.trends.requestsByType.permission || 0, color: COLORS.accent }
  ];

  const statusData = [
    { name: t('Pending', 'قيد الانتظار'), value: analytics.trends.requestsByStatus.pending || 0, color: COLORS.warning },
    { name: t('Approved', 'موافق عليه'), value: analytics.trends.requestsByStatus.approved || 0, color: COLORS.success },
    { name: t('Rejected', 'مرفوض'), value: analytics.trends.requestsByStatus.rejected || 0, color: COLORS.error }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            {t('Analytics Dashboard', 'لوحة التحليلات')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Track system usage and trends', 'تتبع استخدام النظام والاتجاهات')}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('Last 7 Days', 'آخر 7 أيام')}</SelectItem>
              <SelectItem value="30">{t('Last 30 Days', 'آخر 30 يوماً')}</SelectItem>
              <SelectItem value="90">{t('Last 90 Days', 'آخر 90 يوماً')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={recordSnapshot} variant="outline">
            <Activity className="h-4 w-4 me-2" />
            {t('Record Snapshot', 'تسجيل لقطة')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Total Requests', 'إجمالي الطلبات')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.current.totalRequests}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              {t('All time', 'كل الوقت')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Pending Requests', 'الطلبات المعلقة')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {analytics.trends.requestsByStatus.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('Awaiting approval', 'في انتظار الموافقة')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Total Employees', 'إجمالي الموظفين')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.current.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-success">{analytics.current.activeEmployees}</span> {t('active', 'نشط')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Approval Rate', 'معدل الموافقة')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {(
                (analytics.trends.requestsByStatus.approved / 
                Math.max(analytics.trends.requestsByStatus.approved + analytics.trends.requestsByStatus.rejected, 1)) * 100
              ).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('Of completed requests', 'من الطلبات المكتملة')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 me-2" />
            {t('Trends', 'الاتجاهات')}
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <PieChart className="h-4 w-4 me-2" />
            {t('Distribution', 'التوزيع')}
          </TabsTrigger>
          <TabsTrigger value="insights">
            <FileText className="h-4 w-4 me-2" />
            {t('Insights', 'رؤى')}
          </TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('Request Trends', 'اتجاهات الطلبات')}</CardTitle>
              <CardDescription>
                {t('Daily request activity over time', 'نشاط الطلبات اليومي مع مرور الوقت')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke={COLORS.primary} 
                    strokeWidth={2}
                    name={t('Total', 'الإجمالي')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="approved" 
                    stroke={COLORS.success} 
                    name={t('Approved', 'موافق عليه')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rejected" 
                    stroke={COLORS.error} 
                    name={t('Rejected', 'مرفوض')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pending" 
                    stroke={COLORS.warning} 
                    name={t('Pending', 'قيد الانتظار')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Request Volume', 'حجم الطلبات')}</CardTitle>
              <CardDescription>
                {t('Comparison of request statuses', 'مقارنة حالات الطلبات')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" fill={COLORS.success} name={t('Approved', 'موافق عليه')} />
                  <Bar dataKey="pending" fill={COLORS.warning} name={t('Pending', 'قيد الانتظار')} />
                  <Bar dataKey="rejected" fill={COLORS.error} name={t('Rejected', 'مرفوض')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('Requests by Type', 'الطلبات حسب النوع')}</CardTitle>
                <CardDescription>
                  {t('Distribution of request types', 'توزيع أنواع الطلبات')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {typeData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Requests by Status', 'الطلبات حسب الحالة')}</CardTitle>
                <CardDescription>
                  {t('Current status distribution', 'توزيع الحالة الحالية')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('Key Metrics', 'المقاييس الرئيسية')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">{t('Most Common Request', 'الطلب الأكثر شيوعاً')}</span>
                  <span className="font-medium">
                    {typeData.reduce((max, item) => item.value > max.value ? item : max, typeData[0]).name}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">{t('Approval Rate', 'معدل الموافقة')}</span>
                  <span className="font-medium text-success">
                    {(
                      (analytics.trends.requestsByStatus.approved / 
                      Math.max(analytics.trends.requestsByStatus.approved + analytics.trends.requestsByStatus.rejected, 1)) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">{t('Active Users', 'المستخدمون النشطون')}</span>
                  <span className="font-medium">{analytics.current.activeEmployees}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('Data Points', 'نقاط البيانات')}</span>
                  <span className="font-medium">{analytics.snapshots.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Recommendations', 'التوصيات')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.trends.requestsByStatus.pending > 10 && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm">
                      ⚠️ {t('High pending requests', 'عدد كبير من الطلبات المعلقة')} ({analytics.trends.requestsByStatus.pending}). 
                      {t(' Consider reviewing backlog', ' فكر في مراجعة الطلبات المتراكمة')}.
                    </p>
                  </div>
                )}
                {analytics.snapshots.length < 7 && (
                  <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                    <p className="text-sm">
                      💡 {t('Record more snapshots for better trends', 'سجل المزيد من اللقطات للحصول على اتجاهات أفضل')}.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm">
                    ✓ {t('System is performing well', 'النظام يعمل بشكل جيد')}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}