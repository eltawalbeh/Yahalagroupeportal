import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Briefcase, ChevronRight, RefreshCw, Info,
  Calendar, AlertCircle, CheckCircle2, Clock, Gift, Wallet
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface EntryPermissionRequestProps {
  onBack: () => void;
  onSuccess: () => void;
}

type PermissionType = 'personal' | 'work' | '';
// 'company_covered' = first personal exit ever (company pays)
// 'own_expense'     = subsequent personal exits (employee pays)
type PersonalExitKind = 'company_covered' | 'own_expense';

export function EntryPermissionRequest({ onBack, onSuccess }: EntryPermissionRequestProps) {
  const { t } = useLanguage();
  const { employee } = useAuth();

  const [permType, setPermType] = useState<PermissionType>('');
  const [date, setDate] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [reason, setReason] = useState('');
  const [workPurpose, setWorkPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Whether the employee has already used their one free company-covered personal exit this year
  const [hasUsedFreeExit, setHasUsedFreeExit] = useState(false);
  // The kind that will be submitted for personal
  const [personalKind, setPersonalKind] = useState<PersonalExitKind>('company_covered');

  useEffect(() => {
    if (employee?.id) fetchExitHistory();
  }, [employee?.id]);

  const fetchExitHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee!.id}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (!data.success) return;

      const thisYear = new Date().getFullYear();

      // Find any personal exit that was company-covered (approved or pending) this year
      const usedFree = (data.requests || []).some((r: any) => {
        if (r.type !== 'entry' || r.sub_type !== 'personal') return false;
        if (new Date(r.created_at).getFullYear() !== thisYear) return false;
        if (r.status === 'rejected') return false;
        try {
          const notes = JSON.parse(r.notes || '{}');
          return notes.kind === 'company_covered';
        } catch {
          // Legacy: if no kind field, count any approved personal exit as free exit used
          return r.status === 'approved';
        }
      });

      setHasUsedFreeExit(usedFree);
      // Auto-select the correct kind based on history
      setPersonalKind(usedFree ? 'own_expense' : 'company_covered');
    } catch (e) {
      console.error('Error fetching exit history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetForm = () => {
    setDate('');
    setExitTime('');
    setReturnTime('');
    setReason('');
    setWorkPurpose('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!permType) {
      toast.error(t('Please select the exit type', 'يرجى تحديد نوع الخروج'));
      return;
    }
    if (!date) {
      toast.error(t('Please select the exit date', 'يرجى تحديد تاريخ الخروج'));
      return;
    }

    if (permType === 'personal' && !reason.trim()) {
      toast.error(t('Please provide a reason for the personal exit', 'يرجى ذكر سبب الخروج الشخصي'));
      return;
    }
    if (permType === 'work' && !workPurpose.trim()) {
      toast.error(t('Please specify the exact purpose of the work exit', 'يرجى تحديد غرض الخروج للعمل بدقة'));
      return;
    }

    setIsLoading(true);
    try {
      const notesObj =
        permType === 'personal'
          ? { kind: personalKind, reason }
          : { purpose: workPurpose };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            employee_id: employee?.id,
            type: 'entry',
            sub_type: permType,
            start_date: date,
            end_date: date,
            start_time: exitTime || null,
            end_time: returnTime || null,
            notes: JSON.stringify(notesObj),
            status: 'pending',
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(t('Exit request submitted successfully!', 'تم تقديم طلب الخروج والعودة بنجاح!'));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[#00A89C]/5 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ms-2">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('Back', 'رجوع')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00A89C]/10 flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-[#00A89C]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('Exit & Return Permission', 'إذن خروج وعودة')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('Select exit type and complete the details', 'حدد نوع الخروج وأكمل البيانات')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Step 1: Exit Type ── */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
              {t('1. Exit Type', '٢. نوع الخروج')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Personal Exit */}
              <button
                type="button"
                onClick={() => { setPermType('personal'); resetForm(); }}
                className={`p-5 rounded-xl border-2 text-start transition-all duration-200 ${
                  permType === 'personal'
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-md'
                    : 'border-border bg-muted/20 hover:border-violet-300 hover:bg-violet-50/40 dark:hover:bg-violet-950/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  {permType === 'personal' && <CheckCircle2 className="w-5 h-5 text-violet-500" />}
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {t('Personal Exit', 'خروج شخصي')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Personal reasons — linked to annual leave', 'لأغراض شخصية — مرتبط بالإجازة السنوية')}
                </p>
                {!loadingHistory && (
                  <div className={`mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5 text-[10px] font-medium ${hasUsedFreeExit ? 'text-red-500' : 'text-violet-600 dark:text-violet-400'}`}>
                    {hasUsedFreeExit
                      ? <><AlertCircle className="w-3 h-3" /> {t('Free exit used — next at your expense', 'الخروج المجاني مستخدَم — التالي على حسابك')}</>
                      : <><Gift className="w-3 h-3" /> {t('1 free exit available (company-covered)', 'خروج مجاني متاح (على الشركة)')} </>
                    }
                  </div>
                )}
              </button>

              {/* Work Exit */}
              <button
                type="button"
                onClick={() => { setPermType('work'); resetForm(); }}
                className={`p-5 rounded-xl border-2 text-start transition-all duration-200 ${
                  permType === 'work'
                    ? 'border-[#00A89C] bg-[#00A89C]/5 dark:bg-[#00A89C]/10 shadow-md'
                    : 'border-border bg-muted/20 hover:border-[#00A89C]/40 hover:bg-[#00A89C]/5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-[#00A89C]/10">
                    <Briefcase className="w-5 h-5 text-[#00A89C]" />
                  </div>
                  {permType === 'work' && <CheckCircle2 className="w-5 h-5 text-[#00A89C]" />}
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {t('Work Exit', 'خروج للعمل')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Company mission — manager authorization', 'مهمة للشركة — بتصريح المدير')}
                </p>
                <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-[#00A89C] font-medium">
                  {t('Must specify exact purpose', 'يجب تحديد الغرض بدقة')}
                </div>
              </button>
            </div>
          </div>

          {/* ── Personal Exit Details ── */}
          {permType === 'personal' && (
            <>
              {/* Policy / Status Banner */}
              {loadingHistory ? (
                <div className="rounded-xl p-4 bg-muted/30 border border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('Checking your exit history...', 'جاري التحقق من سجل الخروجات...')}
                </div>
              ) : !hasUsedFreeExit ? (
                /* Free exit available */
                <div className="rounded-xl p-4 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 shrink-0">
                      <Gift className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-violet-700 dark:text-violet-300 text-sm">
                        {t('Company-Covered Exit — Available', 'خروج مغطى من الشركة — متاح')}
                      </p>
                      <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-1">
                        {t(
                          'You are entitled to one personal exit linked to your annual leave, covered by the company. This is a one-time benefit per year.',
                          'يحق لك خروج شخصي واحد مرتبط بإجازتك السنوية تتكفل به الشركة. هذا المزيد مرة واحدة فقط في السنة.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Free exit already used */
                <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                      <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
                        {t('Exit at Your Own Expense', 'خروج على حسابك الخاص')}
                      </p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                        {t(
                          'You have already used your one company-covered personal exit this year. Any additional personal exits will be deducted from your salary.',
                          'لقد استخدمت خروجك الشخصي المجاني لهذا العام. أي خروج شخصي إضافي سيُخصم من راتبك.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Reason */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('2. Exit Details', '٢. تفاصيل الخروج')}
                </h2>
                <div>
                  <Label className="mb-2 block">
                    {t('Reason for Personal Exit', 'سبب الخروج الشخصي')}
                    <span className="text-destructive ms-1">*</span>
                  </Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t(
                      'Explain why you need to exit during working hours...',
                      'وضِّح سبب حاجتك للخروج خلال ساعات الدوام...'
                    )}
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Work Exit Details ── */}
          {permType === 'work' && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t('2. Work Exit Details', '٢. تفاصيل الخروج للعمل')}
              </h2>

              {/* Policy note */}
              <div className="rounded-xl p-3 bg-[#00A89C]/5 border border-[#00A89C]/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#00A89C] shrink-0 mt-0.5" />
                <p className="text-xs text-[#007a71] dark:text-[#33c5bb]">
                  {t(
                    'Work exits are company-sanctioned and authorized by your manager. Specify the purpose and destination clearly — this information will appear in the approval record.',
                    'الخروج للعمل معتمد من الشركة ويصرح به المدير. حدِّد الغرض والجهة بوضوح — ستظهر هذه المعلومات في سجل الاعتماد.'
                  )}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">
                  {t('Purpose & Destination (be specific)', 'الغرض والجهة المُتوجَّه إليها (بدقة)')}
                  <span className="text-destructive ms-1">*</span>
                </Label>
                <Textarea
                  value={workPurpose}
                  onChange={(e) => setWorkPurpose(e.target.value)}
                  placeholder={t(
                    'e.g., Delivering contract documents to Ministry of Commerce, Al-Riyadh branch — meeting with procurement officer.',
                    'مثال: تسليم وثائق عقد لوزارة التجارة، فرع الرياض — اجتماع مع مسؤول المشتريات.'
                  )}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t(
                    'Please be as specific as possible. Vague purposes may delay approval.',
                    'كن محدداً قدر الإمكان. الأغراض المبهمة قد تؤخر الموافقة.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Date & Time (shown for both types) ── */}
          {permType && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {permType === 'personal'
                  ? t('3. Date & Time', '٣. التاريخ والوقت')
                  : t('3. Date & Time', '٣. التاريخ والوقت')}
              </h2>

              {/* Date */}
              <div>
                <Label className="mb-2 block">
                  <Calendar className="w-4 h-4 inline me-1.5" />
                  {t('Exit Date', 'تاريخ الخروج')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">
                    <Clock className="w-3.5 h-3.5 inline me-1.5" />
                    {t('Exit Time', 'وقت الخروج')}
                  </Label>
                  <Input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">
                    <Clock className="w-3.5 h-3.5 inline me-1.5" />
                    {t('Expected Return Time', 'وقت العودة المتوقع')}
                  </Label>
                  <Input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Duration display */}
              {exitTime && returnTime && exitTime < returnTime && (
                <div className="rounded-lg p-3 bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  {(() => {
                    const [h1, m1] = exitTime.split(':').map(Number);
                    const [h2, m2] = returnTime.split(':').map(Number);
                    const totalMin = h2 * 60 + m2 - h1 * 60 - m1;
                    const hrs = Math.floor(totalMin / 60);
                    const mins = totalMin % 60;
                    const durationEn = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
                    const durationAr = hrs > 0 ? `${hrs} ساعة ${mins > 0 ? `و${mins} دقيقة` : ''}` : `${mins} دقيقة`;
                    return t(`Expected duration: ${durationEn.trim()}`, `المدة المتوقعة: ${durationAr.trim()}`);
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="h-11">
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !permType ||
                !date ||
                (permType === 'personal' && !reason.trim()) ||
                (permType === 'work' && !workPurpose.trim())
              }
              className="h-11 px-8 shadow-md text-white"
              style={{ backgroundColor: '#00A89C' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                  {t('Submitting...', 'جاري الإرسال...')}
                </>
              ) : (
                <>
                  {t('Submit Exit Request', 'تقديم طلب الخروج')}
                  <ChevronRight className="w-4 h-4 ms-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}