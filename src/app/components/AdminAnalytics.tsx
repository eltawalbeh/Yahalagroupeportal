import React, { useMemo } from 'react';
import { TrendingUp, Clock, CheckCircle, XCircle, Users, FileText, Calendar, DollarSign, LogOut as ExitIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Request {
  id: string;
  type: string;
  status: string;
  created_at: string;
  amount?: number;
  employees?: {
    company_id?: number;
    companies?: { name: string };
  };
}

interface AnalyticsProps {
  requests: Request[];
}

export function AdminAnalytics({ requests }: AnalyticsProps) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    // Requests by type
    const leave = requests.filter(r => r.type === 'leave').length;
    const advance = requests.filter(r => r.type === 'advance').length;
    const entry = requests.filter(r => r.type === 'entry').length;

    // This month stats
    const now = new Date();
    const thisMonth = requests.filter(r => {
      const created = new Date(r.created_at);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const approvedThisMonth = requests.filter(r => {
      const created = new Date(r.created_at);
      return r.status === 'approved' && 
             created.getMonth() === now.getMonth() && 
             created.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      pending,
      approved,
      rejected,
      leave,
      advance,
      entry,
      thisMonth,
      approvedThisMonth
    };
  }, [requests]);

  const typeData = [
    { name: t('Leave', 'إجازة'), value: stats.leave, color: '#006B7D' },
    { name: t('Advance', 'سلفة'), value: stats.advance, color: '#7AC143' },
    { name: t('Entry', 'خروج وعودة'), value: stats.entry, color: '#00A89C' }
  ];

  const statusData = [
    { name: t('Pending', 'قيد المراجعة'), value: stats.pending, color: '#F4D576' },
    { name: t('Approved', 'موافق عليه'), value: stats.approved, color: '#7AC143' },
    { name: t('Rejected', 'مرفوض'), value: stats.rejected, color: '#EF4444' }
  ];

  // Monthly trend (last 6 months)
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthRequests = requests.filter(r => {
        const created = new Date(r.created_at);
        return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
      });

      months.push({
        month: date.toLocaleDateString('en', { month: 'short' }),
        total: monthRequests.length,
        approved: monthRequests.filter(r => r.status === 'approved').length,
        pending: monthRequests.filter(r => r.status === 'pending').length
      });
    }

    return months;
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Total Requests', 'إجمالي الطلبات')}</p>
              <p className="text-2xl sm:text-3xl mt-2">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.thisMonth} {t('this month', 'هذا الشهر')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Pending', 'قيد المراجعة')}</p>
              <p className="text-2xl sm:text-3xl mt-2 text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.pending / stats.total) * 100 || 0).toFixed(0)}% {t('of total', 'من الإجمالي')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Approved', 'موافق عليه')}</p>
              <p className="text-2xl sm:text-3xl mt-2 text-[#7AC143] dark:text-[#7AC143]">{stats.approved}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.approvedThisMonth} {t('this month', 'هذا الشهر')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#7AC143]/10 dark:bg-[#7AC143]/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#7AC143]" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('Rejected', 'مرفوض')}</p>
              <p className="text-2xl sm:text-3xl mt-2 text-red-600 dark:text-red-400">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.rejected / stats.total) * 100 || 0).toFixed(0)}% {t('of total', 'من الإجمالي')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Type */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-base mb-4">{t('Requests by Type', 'الطلبات حسب النوع')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
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
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Requests by Status */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-base mb-4">{t('Requests by Status', 'الطلبات حسب الحالة')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
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
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base mb-4">{t('Monthly Trend (Last 6 Months)', 'الاتجاه الشهري (آخر 6 أشهر)')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground" />
            <YAxis stroke="currentColor" className="text-muted-foreground" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="total" fill="#00A89C" name={t('Total', 'الإجمالي')} />
            <Bar dataKey="approved" fill="#7AC143" name={t('Approved', 'موافق عليه')} />
            <Bar dataKey="pending" fill="#F4D576" name={t('Pending', 'قيد المراجعة')} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
