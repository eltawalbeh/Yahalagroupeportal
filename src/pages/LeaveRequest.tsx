import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Upload, Clock, Calendar, Stethoscope, BanknoteIcon,
  AlertCircle, CheckCircle2, Info, ChevronRight, RefreshCw, Lock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LeaveRequestProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface LeaveUsage {
  annual_used: number;
  annual_pending: number;
  sick_used: number;
  sick_pending: number;
  emergency_used: number;
  emergency_pending: number;
  unpaid_used: number;
  unpaid_pending: number;
  hourly_used_this_month: number;
  hourly_pending_this_month: number;
}

const LIMITS = {
  annual: 30,
  sick: 14,
  emergency: 5,
  unpaid: 30,
  hourly: 6,
};

const LEAVE_TYPES = [
  {
    id: 'hourly',
    icon: Clock,
    color: '#7C3AED',
    label: 'Hourly Leave',
    labelAr: 'إجازة ساعية',
    limitLabel: '6 hours / month',
    limitLabelAr: '6 ساعات / شهرياً',
  },
  {
    id: 'annual',
    icon: Calendar,
    color: '#006B7D',
    label: 'Annual Leave',
    labelAr: 'إجازة سنوية',
    limitLabel: '30 days / year',
    limitLabelAr: '30 يوماً / سنوياً',
  },
  {
    id: 'sick',
    icon: Stethoscope,
    color: '#DC2626',
    label: 'Sick Leave',
    labelAr: 'إجازة مرضية',
    limitLabel: '14 days / year (by law)',
    limitLabelAr: '14 يوماً / سنوياً (نظام)',
  },
  {
    id: 'emergency',
    icon: AlertCircle,
    color: '#EA580C',
    label: 'Emergency Leave',
    labelAr: 'إجازة طارئة',
    limitLabel: '5 days / year (Art. 113)',
    limitLabelAr: '5 أيام / سنوياً (مادة ٢١٣)',
  },
  {
    id: 'unpaid',
    icon: BanknoteIcon,
    color: '#92400E',
    label: 'Unpaid Leave',
    labelAr: 'إجازة بدون راتب',
    limitLabel: '30 days / year',
    limitLabelAr: '30 يوماً / سنوياً',
  },
];

