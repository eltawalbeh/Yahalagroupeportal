import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, ChevronRight, Passport } from 'lucide-react';
import {
  FileText, Clock, AlertTriangle, CheckCircle2, XCircle, CreditCard
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { cn } from './ui/utils';

interface DocEntry {
  field: string;
  label: string;
  labelAr: string;
  expiry_date: string;
  days_remaining: number;
  is_expired: boolean;
}

interface MyDocumentsCardProps {
  employeeId: number;
  onNavigateToProfile?: () => void;
}

const DOC_ICONS: Record<string, React.ElementType> = {
  passport_expiry:     FileText,
  iqama_expiry:        CreditCard,
  work_permit_expiry:  FileText,
  contract_end_date:   FileText,
  reentry_visa_expiry: FileText,
};

function urgencyConfig(days: number, isExpired: boolean) {
  if (isExpired)    return { color: 'text-red-700 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/20',      border: 'border-red-200 dark:border-red-800',      badge: 'bg-red-600 text-white',            icon: XCircle,         label: 'Expired', labelAr: 'منتهية' };
  if (days <= 20)   return { color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/20',      border: 'border-red-200 dark:border-red-800',      badge: 'bg-red-100 text-red-800',          icon: AlertTriangle,   label: 'Critical', labelAr: 'حرج' };
  if (days <= 50)   return { color: 'text-amber-600 dark:text-amber-400',bg: 'bg-amber-50 dark:bg-amber-950/20',  border: 'border-amber-200 dark:border-amber-800',  badge: 'bg-amber-100 text-amber-800',      icon: AlertTriangle,   label: 'Warning', labelAr: 'تحذير' };
  if (days <= 90)   return { color: 'text-sky-600 dark:text-sky-400',    bg: 'bg-sky-50 dark:bg-sky-950/20',      border: 'border-sky-200 dark:border-sky-800',      badge: 'bg-sky-100 text-sky-800',          icon: Clock,           label: 'Upcoming', labelAr: 'قادم' };
  return              { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2,    label: 'OK', labelAr: 'جيد' };
}

export function MyDocumentsCard({ employeeId, onNavigateToProfile }: MyDocumentsCardProps) {
  const { t, language } = useLanguage();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) fetchDocs();
  }, [employeeId]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee-document-expiry/${employeeId}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) setDocs(data.documents || []);
    } catch (e) { console.error('Error fetching document expiry:', e); }
    finally { setLoading(false); }
  };

  // Compute overall urgency for card header
  const hasExpired   = docs.some(d => d.is_expired);
  const hasCritical  = docs.some(d => !d.is_expired && d.days_remaining <= 20);
  const hasWarning   = docs.some(d => !d.is_expired && d.days_remaining <= 50);
  const hasUpcoming  = docs.some(d => !d.is_expired && d.days_remaining <= 90);

  const headerColor = hasExpired || hasCritical
    ? 'from-red-50 to-white dark:from-red-950/20 dark:to-slate-900 border-red-200 dark:border-red-800'
    : hasWarning
    ? 'from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200 dark:border-amber-800'
    : hasUpcoming
    ? 'from-sky-50 to-white dark:from-sky-950/20 dark:to-slate-900 border-sky-200 dark:border-sky-800'
    : 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-800';

  const alertCount = docs.filter(d => d.is_expired || d.days_remaining <= 50).length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-2 text-muted-foreground text-sm">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        {t('Loading your documents...', 'جاري تحميل مستنداتك...')}
      </div>
    );
  }

  if (docs.length === 0) return null;

  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-4 space-y-3', headerColor)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-lg',
            hasExpired || hasCritical ? 'bg-red-100 dark:bg-red-900/30'
              : hasWarning ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-emerald-100 dark:bg-emerald-900/30'
          )}>
            <Shield className={cn('w-4 h-4', hasExpired || hasCritical ? 'text-red-600' : hasWarning ? 'text-amber-600' : 'text-emerald-600')} />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('My Documents', 'مستنداتي')}</p>
            {alertCount > 0 && (
              <p className={cn('text-xs font-medium', hasExpired || hasCritical ? 'text-red-600' : 'text-amber-600')}>
                {t(`${alertCount} item${alertCount > 1 ? 's' : ''} need attention`, `${alertCount} ${alertCount === 1 ? 'عنصر يحتاج' : 'عناصر تحتاج'} انتباهاً`)}
              </p>
            )}
          </div>
        </div>
        {onNavigateToProfile && (
          <button
            onClick={onNavigateToProfile}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('View Profile', 'الملف الشخصي')}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Document rows */}
      <div className="space-y-2">
        {docs.map(doc => {
          const urg = urgencyConfig(doc.days_remaining, doc.is_expired);
          const Icon = DOC_ICONS[doc.field] || FileText;
          const UrgIcon = urg.icon;
          return (
            <div key={doc.field} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', urg.bg, urg.border)}>
              <Icon className={cn('w-4 h-4 shrink-0', urg.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {language === 'ar' ? doc.labelAr : doc.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(doc.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <UrgIcon className={cn('w-3.5 h-3.5', urg.color)} />
                <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', urg.badge)}>
                  {doc.is_expired
                    ? t('Expired', 'منتهية')
                    : doc.days_remaining === 0
                    ? t('Today!', 'اليوم!')
                    : t(`${doc.days_remaining}d`, `${doc.days_remaining} ي`)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
