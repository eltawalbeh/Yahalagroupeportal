import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle2, XCircle, User, Shield, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { adminFetch } from '../utils/adminApi';

interface EmailResult {
  recipient: string;
  email: string;
  role: string;
  success: boolean;
}

interface ResendEmailButtonProps {
  requestId: string;
  requestStatus: string;
  employeeName?: string;
  employeeEmail?: string;
  managerName?: string;
  hasManager?: boolean;
  onResendComplete?: () => void;
  variant?: 'default' | 'icon' | 'compact';
  /** 'admin' uses the admin endpoint, 'manager' uses the manager endpoint */
  callerRole?: 'admin' | 'manager';
  /** Manager identity info (used when callerRole is 'manager') */
  callerInfo?: { id: string | number; name: string; name_ar?: string };
}

export function ResendEmailButton({
  requestId,
  requestStatus,
  employeeName,
  employeeEmail,
  managerName,
  hasManager = true,
  onResendComplete,
  variant = 'default',
  callerRole = 'admin',
  callerInfo
}: ResendEmailButtonProps) {
  const { t, language } = useLanguage();
  const { adminInfo, employee } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(['employee']);
  const [results, setResults] = useState<EmailResult[] | null>(null);

  // Only show for approved/rejected requests
  if (!['approved', 'rejected'].includes(requestStatus)) {
    return null;
  }

  const toggleRecipient = (recipient: string) => {
    setSelectedRecipients(prev =>
      prev.includes(recipient)
        ? prev.filter(r => r !== recipient)
        : [...prev, recipient]
    );
  };

  const handleResend = async () => {
    if (selectedRecipients.length === 0) {
      toast.error(t('Please select at least one recipient', 'يرجى اختيار مستلم واحد على الأقل'));
      return;
    }

    setIsSending(true);
    setResults(null);

    try {
      // Choose endpoint based on caller role
      const endpoint = callerRole === 'manager'
        ? `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/requests/${requestId}/resend-email`
        : null; // admin path handled via adminFetch below

      // Build request body based on caller role
      const body = callerRole === 'manager'
        ? {
            recipients: selectedRecipients,
            manager_id: callerInfo?.id || employee?.id || 'manager',
            manager_name: callerInfo?.name || employee?.full_name || 'HR Manager',
            manager_name_ar: callerInfo?.name_ar || employee?.full_name_ar || 'مدير الموارد البشرية'
          }
        : {
            recipients: selectedRecipients,
            admin_id: adminInfo?.id || 'admin',
            admin_name: adminInfo?.name || 'Super Admin',
            admin_name_ar: adminInfo?.name_ar || 'المسؤول الأعلى'
          };

      let response;
      if (callerRole === 'manager') {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(body)
        });
      } else {
        response = await adminFetch(`/admin/requests/${requestId}/resend-email`, {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        const { success: successCount, failed: failCount } = data.stats;

        if (failCount === 0) {
          toast.success(t(
            `${successCount} email(s) sent successfully!`,
            `تم إرسال ${successCount} بريد إلكتروني بنجاح!`
          ));
        } else if (successCount > 0) {
          toast.warning(t(
            `${successCount} sent, ${failCount} failed`,
            `${successCount} تم الإرسال، ${failCount} فشل`
          ));
        } else {
          toast.error(t('All emails failed to send', 'فشل إرسال جميع الرسائل'));
        }

        onResendComplete?.();
      } else {
        toast.error(data.message || t('Failed to resend emails', 'فشل إعادة إرسال البريد الإلكتروني'));
      }
    } catch (error) {
      console.error('Error resending emails:', error);
      toast.error(t('An error occurred while resending emails', 'حدث خطأ أثناء إعادة إرسال البريد الإلكتروني'));
    } finally {
      setIsSending(false);
    }
  };

  const handleOpen = () => {
    setResults(null);
    setSelectedRecipients(['employee']);
    setIsOpen(true);
  };

  const statusColor = requestStatus === 'approved' ? 'text-emerald-600' : 'text-red-600';
  const statusBgColor = requestStatus === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  const statusLabel = requestStatus === 'approved'
    ? t('Approved', 'تمت الموافقة')
    : t('Rejected', 'مرفوض');

  const StatusIcon = requestStatus === 'approved' ? CheckCircle : AlertCircle;

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          title={t('Resend Decision Notification', 'إعادة إرسال إشعار القرار')}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
        >
          <Mail className="h-4 w-4" />
        </Button>
      ) : variant === 'compact' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="text-xs gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          {t('Resend', 'إعادة إرسال')}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          {t('Resend Decision Notification', 'إعادة إرسال إشعار القرار')}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t('Resend Decision Notification', 'إعادة إرسال إشعار القرار')}
            </DialogTitle>
            <DialogDescription>
              {requestStatus === 'approved'
                ? t(
                    'Resend the approval notification to selected recipients.',
                    'إعادة إرسال إشعار الموافقة إلى المستلمين المحددين.'
                  )
                : t(
                    'Resend the rejection notification to selected recipients.',
                    'إعادة إرسال إشعار الرفض إلى المستلمين المحددين.'
                  )
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Decision Status Banner */}
            <div className={`rounded-lg p-3 border ${statusBgColor} flex items-center gap-3`}>
              <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${statusColor}`}>
                  {requestStatus === 'approved'
                    ? t('This request has been APPROVED', 'تمت الموافقة على هذا الطلب')
                    : t('This request has been REJECTED', 'تم رفض هذا الطلب')
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('Recipients will receive the official decision email', 'سيتلقى المستلمون البريد الإلكتروني الرسمي للقرار')}
                </p>
              </div>
            </div>

            {/* Request Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('Request ID', 'رقم الطلب')}</span>
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  {requestId.substring(0, 8).toUpperCase()}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('Decision', 'القرار')}</span>
                <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
              </div>
              {employeeName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('Employee', 'الموظف')}</span>
                  <span className="text-xs font-medium">{employeeName}</span>
                </div>
              )}
            </div>

            {/* Recipient Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {t('Send notification to:', 'إرسال الإشعار إلى:')}
              </p>

              {/* Employee */}
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={selectedRecipients.includes('employee')}
                  onCheckedChange={() => toggleRecipient('employee')}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      {t('Employee (Requester)', 'الموظف (مقدم الطلب)')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {employeeName || t('The person who submitted this request', 'الشخص الذي قدم هذا الطلب')}
                    {employeeEmail && (
                      <span className="text-muted-foreground/70"> ({employeeEmail})</span>
                    )}
                  </p>
                </div>
              </label>

              {/* Manager */}
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                hasManager ? 'hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'
              }`}>
                <Checkbox
                  checked={selectedRecipients.includes('manager')}
                  onCheckedChange={() => hasManager && toggleRecipient('manager')}
                  disabled={!hasManager}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-500" />
                    <span className="text-sm font-medium">
                      {t('Manager', 'المدير')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasManager
                      ? managerName || t('The employee\'s direct manager', 'المدير المباشر للموظف')
                      : t('No manager assigned', 'لم يتم تعيين مدير')
                    }
                  </p>
                </div>
              </label>

              {/* Admin */}
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={selectedRecipients.includes('admin')}
                  onCheckedChange={() => toggleRecipient('admin')}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">
                      {t('Admin(s)', 'المسؤول(ين)')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('All system administrators', 'جميع مسؤولي النظام')}
                  </p>
                </div>
              </label>
            </div>

            {/* Results */}
            {results && results.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">
                  {t('Results:', 'النتائج:')}
                </p>
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className="truncate">
                      {result.recipient}
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {result.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate ms-auto">
                      {result.email}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              {results ? t('Close', 'إغلاق') : t('Cancel', 'إلغاء')}
            </Button>
            {!results && (
              <Button
                onClick={handleResend}
                disabled={isSending || selectedRecipients.length === 0}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('Sending...', 'جاري الإرسال...')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t('Resend Email', 'إعادة إرسال البريد')}
                  </>
                )}
              </Button>
            )}
            {results && (
              <Button
                onClick={() => {
                  setResults(null);
                }}
                variant="outline"
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {t('Send Again', 'إرسال مرة أخرى')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}