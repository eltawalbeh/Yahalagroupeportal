import React, { useState, useEffect } from 'react';
import { Settings, Lock, AlertTriangle, Database, BarChart, Trash2, History, RefreshCw, TrendingUp, Users, FileText, Bell, Building2, MessageSquare, ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { adminFetch } from '../utils/adminApi';

interface SystemStats {
  total_requests: number;
  total_employees: number;
  total_companies: number;
  total_notifications: number;
  total_documents: number;
  total_announcements: number;
  total_comments: number;
  pending_requests: number;
  unread_notifications: number;
}

type SectionKey = 'stats' | 'security' | 'maintenance' | 'danger';

interface AdminSettingsProps {
  /** Which sections to render. Defaults to all if not provided. */
  sections?: SectionKey[];
}

export function AdminSettings({ sections }: AdminSettingsProps = {}) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isResetDataOpen, setIsResetDataOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ total: number; migrated: number; skipped: number; errors: number } | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    admin_id: '031984',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [resetConfirmation, setResetConfirmation] = useState('');

  const show = (section: SectionKey) => !sections || sections.includes(section);

  useEffect(() => {
    if (show('stats')) fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminFetch('/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error(t('Please fill in all fields', 'يرجى ملء جميع الحق��ل'));
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(t('Passwords do not match', 'كلمات المرور غير متطابقة'));
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error(t('Password must be at least 6 characters', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'));
      return;
    }

    setLoading(true);
    try {
      const response = await adminFetch('/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          admin_id: passwordForm.admin_id,
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(t('Password changed successfully', 'تم تغيير كلمة المرور بنجاح'));
        setIsChangePasswordOpen(false);
        setPasswordForm({ ...passwordForm, current_password: '', new_password: '', confirm_password: '' });
      } else {
        toast.error(data.message || t('Failed to change password', 'فشل تغيير كلمة المرور'));
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('Failed to change password', 'فشل تغيير كلمة المرور'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (resetConfirmation !== 'RESET_ALL_DATA') {
      toast.error(t('Invalid confirmation code', 'رمز التأكيد غير صحيح'));
      return;
    }

    if (!confirm(t(
      'Are you absolutely sure? This will delete ALL requests, notifications, comments, documents, and announcements. This action cannot be undone!',
      'هل أنت متأكد تماماً؟ سيؤدي هذا إلى حذف جميع الطلبات والإشعارات والتعليقات والمستندات والإعلانات. لا يمكن التراجع عن هذا الإجراء!'
    ))) {
      return;
    }

    setLoading(true);
    try {
      const response = await adminFetch('/admin/reset-data', {
        method: 'POST',
        body: JSON.stringify({ confirmation_code: 'RESET_ALL_DATA' }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(t('All data has been reset', 'تم إعادة تعيين جميع البيانات'));
        setIsResetDataOpen(false);
        setResetConfirmation('');
        fetchStats();
      } else {
        toast.error(data.message || t('Failed to reset data', 'فشل إعادة تعيين البيانات'));
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error(t('Failed to reset data', 'فشل إعادة تعيين البيانات'));
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateActivityLogs = async () => {
    if (!confirm(t(
      'This will generate activity logs for all existing requests that don\'t have them yet. Requests that already have activity logs will be safely skipped. Continue?',
      'سيتم إنشاء سجلات النشاط لجميع الطلبات الحالية التي لا تحتوي عليها بعد. سيتم تخطي الطلبات التي تحتوي بالفعل على سجلات نشاط بأمان. متابعة؟'
    ))) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const response = await adminFetch('/admin/migrate-activity-logs', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setMigrationResult(data.stats);
        toast.success(t(
          `Migration complete! ${data.stats.migrated} requests updated, ${data.stats.skipped} already had logs.`,
          `اكتملت الترحيل! تم تحديث ${data.stats.migrated} طلب، ${data.stats.skipped} كان لديها سجلات بالفعل.`
        ));
      } else {
        toast.error(data.message || t('Migration failed', 'فشل الترحيل'));
      }
    } catch (error) {
      console.error('Error migrating activity logs:', error);
      toast.error(t('Failed to migrate activity logs', 'فشل ترحيل سجلات النشاط'));
    } finally {
      setIsMigrating(false);
    }
  };

  const statCards = stats ? [
    { label: t('Total Requests', 'إجمالي الطلبات'), value: stats.total_requests, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: t('Employees', 'الموظفون'), value: stats.total_employees, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: t('Companies', 'الشركات'), value: stats.total_companies, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t('Documents', 'المستندات'), value: stats.total_documents, icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: t('Announcements', 'الإعلانات'), value: stats.total_announcements, icon: Bell, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { label: t('Comments', 'التعليقات'), value: stats.total_comments, icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' },
    { label: t('Notifications', 'الإشعارات'), value: stats.total_notifications, icon: Bell, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: t('Pending Requests', 'الطلبات المعلقة'), value: stats.pending_requests, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ] : [];

  return (
    <div className="space-y-6">

      {/* ── STATS ── */}
      {show('stats') && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-base">{t('System Statistics', 'إحصائيات النظام')}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStats} className="h-8 gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('Refresh', 'تحديث')}
            </Button>
          </div>

          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map((card, i) => (
                <div key={i} className={`rounded-xl p-4 flex items-start gap-3 ${card.bg} border border-transparent`}>
                  <div className={`mt-0.5 ${card.color}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{card.label}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 bg-muted animate-pulse h-20" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECURITY ── */}
      {show('security') && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-base">{t('Admin Password', 'كلمة مرور المسؤول')}</h3>
          </div>

          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{t('Admin Account Password', 'كلمة مرور حساب المسؤول')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('Change your admin password to keep the account secure.', 'قم بتغيير كلمة مرور المسؤول للحفاظ على أمان الحساب.')}
                </p>
              </div>
              <Button
                onClick={() => setIsChangePasswordOpen(true)}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Lock className="h-4 w-4 me-2" />
                {t('Change Password', 'تغيير كلمة المرور')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── DATA MAINTENANCE ── */}
      {show('maintenance') && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-base">{t('Activity Log Migration', 'ترحيل سجلات النشاط')}</h3>
          </div>

          <Card className="p-5 border-indigo-200 dark:border-indigo-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{t('Migrate Activity Logs', 'ترحيل سجلات النشاط')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(
                    'Generate activity logs for all existing requests that don\'t have them yet. Requests with existing logs will be safely skipped.',
                    'إنشاء سجلات النشاط لجميع الطلبات الحالية التي لا تحتوي عليها. سيتم تخطي الطلبات التي تحتوي بالفعل على سجلات.'
                  )}
                </p>
                {migrationResult && (
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                      {t(`${migrationResult.migrated} migrated`, `${migrationResult.migrated} تم ترحيلها`)}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                      {t(`${migrationResult.skipped} skipped`, `${migrationResult.skipped} تم تخطيها`)}
                    </Badge>
                    {migrationResult.errors > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">
                        {t(`${migrationResult.errors} errors`, `${migrationResult.errors} أخطاء`)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleMigrateActivityLogs}
                disabled={isMigrating}
                variant="outline"
                className="shrink-0 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                    {t('Migrating...', 'جاري الترحيل...')}
                  </>
                ) : (
                  <>
                    <History className="h-4 w-4 me-2" />
                    {t('Run Migration', 'تشغيل الترحيل')}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── DANGER ZONE ── */}
      {show('danger') && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-base text-destructive">{t('Danger Zone', 'منطقة الخطر')}</h3>
          </div>

          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t(
                'These actions are permanent and cannot be undone. Use with extreme caution!',
                'هذه الإجراءات دائمة ولا يمكن التراجع عنها. استخدم بحذر شديد!'
              )}
            </AlertDescription>
          </Alert>

          <Card className="p-5 border-destructive/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{t('Reset All Data', 'إعادة تعيين جميع البيانات')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(
                    'Delete all requests, notifications, comments, documents, and announcements. Employee and company data will be preserved.',
                    'حذف جميع الطلبات والإشعارات والتعليقات والمستندات والإعلانات. سيتم الاحتفاظ ببيانات الموظفين والشركات.'
                  )}
                </p>
              </div>
              <Button variant="destructive" onClick={() => setIsResetDataOpen(true)} className="shrink-0">
                <Trash2 className="h-4 w-4 me-2" />
                {t('Reset All Data', 'إعادة تعيين جميع البيانات')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CHANGE PASSWORD DIALOG ── */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Change Admin Password', 'تغيير كلمة مرور المسؤول')}</DialogTitle>
            <DialogDescription>
              {t('Enter your current password and choose a new one', 'أدخل كلمة المرور الحالية واختر كلمة مرور جديدة')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Admin ID', 'معرف المسؤول')}</Label>
              <Input value={passwordForm.admin_id} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>{t('Current Password', 'كلمة المرور الحالية')} *</Label>
              <Input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                placeholder={t('Enter current password', 'أدخل كلمة المرور الحالية')}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t('New Password', 'كلمة المرور الجديدة')} *</Label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder={t('Enter new password', 'أدخل كلمة المرور الجديدة')}
              />
              <p className="text-xs text-muted-foreground">{t('Minimum 6 characters', 'حد أدنى 6 أحرف')}</p>
            </div>

            <div className="space-y-2">
              <Label>{t('Confirm New Password', 'تأكيد كلمة المرور الجديدة')} *</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder={t('Confirm new password', 'أكد كلمة المرور الجديدة')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangePasswordOpen(false);
                setPasswordForm({ ...passwordForm, current_password: '', new_password: '', confirm_password: '' });
              }}
            >
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? t('Changing...', 'جاري التغيير...') : t('Change Password', 'تغيير كلمة المرور')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESET DATA DIALOG ── */}
      <Dialog open={isResetDataOpen} onOpenChange={setIsResetDataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('Reset All Data', 'إعادة تعيين جميع البيانات')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'This will permanently delete all requests, notifications, comments, documents, and announcements.',
                'سيؤدي هذا إلى حذف جميع الطلبات والإشعارات والتعليقات والمستندات والإعلانات بشكل دائم.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('Warning', 'تحذير')}:</strong>{' '}
                {t('This action cannot be undone!', 'لا يمكن التراجع عن هذا الإجراء!')}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>
                {t('Type', 'اكتب')} <code className="bg-muted px-2 py-1 rounded">RESET_ALL_DATA</code> {t('to confirm', 'للتأكيد')}
              </Label>
              <Input
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                placeholder="RESET_ALL_DATA"
                className="font-mono"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-3">
              <div>
                <p className="font-medium mb-1">{t('What will be deleted:', 'ما سيتم حذفه:')}</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-xs">
                  <li>{t('All requests (leave, advance, entry)', 'جميع الطلبات (إجازة، سلفة، خروج وعودة)')}</li>
                  <li>{t('All notifications', 'جميع الإشعارات')}</li>
                  <li>{t('All comments', 'جميع التعليقات')}</li>
                  <li>{t('All documents', 'جميع المستندات')}</li>
                  <li>{t('All announcements', 'جميع الإعلانات')}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">{t('What will be preserved:', 'ما سيتم الاحتفاظ به:')}</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-xs">
                  <li>{t('Employee accounts', 'حسابات الموظفين')}</li>
                  <li>{t('Company data', 'بيانات الشركات')}</li>
                  <li>{t('Admin credentials', 'بيانات اعتماد المسؤول')}</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsResetDataOpen(false); setResetConfirmation(''); }}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetData}
              disabled={loading || resetConfirmation !== 'RESET_ALL_DATA'}
            >
              {loading ? t('Resetting...', 'جاري إعادة التعيين...') : t('Reset All Data', 'إعادة تعيين جميع البيانات')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
