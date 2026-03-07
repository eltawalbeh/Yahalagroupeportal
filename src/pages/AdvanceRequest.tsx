import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, DollarSign, Info, AlertCircle, ChevronRight, RefreshCw, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AdvanceRequestProps {
  onBack: () => void;
  onSuccess: () => void;
}

const MAX_MULTIPLIER = 1.5;

export function AdvanceRequest({ onBack, onSuccess }: AdvanceRequestProps) {
  const { t } = useLanguage();
  const { employee } = useAuth();

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [salary, setSalary] = useState<number | null>(null);
  const [loadingSalary, setLoadingSalary] = useState(true);
  const [pendingAdvance, setPendingAdvance] = useState(0);

  useEffect(() => {
    if (employee?.id) fetchEmployeeData();
  }, [employee?.id]);

  const fetchEmployeeData = async () => {
    setLoadingSalary(true);
    try {
      // Use the employee's own data from auth context for salary (no admin call needed)
      // Only fetch request history to calculate advances taken this month
      const [reqRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee!.id}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        ),
      ]);

      // Salary comes directly from the authenticated employee object (already available in context)
      if (employee?.salary) setSalary(parseFloat(String(employee.salary)));

      const reqData = await reqRes.json();
      if (reqData.success) {
        const advances = (reqData.requests || []).filter((r: any) => r.type === 'advance' && r.status === 'pending');
        const total = advances.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
        setPendingAdvance(total);
      }
    } catch (e) {
      console.error('Error fetching employee data:', e);
    } finally {
      setLoadingSalary(false);
    }
  };

  const maxAllowed = useMemo(() => (salary ? salary * MAX_MULTIPLIER : null), [salary]);
  const amountNum = parseFloat(amount) || 0;
  const percentage = maxAllowed && maxAllowed > 0 ? Math.min(100, (amountNum / maxAllowed) * 100) : 0;
  const isOverLimit = maxAllowed !== null && amountNum > maxAllowed;
  const isValid = amountNum > 0 && !isOverLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amountNum <= 0) {
      toast.error(t('Please enter a valid amount', 'يرجى إدخال مبلغ صحيح'));
      return;
    }
    if (isOverLimit) {
      toast.error(t(
        `Maximum advance is ${maxAllowed?.toLocaleString()} SAR (1.5× salary)`,
        `الحد الأقصى للسلفة هو ${maxAllowed?.toLocaleString()} ر.س (راتب ونصف)`
      ));
      return;
    }
    if (!reason.trim()) {
      toast.error(t('Please provide a reason for the advance request', 'يرجى ذكر سبب طلب السلفة'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            employee_id: employee?.id,
            type: 'advance',
            amount: amountNum,
            notes: reason,
            status: 'pending',
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(t('Advance request submitted successfully!', 'تم تقديم طلب السلفة بنجاح!'));
        onSuccess();
      } else {
        throw new Error('Submit failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to submit request. Please try again.', 'فشل تقديم الطلب. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsLoading(false);
    }
  };

  const getBarColor = () => {
    if (percentage >= 90) return '#DC2626';
    if (percentage >= 70) return '#F59E0B';
    return '#7AC143';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[#7AC143]/5 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ms-2">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('Back', 'رجوع')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7AC143]/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#7AC143]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('Advance Request', 'طلب سلفة مالية')}</h1>
              <p className="text-sm text-muted-foreground">{t('Maximum: 1.5× monthly salary', 'الحد الأقصى: راتب ونصف')}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Salary & Limit Card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
              {t('1. Advance Limits', '٢. حدود السلفة')}
            </h2>

            {loadingSalary ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('Loading salary data...', 'جاري تحميل بيانات الراتب...')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/60 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('Monthly Salary', 'الراتب الشهري')}</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                    {salary ? `${salary.toLocaleString()} ${t('SAR', 'ر.س')}` : t('N/A', 'غير متوفر')}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#7AC143]/10 border border-[#7AC143]/20 text-center">
                  <p className="text-xs text-[#5ea32e] dark:text-[#9fd65e] mb-1">{t('Max Advance', 'الحد الأقصى للسلفة')}</p>
                  <p className="text-lg font-bold text-[#5ea32e] dark:text-[#9fd65e]">
                    {maxAllowed ? `${maxAllowed.toLocaleString()} ${t('SAR', 'ر.س')}` : t('Not set', 'غير محدد')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t('× 1.5 salary', '× 1.5 راتب')}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">{t('Pending Advances', 'سلف معلقة')}</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {pendingAdvance > 0 ? `${pendingAdvance.toLocaleString()} ${t('SAR', 'ر.س')}` : t('None', 'لا يوجد')}
                  </p>
                </div>
              </div>
            )}

            {/* Policy note */}
            <div className="mt-4 rounded-xl p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {t(
                  'Per company policy, advances up to 1.5× monthly salary are permitted. A clear reason is required.',
                  'وفق سياسة الشركة، يُسمح بسلفة تصل إلى راتب ونصف (1.5×) كحد أقصى. ويُشترط وجود سبب واضح.'
                )}
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {t('2. Advance Amount', '٢. قيمة السلفة')}
            </h2>

            <div>
              <Label className="mb-2 block">
                {t('Requested Amount', 'المبلغ المطلوب')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={`h-14 text-xl font-bold ps-4 pe-16 ${isOverLimit ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
                <span className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {t('SAR', 'ر.س')}
                </span>
              </div>
            </div>

            {/* Visual amount bar */}
            {maxAllowed && amountNum > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span className={isOverLimit ? 'text-red-500 font-semibold' : 'text-[#5ea32e] font-semibold'}>
                    {isOverLimit
                      ? t(`Exceeds limit by ${(amountNum - maxAllowed).toLocaleString()} SAR`, `تجاوز الحد بـ ${(amountNum - maxAllowed).toLocaleString()} ر.س`)
                      : t(`${(maxAllowed - amountNum).toLocaleString()} SAR remaining`, `${(maxAllowed - amountNum).toLocaleString()} ر.س متبقية`)}
                  </span>
                  <span>{maxAllowed.toLocaleString()} {t('SAR', 'ر.س')}</span>
                </div>
                <div className="h-3 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, percentage)}%`, backgroundColor: getBarColor() }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isOverLimit ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {t('Amount exceeds the allowed limit', 'المبلغ يتجاوز الحد المسموح به')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4 text-[#7AC143]" />
                      {t(`${percentage.toFixed(0)}% of max limit`, `${percentage.toFixed(0)}% من الحد الأقصى`)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick select buttons */}
            {salary && maxAllowed && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('Quick select:', 'اختيار سريع:')}</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { mult: 0.25, labelEn: '25%', labelAr: '25%' },
                    { mult: 0.5, labelEn: '50%', labelAr: '50%' },
                    { mult: 0.75, labelEn: '75%', labelAr: '75%' },
                    { mult: 1, labelEn: 'Full salary', labelAr: 'راتب كامل' },
                    { mult: 1.5, labelEn: '1.5× salary', labelAr: 'راتب ونصف' },
                  ].map(({ mult, labelEn, labelAr }) => {
                    const val = Math.floor(salary * mult);
                    return (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setAmount(val.toString())}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          amountNum === val
                            ? 'bg-[#7AC143] text-white border-[#7AC143]'
                            : 'border-border bg-muted/30 hover:bg-muted/60'
                        }`}
                      >
                        {t(labelEn, labelAr)}
                        <span className="block text-[10px] opacity-70">{val.toLocaleString()} {t('SAR', 'ر.س')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {t('3. Reason', '٣. سبب الطلب')}
            </h2>
            <div>
              <Label className="mb-2 block">
                {t('Reason for Advance', 'سبب طلب السلفة')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('e.g., emergency, medical expenses, rent...', 'مثال: ظروف طارئة، مصاريف طبية، إيجار...')}
                rows={4}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="h-11">
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isValid || !reason.trim()}
              className="h-11 px-8 shadow-md bg-[#7AC143] hover:bg-[#5ea32e] text-white"
            >
              {isLoading ? (
                <><RefreshCw className="w-4 h-4 me-2 animate-spin" />{t('Submitting...', 'جاري الإرسال...')}</>
              ) : (
                <>{t('Submit Advance Request', 'تقديم طلب السلفة')}<ChevronRight className="w-4 h-4 ms-2" /></>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}