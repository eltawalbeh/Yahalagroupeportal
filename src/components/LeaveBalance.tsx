import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Stethoscope, BanknoteIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface BalanceEntry {
  used: number;
  pending: number;
  total: number;
  isHourly?: boolean;
}

interface AllBalances {
  annual: BalanceEntry;
  sick: BalanceEntry;
  unpaid: BalanceEntry;
  hourly: BalanceEntry;
}

const TYPES = [
  {
    key: 'annual',
    icon: Calendar,
    color: '#006B7D',
    labelEn: 'Annual Leave',
    labelAr: 'إجازة سنوية',
    totalLabelEn: '30 days',
    totalLabelAr: '30 يوم',
    unitEn: 'd',
    unitAr: 'ي',
  },
  {
    key: 'sick',
    icon: Stethoscope,
    color: '#DC2626',
    labelEn: 'Sick Leave',
    labelAr: 'إجازة مرضية',
    totalLabelEn: '14 days',
    totalLabelAr: '14 يوم',
    unitEn: 'd',
    unitAr: 'ي',
  },
  {
    key: 'hourly',
    icon: Clock,
    color: '#7C3AED',
    labelEn: 'Hourly Leave',
    labelAr: 'إجازة ساعية',
    totalLabelEn: '6 hrs/mo',
    totalLabelAr: '6 ساعات/شهر',
    unitEn: 'hr',
    unitAr: 'س',
  },
  {
    key: 'unpaid',
    icon: BanknoteIcon,
    color: '#92400E',
    labelEn: 'Unpaid Leave',
    labelAr: 'بدون راتب',
    totalLabelEn: '30 days',
    totalLabelAr: '30 يوم',
    unitEn: 'd',
    unitAr: 'ي',
  },
];

function calcHours(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export function LeaveBalance() {
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [balances, setBalances] = useState<AllBalances | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employee?.id) fetchBalances();
  }, [employee?.id]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee!.id}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (!data.success) return;

      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth();

      const leaves = (data.requests || []).filter((r: any) => r.type === 'leave');

      const sumDays = (list: any[]) =>
        list.reduce((acc: number, r: any) => acc + calcDays(r.start_date || '', r.end_date || ''), 0);

      const byType = (subType: string, status: string) =>
        leaves.filter(
          (r: any) =>
            r.sub_type === subType &&
            r.status === status &&
            new Date(r.created_at).getFullYear() === thisYear
        );

      const hourlyByMonth = (status: string) =>
        leaves
          .filter((r: any) => {
            const d = new Date(r.created_at);
            return (
              r.sub_type === 'hourly' &&
              r.status === status &&
              d.getFullYear() === thisYear &&
              d.getMonth() === thisMonth
            );
          })
          .reduce(
            (acc: number, r: any) =>
              acc + (r.start_time && r.end_time ? calcHours(r.start_time, r.end_time) : 0),
            0
          );

      setBalances({
        annual: { used: sumDays(byType('annual', 'approved')), pending: sumDays(byType('annual', 'pending')), total: 30 },
        sick: { used: sumDays(byType('sick', 'approved')), pending: sumDays(byType('sick', 'pending')), total: 14 },
        unpaid: { used: sumDays(byType('unpaid', 'approved')), pending: sumDays(byType('unpaid', 'pending')), total: 30 },
        hourly: { used: hourlyByMonth('approved'), pending: hourlyByMonth('pending'), total: 6, isHourly: true },
      });
    } catch (e) {
      console.error('Error fetching leave balances:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-base sm:text-lg">{t('Leave Balance', 'رصيد الإجازات')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('All leave types', 'جميع أنواع الإجازات')}</p>
        </div>
        <button
          onClick={fetchBalances}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-muted/60 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {TYPES.map((type) => (
            <div key={type.key} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {TYPES.map((type) => {
            const b = balances?.[type.key as keyof AllBalances];
            const isHourly = type.key === 'hourly';
            const remaining = b ? Math.max(0, b.total - b.used - b.pending) : 0;
            const usedPct = b ? Math.min(100, ((b.used + b.pending) / b.total) * 100) : 0;
            const isLow = b ? remaining / b.total < 0.2 : false;
            const Icon = type.icon;

            return (
              <div
                key={type.key}
                className="rounded-xl p-3.5 border border-border/60"
                style={{ backgroundColor: `${type.color}09` }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${type.color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: type.color }} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    {t(type.labelEn, type.labelAr)}
                  </p>
                </div>

                {/* Remaining value */}
                <div className="mb-2">
                  <span className="text-2xl font-bold" style={{ color: isLow ? '#DC2626' : type.color }}>
                    {isHourly ? remaining.toFixed(1) : remaining}
                  </span>
                  <span className="text-xs text-muted-foreground ms-1.5">
                    {t(type.unitEn, type.unitAr)} {t('left', 'متاح')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-border/50 mb-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, usedPct)}%`,
                      backgroundColor: isLow ? '#DC2626' : type.color,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{t('Used', 'المُستخدم')}: {isHourly ? b?.used.toFixed(1) : b?.used}</span>
                  <span style={{ color: `${type.color}99` }}>
                    {t('Total', 'الكل')}: {t(type.totalLabelEn, type.totalLabelAr)}
                  </span>
                </div>

                {isLow && remaining === 0 && (
                  <div className="flex items-center gap-1 mt-2 text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[10px]">{t('Balance exhausted', 'نفد الرصيد')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && balances && (
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <p className="font-medium text-xs">{t('Annual limits:', 'الحدود السنوية:')}</p>
          <span>📅 {t('Annual: 30d', 'سنوية: 30 يوم')}</span>
          <span>🏥 {t('Sick: 14d', 'مرضية: 14 يوم')}</span>
          <span>⏰ {t('Hourly: 6h/mo', 'ساعية: 6 ساعات/شهر')}</span>
          <span>💸 {t('Unpaid: 30d', 'بدون راتب: 30 يوم')}</span>
        </div>
      )}
    </Card>
  );
}
