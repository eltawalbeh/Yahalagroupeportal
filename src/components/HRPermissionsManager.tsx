import React, { useState, useEffect } from 'react';
import { Shield, FileText, Info, Mail, Loader2, CheckCircle2, RefreshCw, Ban, Megaphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';

interface HRPermissions {
  can_upload_documents: boolean;
  can_edit_employee_info: boolean;
  can_edit_financial_info: boolean;
  can_resend_emails: boolean;
  can_cancel_requests: boolean;
  can_post_announcements: boolean;
  updated_at?: string;
  updated_by?: string;
}

export function HRPermissionsManager() {
  const { t, language } = useLanguage();
  const { adminInfo } = useAuth();
  const [permissions, setPermissions] = useState<HRPermissions>({
    can_upload_documents: false,
    can_edit_employee_info: false,
    can_edit_financial_info: false,
    can_resend_emails: true,
    can_cancel_requests: false,
    can_post_announcements: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await adminFetch('/admin/hr-permissions');
      const data = await response.json();
      if (data.success && data.permissions) {
        setPermissions({
          can_upload_documents: data.permissions.can_upload_documents || false,
          can_edit_employee_info: data.permissions.can_edit_employee_info || false,
          can_edit_financial_info: data.permissions.can_edit_financial_info || false,
          can_resend_emails: data.permissions.can_resend_emails !== false,
          can_cancel_requests: data.permissions.can_cancel_requests || false,
          can_post_announcements: data.permissions.can_post_announcements || false,
        });
        if (data.permissions.updated_at) {
          setLastSaved(data.permissions.updated_at);
        }
      }
    } catch (error) {
      console.error('Error fetching HR permissions:', error);
      toast.error(t('Failed to load HR permissions', 'فشل تحميل صلاحيات الموارد البشرية'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof HRPermissions, value: boolean) => {
    const updatedPermissions = { ...permissions, [key]: value };
    setPermissions(updatedPermissions);
    setSaving(true);

    try {
      const response = await adminFetch('/admin/hr-permissions', {
        method: 'PATCH',
        body: JSON.stringify({
          permissions: updatedPermissions,
          admin_id: adminInfo?.id || 'admin',
          admin_name: adminInfo?.name || 'Super Admin'
        })
      });
      const data = await response.json();
      if (data.success) {
        setLastSaved(new Date().toISOString());
        const labelMap: Record<string, { en: string; ar: string }> = {
          can_upload_documents: { en: 'Document Upload', ar: 'تحميل المستندات' },
          can_edit_employee_info: { en: 'Extra Employee Info', ar: 'معلومات الموظف الإضافية' },
          can_edit_financial_info: { en: 'Financial Info', ar: 'المعلومات المالية' },
          can_resend_emails: { en: 'Resend Emails', ar: 'إعادة إرسال البريد' },
          can_cancel_requests: { en: 'Cancel Requests', ar: 'إلغاء الطلبات' },
          can_post_announcements: { en: 'Post Announcements', ar: 'نشر الإعلانات' },
        };
        const label = labelMap[key] || { en: key, ar: key };
        toast.success(
          t(
            `${label.en} ${value ? 'enabled' : 'disabled'} for HR/Managers`,
            `${label.ar} ${value ? 'مفعّل' : 'معطّل'} لمديري الموارد البشرية`
          )
        );
      } else {
        // Revert on failure
        setPermissions(prev => ({ ...prev, [key]: !value }));
        toast.error(data.message || t('Failed to update permission', 'فشل تحديث الصلاحية'));
      }
    } catch (error) {
      console.error('Error updating HR permission:', error);
      setPermissions(prev => ({ ...prev, [key]: !value }));
      toast.error(t('Connection error', 'خطأ في الاتصال'));
    } finally {
      setSaving(false);
    }
  };

  const permissionItems = [
    {
      key: 'can_resend_emails' as const,
      icon: Mail,
      label: t('Resend Decision Emails', 'إعادة إرسال إشعارات القرار'),
      description: t(
        'Allow HR/Managers to resend approval or rejection notification emails to employees, managers, and admins.',
        'السماح لمديري الموارد البشرية بإعادة إرسال إشعارات الموافقة أو الرفض للموظفين والمديرين والمسؤولين.'
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      key: 'can_upload_documents' as const,
      icon: FileText,
      label: t('Upload Employee Documents', 'تحميل مستندات الموظفين'),
      description: t(
        'Allow HR/Managers to upload, view, and manage documents for each employee (contracts, IDs, certificates, etc.).',
        'السماح لمديري الموارد البشرية بتحميل وعرض وإدارة المستندات لكل موظف (عقود، هويات، شهادات، إلخ).'
      ),
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      key: 'can_edit_employee_info' as const,
      icon: Info,
      label: t('Edit Extra Employee Info', 'تعديل معلومات الموظف الإضافية'),
      description: t(
        'Allow HR/Managers to add and edit extra information for employees (nationality, passport, marital status, blood type, etc.).',
        'السماح لمديري الموارد البشرية بإضافة وتعديل معلومات إضافية للموظفين (الجنسية، الجواز، الحالة الاجتماعية، فصيلة الدم، إلخ).'
      ),
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30'
    },
    {
      key: 'can_edit_financial_info' as const,
      icon: Info,
      label: t('Edit Financial Info', 'تعديل المعلومات المالية'),
      description: t(
        'Allow HR/Managers to add and edit financial information for employees (salary, benefits, deductions, etc.).',
        'السماح لمديري الموارد البشرية بإضافة وتعديل المعلومات المالية للموظفين (الراتب، الفوائد، الخصومات، إلخ).'
      ),
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30'
    },
    {
      key: 'can_cancel_requests' as const,
      icon: Ban,
      label: t('Cancel Employee Requests', 'إلغاء طلبات الموظفين'),
      description: t(
        'Allow HR/Managers to cancel pending or approved requests on behalf of employees. Annual leave balances are automatically restored on cancellation of approved leave.',
        'السماح لمديري الموارد البشرية بإلغاء الطلبات المعلقة أو الموافق عليها نيابةً عن الموظفين. يتم استعادة رصيد الإجازة السنوية تلقائياً عند إلغاء إجازة موافق عليها.'
      ),
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-100 dark:bg-rose-900/30',
      warningNote: t(
        'Use with care — cancelling approved requests will notify the employee and restore any consumed leave balance.',
        'استخدم بحذر — إلغاء الطلبات الموافق عليها سيُشعر الموظف ويستعيد أي رصيد إجازة مستهلك.'
      )
    },
    {
      key: 'can_post_announcements' as const,
      icon: Megaphone,
      label: t('Post Announcements', 'نشر الإعلانات'),
      description: t(
        'Allow HR/Managers to create, edit, pin, and delete company-wide announcements on behalf of the Admin. Announcements will appear to all employees.',
        'السماح لمديري الموارد البشرية بإنشاء وتعديل وتثبيت وحذف الإعلانات على مستوى الشركة نيابةً عن المسؤول. ستظهر الإعلانات لجميع الموظفين.'
      ),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            {t('HR/Manager Permissions', 'صلاحيات مدير الموارد البشرية')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ms-2 text-sm text-muted-foreground">
              {t('Loading permissions...', 'جاري تحميل الصلاحيات...')}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              {t('HR/Manager Permissions', 'صلاحيات مدير الموارد الشرية')}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {t(
                'Control what HR managers can do in their portal. Changes take effect immediately.',
                'التحكم في ما يمكن لمديري الموارد البشرية فعله في بوابتهم. التغييرات تسري فوراً.'
              )}
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchPermissions} disabled={saving}>
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {permissionItems.map((item, index) => (
          <div key={item.key}>
            <div className="flex items-start gap-4 py-4">
              <div className={`shrink-0 w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor={item.key} className="text-sm font-semibold cursor-pointer">
                    {item.label}
                  </Label>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      permissions[item.key]
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {permissions[item.key]
                      ? t('Enabled', 'مفعّل')
                      : t('Disabled', 'معطّل')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
                {(item as any).warningNote && permissions[item.key] && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-2.5 py-1.5">
                    <span className="text-rose-500 text-[11px] shrink-0 mt-0.5">⚠</span>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                      {(item as any).warningNote}
                    </p>
                  </div>
                )}
              </div>
              <Switch
                id={item.key}
                checked={permissions[item.key]}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                disabled={saving}
              />
            </div>
            {index < permissionItems.length - 1 && <Separator />}
          </div>
        ))}

        {/* Last updated info */}
        {lastSaved && (
          <div className="pt-3 mt-2 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {t('Last updated:', 'آخر تحديث:')}{' '}
              {new Date(lastSaved).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                dateStyle: 'medium'
              })}{' '}
              {new Date(lastSaved).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
                timeStyle: 'short'
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}