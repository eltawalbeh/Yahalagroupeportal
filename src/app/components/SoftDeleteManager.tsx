import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Undo2, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DeletedRecord {
  key: string;
  deleted_at: string;
  deleted_by: string;
  deletion_reason?: string;
  can_restore: boolean;
  [key: string]: any;
}

export function SoftDeleteManager() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [deletedEmployees, setDeletedEmployees] = useState<DeletedRecord[]>([]);
  const [deletedRequests, setDeletedRequests] = useState<DeletedRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    employees: { total: 0, active: 0, deleted: 0, deletionRate: '0%' },
    requests: { total: 0, active: 0, deleted: 0, deletionRate: '0%' }
  });

  useEffect(() => {
    loadDeletedRecords();
    loadStats();
  }, []);

  const loadDeletedRecords = async () => {
    setLoading(true);
    try {
      // Load deleted employees
      const employeesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/deleted/employee:`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const employeesData = await employeesRes.json();

      // Load deleted requests
      const requestsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/deleted/request:`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const requestsData = await requestsRes.json();

      if (employeesData.success) {
        setDeletedEmployees(employeesData.records || []);
      }

      if (requestsData.success) {
        setDeletedRequests(requestsData.records || []);
      }
    } catch (error) {
      console.error('Error loading deleted records:', error);
      toast.error(t('Failed to load deleted records', 'فشل تحميل السجلات المحذوفة'));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [employeesStatsRes, requestsStatsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/stats/employee:`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/stats/request:`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        )
      ]);

      const employeesStats = await employeesStatsRes.json();
      const requestsStats = await requestsStatsRes.json();

      setStats({
        employees: employeesStats.success ? employeesStats.stats : stats.employees,
        requests: requestsStats.success ? requestsStats.stats : stats.requests
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRestore = async (key: string, type: 'employee' | 'request') => {
    const displayName = type === 'employee' ? t('Employee', 'الموظف') : t('Request', 'الطلب');
    
    if (!confirm(t(`Are you sure you want to restore this ${type}?`, `هل أنت متأكد من استعادة ${displayName}؟`))) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/restore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            key,
            restoredBy: 'admin'
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t(`${displayName} restored successfully`, `تم استعادة ${displayName} بنجاح`));
        await loadDeletedRecords();
        await loadStats();
      } else {
        toast.error(data.message || t('Failed to restore', 'فشلت الاستعادة'));
      }
    } catch (error) {
      console.error('Error restoring record:', error);
      toast.error(t('Failed to restore', 'فشلت الاستعادة'));
    }
  };

  const handlePermanentDelete = async (key: string, type: 'employee' | 'request') => {
    const displayName = type === 'employee' ? t('Employee', 'الموظف') : t('Request', 'الطلب');
    
    if (!confirm(
      t(
        `⚠️ WARNING: This will PERMANENTLY delete this ${type}. This action CANNOT be undone! Are you sure?`,
        `⚠️ تحذير: سيؤدي هذا إلى حذف ${displayName} نهائياً. لا يمكن التراجع عن هذا الإجراء! هل أنت متأكد؟`
      )
    )) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/soft-delete/permanent`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            key,
            deletedBy: 'admin'
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t('Permanently deleted', 'تم الحذف نهائياً'));
        await loadDeletedRecords();
        await loadStats();
      } else {
        toast.error(data.message || t('Failed to delete', 'فشل الحذف'));
      }
    } catch (error) {
      console.error('Error permanently deleting record:', error);
      toast.error(t('Failed to delete', 'فشل الحذف'));
    }
  };

  const filteredEmployees = deletedEmployees.filter(emp =>
    searchQuery === '' ||
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.full_name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.id?.toString().includes(searchQuery)
  );

  const filteredRequests = deletedRequests.filter(req =>
    searchQuery === '' ||
    req.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-orange-600" />
            {t('Soft Delete Manager', 'مدير الحذف المؤقت')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('View and restore soft-deleted records', 'عرض واستعادة السجلات المحذوفة مؤقتاً')}
          </p>
        </div>
        <Button onClick={loadDeletedRecords} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
          {t('Refresh', 'تحديث')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">{t('Employees Statistics', 'إحصائيات الموظفين')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t('Total', 'الإجمالي')}:</span>
              <span className="font-medium ms-2">{stats.employees.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Active', 'نشط')}:</span>
              <span className="font-medium ms-2 text-green-600">{stats.employees.active}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Deleted', 'محذوف')}:</span>
              <span className="font-medium ms-2 text-orange-600">{stats.employees.deleted}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Rate', 'النسبة')}:</span>
              <span className="font-medium ms-2">{stats.employees.deletionRate}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">{t('Requests Statistics', 'إحصائيات الطلبات')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t('Total', 'الإجمالي')}:</span>
              <span className="font-medium ms-2">{stats.requests.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Active', 'نشط')}:</span>
              <span className="font-medium ms-2 text-green-600">{stats.requests.active}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Deleted', 'محذوف')}:</span>
              <span className="font-medium ms-2 text-orange-600">{stats.requests.deleted}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Rate', 'النسبة')}:</span>
              <span className="font-medium ms-2">{stats.requests.deletionRate}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('Search deleted records...', 'البحث في السجلات المحذوفة...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">
            {t('Deleted Employees', 'الموظفون المحذوفون')} ({filteredEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('Deleted Requests', 'الطلبات المحذوفة')} ({filteredRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Deleted Employees */}
        <TabsContent value="employees">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm">{t('ID', 'الرقم')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Name', 'الاسم')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Deleted At', 'وقت الحذف')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Deleted By', 'حذف بواسطة')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Reason', 'السبب')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Actions', 'الإجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-sm">{employee.id}</td>
                      <td className="px-4 py-3">
                        {t(employee.full_name, employee.full_name_ar || employee.full_name)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(employee.deleted_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{employee.deleted_by}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {employee.deletion_reason || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {employee.can_restore && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(`employee:${employee.id}`, 'employee')}
                            >
                              <Undo2 className="w-4 h-4 me-1" />
                              {t('Restore', 'استعادة')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePermanentDelete(`employee:${employee.id}`, 'employee')}
                          >
                            <Trash2 className="w-4 h-4 me-1" />
                            {t('Delete Forever', 'حذف نهائي')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEmployees.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  {t('No deleted employees found', 'لا يوجد موظفون محذوفون')}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Deleted Requests */}
        <TabsContent value="requests">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm">{t('ID', 'الرقم')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Type', 'النوع')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Employee', 'الموظف')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Deleted At', 'وقت الحذف')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Deleted By', 'حذف بواسطة')}</th>
                    <th className="px-4 py-3 text-start text-sm">{t('Actions', 'الإجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-sm">{request.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">{request.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{request.employee_id}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(request.deleted_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{request.deleted_by}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {request.can_restore && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestore(`request:${request.id}`, 'request')}
                            >
                              <Undo2 className="w-4 h-4 me-1" />
                              {t('Restore', 'استعادة')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePermanentDelete(`request:${request.id}`, 'request')}
                          >
                            <Trash2 className="w-4 h-4 me-1" />
                            {t('Delete Forever', 'حذف نهائي')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRequests.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  {t('No deleted requests found', 'لا توجد طلبات محذوفة')}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              {t('About Soft Delete', 'حول الحذف المؤقت')}
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              {t(
                'Soft-deleted records are hidden but not permanently removed. You can restore them at any time. Use "Delete Forever" to permanently remove a record.',
                'السجلات المحذوفة مؤقتاً مخفية ولكن لم يتم إزالتها نهائياً. يمكنك استعادتها في أي وقت. استخدم "حذف نهائي" لإزالة السجل بشكل دائم.'
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
