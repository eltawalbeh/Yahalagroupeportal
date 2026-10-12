import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Clock, CheckCircle, XCircle, Users, FileText, Calendar as CalendarIcon, DollarSign, Download, Filter, BarChart3, TrendingDown, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DatePickerWithRange } from './ui/date-range-picker';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import { toast } from 'sonner@2.0.3';

interface Request {
  id: string;
  type: string;
  status: string;
  created_at: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  employee_id?: string;
  employees?: {
    id: number;
    full_name: string;
    company_id?: number;
    companies?: { 
      id: number;
      name: string; 
    };
  };
}

interface AdvancedAnalyticsProps {
  requests: Request[];
  employees?: any[];
}

// Default date range: last 3 months
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return { from: start, to: end };
};

export function AdvancedAnalytics({ requests, employees = [] }: AdvancedAnalyticsProps) {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [analysisType, setAnalysisType] = useState('overview');

  // Filter requests by date range and company
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const requestDate = new Date(request.created_at);
      const dateInRange = requestDate >= dateRange.from && requestDate <= dateRange.to;
      
      const companyMatch = selectedCompany === 'all' || 
        request.employees?.companies?.id?.toString() === selectedCompany;
      
      return dateInRange && companyMatch;
    });
  }, [requests, dateRange, selectedCompany]);

  // Get unique companies
  const companies = useMemo(() => {
    const companyMap = new Map();
    requests.forEach(request => {
      if (request.employees?.companies) {
        companyMap.set(request.employees.companies.id, request.employees.companies);
      }
    });
    return Array.from(companyMap.values());
  }, [requests]);

  // Advanced statistics
  const advancedStats = useMemo(() => {
    const total = filteredRequests.length;
    const pending = filteredRequests.filter(r => r.status === 'pending').length;
    const approved = filteredRequests.filter(r => r.status === 'approved').length;
    const rejected = filteredRequests.filter(r => r.status === 'rejected').length;

    // Financial analytics
    const advanceRequests = filteredRequests.filter(r => r.type === 'advance');
    const totalAdvanceAmount = advanceRequests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const pendingAdvanceAmount = advanceRequests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const avgAdvanceAmount = advanceRequests.length > 0 
      ? totalAdvanceAmount / advanceRequests.filter(r => r.status === 'approved').length 
      : 0;

    // Leave analytics
    const leaveRequests = filteredRequests.filter(r => r.type === 'leave');
    const approvedLeaves = leaveRequests.filter(r => r.status === 'approved');
    
    const totalLeaveDays = approvedLeaves.reduce((sum, r) => {
      if (!r.start_date || !r.end_date) return sum;
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Processing speed (average days from creation to approval/rejection)
    const processedRequests = filteredRequests.filter(r => r.status !== 'pending');
    const avgProcessingTime = processedRequests.length > 0
      ? processedRequests.reduce((sum, r) => {
          const created = new Date(r.created_at);
          const now = new Date();
          const days = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / processedRequests.length
      : 0;

    // Approval rate
    const approvalRate = total > 0 ? (approved / (approved + rejected)) * 100 : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      totalAdvanceAmount,
      pendingAdvanceAmount,
      avgAdvanceAmount,
      totalLeaveDays,
      avgProcessingTime,
      approvalRate,
      activeEmployees: new Set(filteredRequests.map(r => r.employee_id)).size
    };
  }, [filteredRequests]);

  // Company comparison data
  const companyData = useMemo(() => {
    const companyStats = new Map();
    
    companies.forEach(company => {
      const companyRequests = filteredRequests.filter(
        r => r.employees?.companies?.id === company.id
      );
      
      const advanceRequests = companyRequests.filter(r => r.type === 'advance' && r.status === 'approved');
      const totalAdvances = advanceRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      companyStats.set(company.id, {
        name: company.name,
        total: companyRequests.length,
        approved: companyRequests.filter(r => r.status === 'approved').length,
        pending: companyRequests.filter(r => r.status === 'pending').length,
        rejected: companyRequests.filter(r => r.status === 'rejected').length,
        totalAdvances,
        employees: new Set(companyRequests.map(r => r.employee_id)).size
      });
    });
    
    return Array.from(companyStats.values());
  }, [filteredRequests, companies]);

  // Monthly trends with financial data
  const monthlyTrends = useMemo(() => {
    const months = [];
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      const monthRequests = filteredRequests.filter(r => {
        const created = new Date(r.created_at);
        return created.getMonth() === current.getMonth() && 
               created.getFullYear() === current.getFullYear();
      });

      const monthAdvances = monthRequests
        .filter(r => r.type === 'advance' && r.status === 'approved')
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      months.push({
        month: current.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        fullDate: new Date(current),
        total: monthRequests.length,
        approved: monthRequests.filter(r => r.status === 'approved').length,
        pending: monthRequests.filter(r => r.status === 'pending').length,
        rejected: monthRequests.filter(r => r.status === 'rejected').length,
        advances: monthAdvances,
        leaves: monthRequests.filter(r => r.type === 'leave').length,
        entries: monthRequests.filter(r => r.type === 'entry').length
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }, [filteredRequests, dateRange]);

  // Top employees by requests
  const topEmployees = useMemo(() => {
    const employeeStats = new Map();
    
    filteredRequests.forEach(request => {
      const empId = request.employee_id;
      if (!empId) return;
      
      const current = employeeStats.get(empId) || {
        id: empId,
        name: request.employees?.full_name || `Employee ${empId}`,
        company: request.employees?.companies?.name || 'Unknown',
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalAdvances: 0
      };
      
      current.total++;
      if (request.status === 'approved') current.approved++;
      if (request.status === 'pending') current.pending++;
      if (request.status === 'rejected') current.rejected++;
      
      if (request.type === 'advance' && request.status === 'approved') {
        current.totalAdvances += request.amount || 0;
      }
      
      employeeStats.set(empId, current);
    });
    
    return Array.from(employeeStats.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRequests]);

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      // Create CSV data for Excel compatibility
      const headers = [
        'Company', 'Total Requests', 'Approved', 'Pending', 'Rejected', 
        'Total Advances (SAR)', 'Active Employees', 'Approval Rate (%)'
      ];
      
      const csvData = [
        headers.join(','),
        ...companyData.map(company => [
          company.name,
          company.total,
          company.approved,
          company.pending,
          company.rejected,
          company.totalAdvances.toFixed(2),
          company.employees,
          company.total > 0 ? ((company.approved / (company.approved + company.rejected)) * 100).toFixed(1) : '0'
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics_report_${dateRange.from.toISOString().split('T')[0]}_to_${dateRange.to.toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success(t('Report exported successfully', 'تم تصدير التقرير بنجاح'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('Failed to export report', 'فشل تصدير التقرير'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="space-y-2 flex-1">
            <Label>{t('Date Range', 'النطاق الزمني')}</Label>
            <DatePickerWithRange 
              date={dateRange} 
              onDateChange={setDateRange}
              className="w-full sm:w-auto"
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t('Company', 'الشركة')}</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Companies', 'جميع الشركات')}</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 me-2" />
            {t('Export Excel', 'تصدير Excel')}
          </Button>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Total Requests', 'إجمالي الطلبات')}</p>
              <p className="text-2xl font-semibold mt-1">{advancedStats.total}</p>
              <p className="text-xs text-muted-foreground">
                {advancedStats.activeEmployees} {t('active employees', 'موظف نشط')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Approval Rate', 'معدل الموافقة')}</p>
              <p className="text-2xl font-semibold mt-1 text-green-600">
                {advancedStats.approvalRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {advancedStats.approved} / {advancedStats.approved + advancedStats.rejected} {t('processed', 'تمت معالجتها')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Total Advances', 'إجمالي السلف')}</p>
              <p className="text-2xl font-semibold mt-1">{advancedStats.totalAdvanceAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {t('SAR', 'ر.س')} • {t('Avg:', 'متوسط:')} {advancedStats.avgAdvanceAmount.toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Avg Processing Time', 'متوسط وقت المعالجة')}</p>
              <p className="text-2xl font-semibold mt-1">{advancedStats.avgProcessingTime.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">
                {t('days', 'يوم')} • {advancedStats.pending} {t('pending', 'قيد الانتظار')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">{t('Trends', 'الاتجاهات')}</TabsTrigger>
          <TabsTrigger value="companies">{t('Companies', 'الشركات')}</TabsTrigger>
          <TabsTrigger value="employees">{t('Top Employees', 'أفضل الموظفين')}</TabsTrigger>
          <TabsTrigger value="financial">{t('Financial', 'المالية')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Requests Trend */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('Monthly Requests Trend', 'اتجاه الطلبات الشهرية')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrends}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px' 
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" stroke="#00A89C" fill="#00A89C" fillOpacity={0.2} name={t('Total', 'الإجمالي')} />
                  <Area type="monotone" dataKey="approved" stroke="#7AC143" fill="#7AC143" fillOpacity={0.3} name={t('Approved', 'موافق عليه')} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Request Types Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('Request Types by Month', 'أنواع الطلبات حسب الشهر')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrends}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="leaves" fill="#006B7D" name={t('Leave', 'إجازة')} />
                  <Bar dataKey="advances" fill="#7AC143" name={t('Advance', 'سلفة')} />
                  <Bar dataKey="entries" fill="#00A89C" name={t('Entry', 'خروج وعودة')} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('Company Performance', 'أداء الشركات')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">{t('Company', 'الشركة')}</th>
                    <th className="text-center p-3">{t('Total', 'الإجمالي')}</th>
                    <th className="text-center p-3">{t('Approved', 'موافق عليه')}</th>
                    <th className="text-center p-3">{t('Pending', 'قيد المراجعة')}</th>
                    <th className="text-center p-3">{t('Advances (SAR)', 'السلف (ر.س)')}</th>
                    <th className="text-center p-3">{t('Employees', 'الموظفين')}</th>
                    <th className="text-center p-3">{t('Approval Rate', 'معدل الموافقة')}</th>
                  </tr>
                </thead>
                <tbody>
                  {companyData.map((company, index) => {
                    const approvalRate = company.total > 0 ? ((company.approved / (company.approved + company.rejected)) * 100) : 0;
                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{company.name}</td>
                        <td className="text-center p-3">{company.total}</td>
                        <td className="text-center p-3 text-green-600">{company.approved}</td>
                        <td className="text-center p-3 text-yellow-600">{company.pending}</td>
                        <td className="text-center p-3">{company.totalAdvances.toLocaleString()}</td>
                        <td className="text-center p-3">{company.employees}</td>
                        <td className="text-center p-3">
                          <Badge variant={approvalRate > 80 ? 'default' : approvalRate > 60 ? 'secondary' : 'destructive'}>
                            {approvalRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('Top Employees by Request Volume', 'أكثر الموظفين طلبًا')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">{t('Employee', 'الموظف')}</th>
                    <th className="text-left p-3">{t('Company', 'الشركة')}</th>
                    <th className="text-center p-3">{t('Total', 'الإجمالي')}</th>
                    <th className="text-center p-3">{t('Approved', 'موافق عليه')}</th>
                    <th className="text-center p-3">{t('Pending', 'قيد المراجعة')}</th>
                    <th className="text-center p-3">{t('Total Advances', 'إجمالي السلف')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topEmployees.map((employee, index) => (
                    <tr key={employee.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{employee.name}</td>
                      <td className="p-3 text-muted-foreground">{employee.company}</td>
                      <td className="text-center p-3">{employee.total}</td>
                      <td className="text-center p-3 text-green-600">{employee.approved}</td>
                      <td className="text-center p-3 text-yellow-600">{employee.pending}</td>
                      <td className="text-center p-3">{employee.totalAdvances.toLocaleString()} {t('SAR', 'ر.س')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Advances */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('Monthly Advance Amounts', 'مبالغ السلف الشهرية')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} SAR`, t('Advances', 'السلف')]}
                  />
                  <Line type="monotone" dataKey="advances" stroke="#7AC143" strokeWidth={3} dot={{ fill: '#7AC143' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Financial Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('Financial Summary', 'الملخص المالي')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-sm font-medium">{t('Total Approved Advances', 'إجمالي السلف المعتمدة')}</span>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    {advancedStats.totalAdvanceAmount.toLocaleString()} {t('SAR', 'ر.س')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <span className="text-sm font-medium">{t('Pending Advances', 'السلف المعلقة')}</span>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                    {advancedStats.pendingAdvanceAmount.toLocaleString()} {t('SAR', 'ر.س')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="text-sm font-medium">{t('Average Advance Amount', 'متوسط مبلغ السلفة')}</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {advancedStats.avgAdvanceAmount.toFixed(0)} {t('SAR', 'ر.س')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <span className="text-sm font-medium">{t('Total Leave Days', 'إجمالي أيام الإجازة')}</span>
                  <span className="font-semibold text-purple-700 dark:text-purple-400">
                    {advancedStats.totalLeaveDays} {t('days', 'يوم')}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}