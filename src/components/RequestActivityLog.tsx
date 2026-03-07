import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Mail,
  Bell,
  User,
  Shield,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';

export interface ActivityLogEntry {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'updated' | 'comment' | 'email_resent';
  performed_by: string;
  performed_by_name: string;
  performed_by_name_ar?: string;
  performed_by_role?: string;
  timestamp: string;
  notes?: string;
  notifications_sent?: {
    type: 'email' | 'in_app';
    recipient_name: string;
    recipient_email?: string;
    recipient_role?: string;
    template?: string;
    success?: boolean;
  }[];
}

interface RequestActivityLogProps {
  activityLog?: ActivityLogEntry[];
  className?: string;
  compact?: boolean;
}

export function RequestActivityLog({ activityLog = [], className, compact = false }: RequestActivityLogProps) {
  const { t, language } = useLanguage();

  if (activityLog.length === 0) {
    return (
      <div className={cn("text-center py-6", className)}>
        <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {t('No activity recorded yet', 'لم يتم تسجيل أي نشاط حتى الآن')}
        </p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submitted':
        return <Send className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'email_resent':
        return <Mail className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'submitted':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'approved':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      case 'email_resent':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'submitted':
        return t('Request Submitted', 'تم تقديم الطلب');
      case 'approved':
        return t('Request Approved', 'تمت الموافقة على الطلب');
      case 'rejected':
        return t('Request Rejected', 'تم رفض الطلب');
      case 'cancelled':
        return t('Request Cancelled', 'تم إلغاء الطلب');
      case 'email_resent':
        return t('Email Resent', 'تم إعادة إرسال البريد');
      default:
        return t('Updated', 'تم التحديث');
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return t('Super Admin', 'المسؤول الأعلى');
      case 'manager':
        return t('HR / Manager', 'الموارد البشرية / مدير');
      case 'employee':
        return t('Employee', 'موظف');
      case 'system':
        return t('System', 'النظام');
      default:
        return role || '';
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'manager':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
      case 'employee':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const lineColor = (action: string) => {
    switch (action) {
      case 'approved': return 'bg-emerald-300 dark:bg-emerald-700';
      case 'rejected': return 'bg-red-300 dark:bg-red-700';
      default: return 'bg-slate-200 dark:bg-slate-700';
    }
  };

  return (
    <div className={cn("space-y-0", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('Activity Log', 'سجل النشاط')}
        </h4>
      </div>

      <div className="relative">
        {activityLog.map((entry, index) => (
          <div key={entry.id || index} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {index < activityLog.length - 1 && (
              <div className={cn(
                "absolute start-[15px] top-8 bottom-0 w-0.5",
                lineColor(entry.action)
              )} />
            )}

            {/* Icon */}
            <div className={cn(
              "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border shrink-0",
              getActionColor(entry.action)
            )}>
              {getActionIcon(entry.action)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              {/* Action Title */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {getActionLabel(entry.action)}
                </span>
                {entry.performed_by_role && (
                  <Badge className={cn("text-[10px] h-5 font-medium", getRoleBadgeColor(entry.performed_by_role))}>
                    {getRoleLabel(entry.performed_by_role)}
                  </Badge>
                )}
              </div>

              {/* Who performed it */}
              <div className="flex items-center gap-1.5 mt-1">
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">
                  {t('By', 'بواسطة')}{' '}
                  <span className="font-medium">
                    {language === 'ar'
                      ? entry.performed_by_name_ar || entry.performed_by_name
                      : entry.performed_by_name}
                  </span>
                </span>
              </div>

              {/* When */}
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(entry.timestamp)}
              </p>

              {/* Notes */}
              {entry.notes && (
                <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-md px-3 py-2 text-xs text-muted-foreground italic">
                  &ldquo;{entry.notes}&rdquo;
                </div>
              )}

              {/* Notifications */}
              {entry.notifications_sent && entry.notifications_sent.length > 0 && !compact && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {t('Notifications Sent', 'الإشعارات المرسلة')}
                    </span>
                  </div>
                  <div className="space-y-1 ps-4">
                    {entry.notifications_sent.map((notif, ni) => (
                      <div
                        key={ni}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        {notif.type === 'email' ? (
                          <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                        ) : (
                          <Bell className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate">
                          {notif.recipient_name}
                          {notif.recipient_role && (
                            <span className="text-muted-foreground/60">
                              {' '}({getRoleLabel(notif.recipient_role)})
                            </span>
                          )}
                        </span>
                        {notif.recipient_email && (
                          <span className="text-muted-foreground/40 truncate hidden sm:inline">
                            — {notif.recipient_email}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}