function calcHours(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export function LeaveRequest({ onBack, onSuccess }: LeaveRequestProps) {
  const { t } = useLanguage();
  const { employee } = useAuth();

  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [medicalReport, setMedicalReport] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<LeaveUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    if (employee?.id) fetchUsage();
  }, [employee?.id]);

  const fetchUsage = async () => {
    setLoadingUsage(true);
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
        list.reduce((acc: number, r: any) => {
          if (!r.start_date || !r.end_date) return acc;
          const s = new Date(r.start_date);
          const e = new Date(r.end_date);
          return acc + Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }, 0);

      const byType = (type: string, status: string) =>
        leaves.filter((r: any) => {
          const matches = r.sub_type === type && r.status === status;
          return matches && new Date(r.created_at).getFullYear() === thisYear;
        });

      const hourlyThisMonth = (status: string) =>
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
          .reduce((acc: number, r: any) => {
            if (r.start_time && r.end_time) acc += calcHours(r.start_time, r.end_time);
            return acc;
          }, 0);

      setUsage({
        annual_used: sumDays(byType('annual', 'approved')),
        annual_pending: sumDays(byType('annual', 'pending')),
        sick_used: sumDays(byType('sick', 'approved')),
        sick_pending: sumDays(byType('sick', 'pending')),
        emergency_used: sumDays(byType('emergency', 'approved')),
        emergency_pending: sumDays(byType('emergency', 'pending')),
        unpaid_used: sumDays(byType('unpaid', 'approved')),
        unpaid_pending: sumDays(byType('unpaid', 'pending')),
        hourly_used_this_month: hourlyThisMonth('approved'),
        hourly_pending_this_month: hourlyThisMonth('pending'),
      });
    } catch (e) {
      console.error('Error fetching leave usage:', e);
    } finally {
      setLoadingUsage(false);
    }
  };

  const remaining = useMemo(() => {
    if (!usage) return null;
    if (leaveType === 'hourly') return Math.max(0, LIMITS.hourly - usage.hourly_used_this_month - usage.hourly_pending_this_month);
    if (leaveType === 'annual') return Math.max(0, LIMITS.annual - usage.annual_used - usage.annual_pending);
    if (leaveType === 'sick') return Math.max(0, LIMITS.sick - usage.sick_used - usage.sick_pending);
    if (leaveType === 'emergency') return Math.max(0, LIMITS.emergency - usage.emergency_used - usage.emergency_pending);
    if (leaveType === 'unpaid') return Math.max(0, LIMITS.unpaid - usage.unpaid_used - usage.unpaid_pending);
    return null;
  }, [usage, leaveType]);

  const requestedHours = useMemo(() => {
    if (leaveType !== 'hourly' || !startTime || !endTime) return 0;
    return calcHours(startTime, endTime);
  }, [leaveType, startTime, endTime]);

  const requestedDays = useMemo(() => {
    if (leaveType === 'hourly' || !startDate || !endDate) return 0;
    return calcDays(startDate, endDate);
  }, [leaveType, startDate, endDate]);

  const selectedType = LEAVE_TYPES.find((tp) => tp.id === leaveType);

  // ── Annual leave eligibility: must complete 1 year from hire date ─────────
  const annualLeaveEligibility = useMemo(() => {
    const hireDate = employee?.hire_date;
    if (!hireDate) return { eligible: true, eligibleDate: null, daysRemaining: 0 }; // No hire date = allow (admin hasn't set it)
    const hire = new Date(hireDate);
    const eligibleDate = new Date(hire);
    eligibleDate.setFullYear(eligibleDate.getFullYear() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eligibleDate.setHours(0, 0, 0, 0);
    const eligible = today >= eligibleDate;
    const daysRemaining = eligible ? 0 : Math.ceil((eligibleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { eligible, eligibleDate, daysRemaining };
  }, [employee?.hire_date]);

  // ── 30-day soft warning for annual leave ─────────────────────────────────
  const isWithin30Days = useMemo(() => {
    if (leaveType !== 'annual' || !startDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 30;
  }, [leaveType, startDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setMedicalReport(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType || !startDate) {
      toast.error(t('Please fill in all required fields', 'يرجى ملء جميع الحقول المطلوبة'));
      return;
    }
    if (leaveType === 'hourly') {
      if (!startTime || !endTime) {
        toast.error(t('Please select start and end times', 'يرجى تحديد وقت البدء والانتهاء'));
        return;
      }
      if (startTime >= endTime) {
        toast.error(t('End time must be after start time', 'وقت الانتهاء يجب أن يكون بعد وقت البدء'));
        return;
      }
      if (requestedHours <= 0) {
        toast.error(t('Invalid leave duration', 'مدة الإجازة غير صحيحة'));
        return;
      }
      if (remaining !== null && requestedHours > remaining) {
        toast.error(t(`Insufficient balance. Available: ${remaining.toFixed(1)} hours this month`, `لا يوجد رصيد كافٍ. المتاح: ${remaining.toFixed(1)} ساعة هذا الشهر`));
        return;
      }
    } else {
      if (!endDate) {
        toast.error(t('Please select an end date', 'يرجى تحديد تاريخ الانتهاء'));
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        toast.error(t('End date must be after start date', 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء'));
        return;
      }
      if (remaining !== null && requestedDays > remaining) {
        toast.error(t(`Insufficient balance. Available: ${remaining} days`, `لا يوجد رصيد كافٍ. المتاح: ${remaining} يوم`));
        return;
      }
    }
    if (leaveType === 'sick' && !reason.trim()) {
      toast.error(t('Please provide a reason for sick leave', 'يرجى ذكر سبب الإجازة المرضية'));
      return;
    }
    if (leaveType === 'emergency' && !reason.trim()) {
      toast.error(t('Please provide a reason for emergency leave', 'يرجى ذكر سبب الإجازة الطارئة'));
      return;
    }

    setIsLoading(true);
    try {
      let medicalReportUrl = '';
      if (medicalReport) {
        const formData = new FormData();
        formData.append('file', medicalReport);
        formData.append('employee_id', employee?.id.toString() || '');
        const uploadRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/upload/medical-report`,
          { method: 'POST', headers: { Authorization: `Bearer ${publicAnonKey}` }, body: formData }
        );
        const uploadData = await uploadRes.json();
        if (uploadData.success) medicalReportUrl = uploadData.url;
      }

      const body: any = {
        employee_id: employee?.id,
        type: 'leave',
        sub_type: leaveType,
        start_date: startDate,
        end_date: leaveType === 'hourly' ? startDate : endDate,
        notes: reason || null,
        medical_report_url: medicalReportUrl || null,
        status: 'pending',
      };
      if (leaveType === 'hourly') {
        body.start_time = startTime;
        body.end_time = endTime;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(t('Leave request submitted successfully!', 'تم تقديم طلب الإجازة بنجاح!'));
        onSuccess();
      } else {
        // Show server-provided error (e.g. annual leave eligibility)
        const msg = data.message || data.messageAr;
        toast.error(msg || t('Failed to submit request. Please try again.', 'ف��ل تقديم الطلب. يرجى المحاولة مرة أخرى.'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to submit request. Please try again.', 'فشل تقديم الطلب. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsLoading(false);
    }
  };

  const getUsageInfo = (typeId: string) => {
    if (!usage) return null;
    if (typeId === 'hourly') return { used: usage.hourly_used_this_month, pending: usage.hourly_pending_this_month, total: LIMITS.hourly, isHourly: true };
    if (typeId === 'annual') return { used: usage.annual_used, pending: usage.annual_pending, total: LIMITS.annual, isHourly: false };
    if (typeId === 'sick') return { used: usage.sick_used, pending: usage.sick_pending, total: LIMITS.sick, isHourly: false };
    if (typeId === 'emergency') return { used: usage.emergency_used, pending: usage.emergency_pending, total: LIMITS.emergency, isHourly: false };
    if (typeId === 'unpaid') return { used: usage.unpaid_used, pending: usage.unpaid_pending, total: LIMITS.unpaid, isHourly: false };
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ms-2">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('Back', 'رجوع')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#006B7D]/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#006B7D]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('Leave Request', 'طلب إجازة')}</h1>
              <p className="text-sm text-muted-foreground">{t('Choose leave type and complete the details', 'اختر نوع الإجازة وأكمل البيانات')}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Step 1: Type Cards */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
              {t('1. Leave Type', '٢. نوع الإجازة')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {LEAVE_TYPES.map((type) => {
                const info = getUsageInfo(type.id);
                const rem = info ? Math.max(0, info.total - info.used - info.pending) : null;
                const isSelected = leaveType === type.id;
                const Icon = type.icon;
                const isAnnualLocked = type.id === 'annual' && !annualLeaveEligibility.eligible;
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={isAnnualLocked}
                    onClick={() => {
                      if (isAnnualLocked) return;
                      setLeaveType(type.id);
                      setStartDate(''); setEndDate(''); setStartTime(''); setEndTime(''); setReason('');
                    }}
                    className={`relative p-4 rounded-xl border-2 text-start transition-all duration-200 ${isAnnualLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    style={
                      isSelected
                        ? { borderColor: type.color, backgroundColor: `${type.color}14` }
                        : { borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }
                    }
                  >
                    {/* Lock overlay for ineligible annual leave */}
                    {isAnnualLocked && (
                      <div className="absolute top-2 end-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${type.color}20` }}>
                        <Icon className="w-4 h-4" style={{ color: isAnnualLocked ? 'var(--muted-foreground)' : type.color }} />
                      </div>
                      {isSelected && !isAnnualLocked && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: type.color }} />}
                    </div>
                    <p className="font-semibold text-sm leading-tight">
                      {t(type.label, type.labelAr)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isAnnualLocked
                        ? t(
                            `Eligible after ${annualLeaveEligibility.eligibleDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                            `متاح بعد ${annualLeaveEligibility.eligibleDate?.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          )
                        : t(type.limitLabel, type.limitLabelAr)
                      }
                    </p>
                    {isAnnualLocked && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          {t(`${annualLeaveEligibility.daysRemaining} days remaining`, `${annualLeaveEligibility.daysRemaining} يوم متبقي`)}
                        </p>
                      </div>
                    )}
                    {!isAnnualLocked && info && !loadingUsage && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">{t('Available', 'المتاح')}</span>
                          <span className="font-bold" style={{ color: rem === 0 ? '#DC2626' : type.color }}>
                            {rem !== null
                              ? `${info.isHourly ? rem.toFixed(1) : rem} ${info.isHourly ? t('hr', 'س') : t('d', 'ي')}`
                              : '—'}
                          </span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-border/60">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{
                              width: `${info.total > 0 ? Math.min(100, ((info.total - (rem || 0)) / info.total) * 100) : 0}%`,
                              backgroundColor: type.color,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Annual leave eligibility notice */}
            {!annualLeaveEligibility.eligible && annualLeaveEligibility.eligibleDate && (
              <div className="mt-4 rounded-xl p-4 flex items-start gap-3 border border-sky-200 bg-sky-50 dark:border-sky-800/50 dark:bg-sky-950/20">
                <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
                    {t('Annual Leave — Not Yet Eligible', 'الإجازة السنوية — لم يحن موعد الاستحقاق')}
                  </p>
                  <p className="text-sm text-sky-700 dark:text-sky-400 leading-relaxed">
                    {t(
                      `Per Saudi Labor Law (Article 109), annual leave eligibility begins after completing one full year of service. You will be eligible on ${annualLeaveEligibility.eligibleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} — only ${annualLeaveEligibility.daysRemaining} days away! In the meantime, you can still request other leave types.`,
                      `وفقاً لنظام العمل السعودي (المادة 109)، يبدأ استحقاق الإجازة السنوية بعد إكمال سنة كاملة من الخدمة. ستكون مؤهلاً في ${annualLeaveEligibility.eligibleDate.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} — بقي فقط ${annualLeaveEligibility.daysRemaining} يوم! في هذه الأثناء، يمكنك طلب أنواع الإجازات الأخرى.`
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Policy Info + Date/Time */}
          {leaveType && (
            <>
              {/* Policy Banner */}
              <div
                className="rounded-xl p-4 flex items-start gap-3 border"
                style={{ backgroundColor: `${selectedType?.color}0d`, borderColor: `${selectedType?.color}30` }}
              >
                <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: selectedType?.color }} />
                <div className="text-sm" style={{ color: selectedType?.color }}>
                  {leaveType === 'hourly' && t(
                    'Hourly leave is capped at 6 hours/month. Duration is auto-calculated from start and end times.',
                    'الإجازة الساعية بحد أقصى 6 ساعات شهرياً. سيتم احتساب المدة تلقائياً من وقت البدء والانتهاء.'
                  )}
                  {leaveType === 'annual' && t(
                    'Your annual balance is 30 days for all employees. Leave is automatically deducted upon approval.',
                    'رصيدك السنوي 30 يوماً للجميع (القانون: 21 يوماً لمن أتم السنة، 30 لمن أتم 5 سنوات — نمنح 30 يوماً للجميع). تُخصم الإجازة تلقائياً عند الموافقة.'
                  )}
                  {leaveType === 'sick' && t(
                    'Sick leave is 14 days/year per labor law. A medical report is required to complete the request.',
                    'الإجازة المرضية 14 يوماً سنوياً وفق نظام العمل. يُشترط إرفاق التقرير الطبي لإتمام الطلب.'
                  )}
                  {leaveType === 'emergency' && t(
                    'Emergency leave is 5 days/year per Saudi Labor Law (Article 113). You must provide a reason for the emergency.',
                    'الإجازة الطارئة 5 أيام سنوياً وفق نظام العمل السعودي (المادة 113). يجب ذكر سبب الحالة الطارئة.'
                  )}
                  {leaveType === 'unpaid' && t(
                    'Unpaid leave maximum is 30 days/year. Absent days will be deducted from salary.',
                    'الإجازة بدون راتب بحد أقصى 30 يوماً سنوياً. سيتم خصم أيام الغياب من الراتب.'
                  )}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('2. Date & Time', '٢. التاريخ والوقت')}
                </h2>

                {leaveType === 'hourly' ? (
                  <>
                    <div>
                      <Label className="mb-2 block">
                        {t('Leave Date', 'تاريخ الإجازة')} <span className="text-destructive">*</span>
                      </Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11" min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">{t('From', 'من')} <span className="text-destructive">*</span></Label>
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11" />
                      </div>
                      <div>
                        <Label className="mb-2 block">{t('To', 'إلى')} <span className="text-destructive">*</span></Label>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11" />
                      </div>
                    </div>
                    {startTime && endTime && requestedHours > 0 && (
                      <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: `${selectedType?.color}10` }}>
                        <Clock className="w-4 h-4" style={{ color: selectedType?.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: selectedType?.color }}>
                            {t(`Duration: ${requestedHours.toFixed(1)} hours`, `المدة: ${requestedHours.toFixed(1)} ساعة`)}
                          </p>
                          {remaining !== null && (
                            <p className="text-xs text-muted-foreground">
                              {t(`Available this month: ${remaining.toFixed(1)} hours`, `الرصيد المتاح هذا الشهر: ${remaining.toFixed(1)} ساعة`)}
                            </p>
                          )}
                        </div>
                        {remaining !== null && requestedHours > remaining && (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">{t('Start Date', 'تاريخ البدء')} <span className="text-destructive">*</span></Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11" min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div>
                        <Label className="mb-2 block">{t('End Date', 'تاريخ الانتهاء')} <span className="text-destructive">*</span></Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11" min={startDate || new Date().toISOString().split('T')[0]} />
                      </div>
                    </div>
                    {requestedDays > 0 && (
                      <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: `${selectedType?.color}10` }}>
                        <Calendar className="w-4 h-4" style={{ color: selectedType?.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: selectedType?.color }}>
                            {t(`Requesting: ${requestedDays} day${requestedDays > 1 ? 's' : ''}`, `الطلب: ${requestedDays} يوم`)}
                          </p>
                          {remaining !== null && (
                            <p className="text-xs text-muted-foreground">
                              {t(`Available balance: ${remaining} days`, `الرصيد المتاح: ${remaining} يوم`)}
                            </p>
                          )}
                        </div>
                        {remaining !== null && requestedDays > remaining && (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </div>
                    )}

                    {/* ── 30-day soft warning for annual leave ─────────────────── */}
                    {isWithin30Days && (
                      <div className="rounded-xl p-4 flex items-start gap-3 border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {t('Notice — Short Lead Time', 'تنبيه — وقت الإشعار قصير')}
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                            {t(
                              'Annual leave requests are typically submitted at least 30 days in advance. Your selected start date is less than 30 days from today. You may still submit this request, but approval may take longer.',
                              'يُنصح بتقديم طلبات الإجازة السنوية قبل 30 يوماً على الأقل. تاريخ البدء الذي اخترته أقل من 30 يوماً من اليوم. يمكنك تقديم الطلب، لكن قد يستغرق الاعتماد وقتاً أطول.'
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 3: Additional Details */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('3. Additional Details', '٣. التفاصيل الإضافية')}
                </h2>

                {(leaveType === 'sick' || leaveType === 'unpaid' || leaveType === 'annual' || leaveType === 'emergency') && (
                  <div>
                    <Label className="mb-2 block">
                      {t('Reason', 'السبب')}
                      {(leaveType === 'sick' || leaveType === 'emergency') && <span className="text-destructive ms-1">*</span>}
                    </Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={
                        leaveType === 'sick'
                          ? t('Describe the illness', 'صف الحالة المرضية')
                          : leaveType === 'emergency'
                          ? t('Describe the emergency situation', 'صف الحالة الطارئة')
                          : leaveType === 'unpaid'
                          ? t('Reason for unpaid leave', 'سبب طلب الإجازة بدون راتب')
                          : t('Additional notes (optional)', 'ملاحظات إضافية (اختياري)')
                      }
                      rows={3}
                    />
                  </div>
                )}

                {leaveType === 'hourly' && (
                  <div>
                    <Label className="mb-2 block">{t('Notes (Optional)', 'ملاحظات (اختياري)')}</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Any additional information', 'أي معلومات إضافية')} rows={2} />
                  </div>
                )}

                {leaveType === 'sick' && (
                  <div>
                    <Label className="mb-2 block">{t('Medical Report (Required)', 'التقرير الطبي (إلزامي)')}<span className="text-destructive ms-1">*</span></Label>
                    <input id="medReport" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                    <label
                      htmlFor="medReport"
                      className="flex items-center gap-3 h-20 px-4 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {medicalReport ? medicalReport.name : t('Upload medical report', 'رفع التقرير الطبي')}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('PDF or image — max 10MB', 'PDF أو صورة — حد أقصى 10MB')}</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="h-11">
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !leaveType || !startDate}
              className="h-11 px-8 shadow-md text-white"
              style={{ backgroundColor: selectedType?.color || '#006B7D' }}
            >
              {isLoading ? (
                <><RefreshCw className="w-4 h-4 me-2 animate-spin" />{t('Submitting...', 'جاري الإرسال...')}</>
              ) : (
                <>{t('Submit Request', 'تقديم الطلب')}<ChevronRight className="w-4 h-4 ms-2" /></>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}