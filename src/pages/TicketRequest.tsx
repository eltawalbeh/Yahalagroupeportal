import React, { useState, useEffect } from 'react';
import {
  Plane, ArrowLeft, AlertCircle, CheckCircle2, Clock, Info,
  MapPin, Calendar, FileText, RefreshCw, Star, CreditCard,
  DollarSign, AlertTriangle, Lock, ChevronRight, Edit3
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TicketRequestProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface TicketBand {
  id: string;
  destination: string;
  destination_ar: string;
  country: string;
  country_ar: string;
  min_sar: number;
  max_sar: number;
}

interface TicketBalance {
  allowed: number;
  used: number;
  pending: number;
  available: number;
  special_case: number;
}

interface AnnualLeave {
  id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved';
}

type RequestSubType = 'annual_ticket' | 'reentry_visa';
type TravelDateMode = 'leave_based' | 'custom';

export function TicketRequest({ onBack, onSuccess }: TicketRequestProps) {
  const { t, language } = useLanguage();
  const { employee } = useAuth();

  const [subType, setSubType] = useState<RequestSubType | ''>('');
  const [selectedBand, setSelectedBand] = useState<TicketBand | null>(null);
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [bookingDetails, setBookingDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketAmount, setTicketAmount] = useState('');
  const [overCeiling, setOverCeiling] = useState(false);

  const [bands, setBands] = useState<TicketBand[]>([]);
  const [loadingBands, setLoadingBands] = useState(true);
  const [balance, setBalance] = useState<{ thisYear: TicketBalance; annualTicketEligible: boolean; eligibleDate: string | null } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [isSpecialCase, setIsSpecialCase] = useState(false);

  // Destination auto-match state
  const [bandMatchStatus, setBandMatchStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');

  // Travel date mode
  const [travelDateMode, setTravelDateMode] = useState<TravelDateMode>('leave_based');
  const [latestAnnualLeave, setLatestAnnualLeave] = useState<AnnualLeave | null>(null);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [customTravelDate, setCustomTravelDate] = useState('');
  const [customReturnDate, setCustomReturnDate] = useState('');

  useEffect(() => {
    fetchBands();
    if (employee?.id) {
      fetchBalance();
      fetchLatestAnnualLeave();
    }
  }, [employee?.id]);

  // Auto-lookup band by nationality
  useEffect(() => {
    const profileSpecialCase = !!(employee?.extra_info as any)?.special_case;
    if (bands.length > 0 && employee?.nationality && !selectedBand && !profileSpecialCase) {
      autoSelectBandByNationality(employee.nationality);
    }
  }, [bands, employee?.nationality]);

  useEffect(() => {
    if (balance && subType === 'annual_ticket') {
      const profileSpecialCase = !!(employee?.extra_info as any)?.special_case;
      setIsSpecialCase(!balance.annualTicketEligible || profileSpecialCase);
    } else {
      setIsSpecialCase(false);
    }
  }, [balance, subType, employee]);

  // Recompute over-ceiling whenever amount or band changes
  useEffect(() => {
    if (selectedBand && ticketAmount) {
      const amt = parseFloat(ticketAmount);
      setOverCeiling(!isNaN(amt) && amt > selectedBand.max_sar);
    } else {
      setOverCeiling(false);
    }
  }, [ticketAmount, selectedBand]);

  // When travelDateMode changes, update travelDate / returnDate accordingly
  useEffect(() => {
    if (travelDateMode === 'leave_based' && latestAnnualLeave) {
      setTravelDate(latestAnnualLeave.start_date);
      setReturnDate(latestAnnualLeave.end_date);
    } else if (travelDateMode === 'custom') {
      setTravelDate(customTravelDate);
      setReturnDate(customReturnDate);
    }
  }, [travelDateMode, latestAnnualLeave, customTravelDate, customReturnDate]);

  const autoSelectBandByNationality = async (nationality: string) => {
    setBandMatchStatus('loading');
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/ticket-band-by-nationality?nationality=${encodeURIComponent(nationality)}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success && data.band) {
        setSelectedBand(data.band);
        setBandMatchStatus('found');
      } else {
        setBandMatchStatus('not_found');
      }
    } catch (e) {
      console.error('Error auto-selecting band:', e);
      setBandMatchStatus('not_found');
    }
  };

  const fetchBands = async () => {
    setLoadingBands(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/ticket-bands`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      if (data.success) setBands(data.bands || []);
    } catch (e) { console.error('Error fetching ticket bands:', e); }
    finally { setLoadingBands(false); }
  };

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee!.id}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (!data.success) return;

      const thisYear = new Date().getFullYear();
      const ticketReqs = (data.requests || []).filter((r: any) => r.type === 'ticket');
      const used = ticketReqs.filter((r: any) => new Date(r.created_at).getFullYear() === thisYear && r.status === 'approved' && !r.deduct_from_next_year).length;
      const pending = ticketReqs.filter((r: any) => new Date(r.created_at).getFullYear() === thisYear && r.status === 'pending').length;
      const special = ticketReqs.filter((r: any) => new Date(r.created_at).getFullYear() === thisYear && r.is_special_case).length;

      let annualTicketEligible = true;
      let eligibleDate: string | null = null;
      if (employee?.hire_date) {
        const hire = new Date(employee.hire_date);
        const elig = new Date(hire); elig.setFullYear(elig.getFullYear() + 1);
        const today = new Date(); today.setHours(0,0,0,0); elig.setHours(0,0,0,0);
        annualTicketEligible = today >= elig;
        if (!annualTicketEligible) eligibleDate = elig.toISOString().split('T')[0];
      }

      setBalance({
        thisYear: { allowed: 1, used, pending, available: Math.max(0, 1 - used - pending), special_case: special },
        annualTicketEligible,
        eligibleDate
      });
    } catch (e) { console.error('Error fetching ticket balance:', e); }
    finally { setLoadingBalance(false); }
  };

  const fetchLatestAnnualLeave = async () => {
    setLoadingLeave(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee!.id}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (!data.success) return;
      const annualLeaves: AnnualLeave[] = (data.requests || [])
        .filter((r: any) => r.type === 'leave' && r.sub_type === 'annual' && ['pending', 'approved'].includes(r.status) && r.start_date)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (annualLeaves.length > 0) {
        const leave = annualLeaves[0];
        setLatestAnnualLeave(leave);
        // Default to leave-based mode and pre-fill dates
        setTravelDateMode('leave_based');
        setTravelDate(leave.start_date);
        setReturnDate(leave.end_date);
      } else {
        // No leave found — default to custom
        setTravelDateMode('custom');
      }
    } catch (e) {
      console.error('Error fetching annual leaves:', e);
      setTravelDateMode('custom');
    } finally {
      setLoadingLeave(false);
    }
  };

  const handleSubmit = async () => {
    if (!subType) { toast.error(t('Please select request type', 'يرجى اختيار نوع الطلب')); return; }
    if (subType === 'annual_ticket' && !selectedBand && bandMatchStatus !== 'not_found') {
      toast.error(t('Destination is being matched — please wait', 'جاري مطابقة الوجهة، يرجى الانتظار')); return;
    }
    if (!travelDate) { toast.error(t('Travel date is required', 'تاريخ السفر مطلوب')); return; }

    if (subType === 'annual_ticket' && travelDateMode === 'custom') {
      if (!customTravelDate) { toast.error(t('Please enter your travel date', 'يرجى إدخال تاريخ السفر')); return; }
    }

    // Check balance for annual ticket
    if (subType === 'annual_ticket' && balance && balance.thisYear.available === 0 && !isSpecialCase) {
      toast.error(t('Annual ticket for this year has already been used or is pending', 'تم استخدام التذكرة السنوية لهذا العام أو هي قيد الانتظار'));
      return;
    }

    setIsLoading(true);
    try {
      const finalTravelDate = subType === 'annual_ticket'
        ? (travelDateMode === 'leave_based' ? travelDate : customTravelDate)
        : travelDate;
      const finalReturnDate = subType === 'annual_ticket'
        ? (travelDateMode === 'leave_based' ? returnDate : customReturnDate)
        : returnDate;

      const payload: any = {
        employee_id: employee?.id,
        type: 'ticket',
        sub_type: subType,
        destination: selectedBand ? (language === 'ar' ? selectedBand.destination_ar : selectedBand.destination) : (employee?.nationality || ''),
        destination_en: selectedBand?.destination,
        destination_ar: selectedBand?.destination_ar,
        band_id: selectedBand?.id,
        max_sar: selectedBand?.max_sar,
        min_sar: selectedBand?.min_sar,
        ticket_amount: ticketAmount ? parseFloat(ticketAmount) : null,
        over_ceiling: overCeiling,
        needs_hr_review: overCeiling,
        travel_date: finalTravelDate,
        return_date: finalReturnDate || null,
        travel_date_source: subType === 'annual_ticket' ? travelDateMode : 'manual',
        linked_leave_id: subType === 'annual_ticket' && travelDateMode === 'leave_based' && latestAnnualLeave ? latestAnnualLeave.id : null,
        booking_details: bookingDetails,
        notes,
        is_special_case: isSpecialCase,
        status: 'pending'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify(payload)
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(t('Ticket request submitted successfully', 'تم تقديم طلب التذكرة بنجاح'));
        onSuccess();
      } else {
        toast.error(data.messageAr || data.message || t('Failed to submit request', 'فشل تقديم الطلب'));
      }
    } catch (e) {
      console.error('Submit error:', e);
      toast.error(t('Connection error. Please try again.', 'خطأ في الاتصال. يرجى المحاولة مجدداً.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          {t('Back', 'رجوع')}
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Plane className="w-5 h-5 text-green-600" />
            {t('Ticket Request', 'طلب تذكرة')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('Annual ticket or re-entry visa request', 'طلب تذكرة سنوية أو تأشيرة خروج وعودة')}</p>
        </div>
      </div>

      {/* Request Type Selection */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            id: 'annual_ticket' as RequestSubType,
            icon: Plane,
            label: t('Annual Ticket', 'التذكرة السنوية'),
            desc: t('Yearly flight ticket to home country', 'تذكرة سنوية للعودة إلى الوطن'),
            color: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
            activeColor: 'bg-green-100 border-green-500 dark:bg-green-900/40',
            iconColor: 'text-green-600'
          },
          {
            id: 'reentry_visa' as RequestSubType,
            icon: FileText,
            label: t('Re-Entry Visa (خروج وعودة)', 'خروج وعودة'),
            desc: t('Exit & re-entry visa request', 'طلب تأشيرة خروج وعودة'),
            color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
            activeColor: 'bg-blue-100 border-blue-500 dark:bg-blue-900/40',
            iconColor: 'text-blue-600'
          }
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setSubType(opt.id)}
            className={`text-start rounded-xl border-2 p-4 transition-all ${
              subType === opt.id ? opt.activeColor : opt.color
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <opt.icon className={`w-5 h-5 ${opt.iconColor}`} />
              <span className="font-semibold text-sm">{opt.label}</span>
              {subType === opt.id && <CheckCircle2 className={`w-4 h-4 ms-auto ${opt.iconColor}`} />}
            </div>
            <p className="text-xs text-muted-foreground">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Annual Ticket Balance */}
      {subType === 'annual_ticket' && (
        <div className={`rounded-xl border p-4 ${
          balance?.annualTicketEligible === false
            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20'
            : balance?.thisYear.available === 0
            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20'
            : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20'
        }`}>
          {loadingBalance ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" /> {t('Checking balance...', 'جارٍ التحقق من الرصيد...')}
            </div>
          ) : balance ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <p className="font-semibold text-sm">{t('Your Annual Ticket Balance', 'رصيد تذكرتك السنوية')}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('Allowed:', 'المسموح:')}</span>{' '}
                  <strong>{balance.thisYear.allowed}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('Used:', 'المستخدم:')}</span>{' '}
                  <strong className={balance.thisYear.used > 0 ? 'text-red-600' : ''}>{balance.thisYear.used}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('Available:', 'المتاح:')}</span>{' '}
                  <strong className={balance.thisYear.available > 0 ? 'text-green-600' : 'text-red-600'}>{balance.thisYear.available}</strong>
                </div>
              </div>
              {!balance.annualTicketEligible && balance.eligibleDate && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {t(
                      `You are not yet eligible for annual ticket (eligible on ${balance.eligibleDate}). Requesting now will be treated as a Special Case requiring Super Admin approval, and will be deducted from next year's ticket balance.`,
                      `لم تبلغ بعد استحقاق التذكرة السنوية (تصبح مستحقاً في ${balance.eligibleDate}). سيُعامل طلبك كحالة خاصة تستلزم موافقة المسؤول الأعلى، وسيُخصم من رصيد السنة القادمة.`
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Re-entry Visa Notice */}
      {subType === 'reentry_visa' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {t(
              'Re-entry visa request will be forwarded to HR and Super Admin for processing. You will be notified once it\'s ready.',
              'سيتم إحالة طلب تأشيرة الخروج والعودة إلى قسم الموارد البشرية والمسؤول الأعلى للمعالجة. ستتلقى إشعاراً عند الانتهاء.'
            )}
          </p>
        </div>
      )}

      {/* Form Fields */}
      {subType && (
        <div className="border rounded-xl bg-card p-5 space-y-5">

          {/* ── DESTINATION (Annual Ticket only) — Auto-matched & Locked ── */}
          {subType === 'annual_ticket' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {t('Destination', 'الوجهة')}
              </Label>

              {/* Loading state */}
              {(loadingBands || bandMatchStatus === 'loading') && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t('Auto-matching destination from your nationality…', 'جاري مطابقة الوجهة تلقائياً من جنسيتك…')}
                  </span>
                </div>
              )}

              {/* Band found — locked display */}
              {!loadingBands && bandMatchStatus === 'found' && selectedBand && (
                <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-green-800 dark:text-green-300 text-sm">
                          {language === 'ar'
                            ? `${selectedBand.destination_ar} — ${selectedBand.country_ar}`
                            : `${selectedBand.destination} — ${selectedBand.country}`}
                        </p>
                        <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800">
                          {t('Auto-matched', 'مطابق تلقائياً')}
                        </Badge>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        {t(
                          `Matched from your nationality on file: ${employee?.nationality}. Destination is locked to your home country.`,
                          `مطابق من جنسيتك المسجلة: ${employee?.nationality}. الوجهة مقفلة على بلدك الأصلي.`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Band ceiling info */}
                  <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/20 px-3 py-2.5 flex items-start gap-2">
                    <Star className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                        {(employee?.extra_info as any)?.special_case
                          ? t('Special Case — Custom Ceiling', 'حالة خاصة — سقف مخصص')
                          : t('Your Ticket Band (Soft Ceiling)', 'سقف تذكرتك (حد توجيهي)')}
                      </p>
                      <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                        {(employee?.extra_info as any)?.special_case && (employee?.extra_info as any)?.special_case_ceiling
                          ? t(
                              `You have a special case ceiling of ${Number((employee?.extra_info as any).special_case_ceiling).toLocaleString()} SAR assigned by HR.`,
                              `لديك سقف حالة خاصة بقيمة ${Number((employee?.extra_info as any).special_case_ceiling).toLocaleString()} ريال تم تعيينه من قِبَل HR.`
                            )
                          : t(
                              `Approved range for ${selectedBand.destination}: ${selectedBand.min_sar.toLocaleString()} — ${selectedBand.max_sar.toLocaleString()} SAR. Amounts above ${selectedBand.max_sar.toLocaleString()} SAR will be flagged for HR review (not blocked).`,
                              `النطاق المعتمد إلى ${selectedBand.destination_ar}: ${selectedBand.min_sar.toLocaleString()} — ${selectedBand.max_sar.toLocaleString()} ريال. المبالغ التي تتجاوز ${selectedBand.max_sar.toLocaleString()} ريال ستُحال لمراجعة HR (لن يتم رفضها).`
                            )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No band found */}
              {!loadingBands && bandMatchStatus === 'not_found' && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {t('Destination could not be auto-matched', 'تعذّر مطابقة الوجهة تلقائياً')}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      {employee?.nationality
                        ? t(
                            `No ticket band found for "${employee.nationality}". Please contact HR to add a ticket band for your nationality or update your profile.`,
                            `لم يتم العثور على نطاق تذاكر لـ "${employee.nationality}". يرجى التواصل مع HR لإضافة نطاق تذاكر لجنسيتك أو تحديث ملفك الشخصي.`
                          )
                        : t(
                            'Your nationality is not set in your profile. Please contact HR to update your profile so your destination can be auto-matched.',
                            'الجنسية غير محددة في ملفك الشخصي. يرجى التواصل مع HR لتحديث ملفك الشخصي حتى يتم مطابقة وجهتك تلقائياً.'
                          )}
                    </p>
                  </div>
                </div>
              )}

              {/* Ticket Amount — shown only when band is found */}
              {bandMatchStatus === 'found' && selectedBand && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    {t('Expected Ticket Cost (SAR)', 'التكلفة المتوقعة للتذكرة (ريال)')}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={ticketAmount}
                    onChange={e => setTicketAmount(e.target.value)}
                    placeholder={`${selectedBand.min_sar.toLocaleString()} – ${selectedBand.max_sar.toLocaleString()} SAR`}
                    className={overCeiling ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
                  />
                  {overCeiling && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 px-3 py-2 mt-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        {t(
                          `Amount (${parseFloat(ticketAmount).toLocaleString()} SAR) exceeds your band ceiling (${selectedBand.max_sar.toLocaleString()} SAR). Your request will be submitted but routed to HR for review. The excess may be deducted from your salary.`,
                          `المبلغ (${parseFloat(ticketAmount).toLocaleString()} ريال) يتجاوز سقف نطاقك (${selectedBand.max_sar.toLocaleString()} ريال). سيُقبل طلبك لكنه سيُحال إلى HR للمراجعة. قد يُخصم الفرق من راتبك.`
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TRAVEL DATE — Smart two-mode selector (Annual Ticket) ── */}
          {subType === 'annual_ticket' && (
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {t('Traveling Date', 'تاريخ السفر')} <span className="text-destructive">*</span>
              </Label>

              {loadingLeave ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t('Loading your annual leave dates…', 'جاري تحميل تواريخ إجازتك السنوية…')}
                </div>
              ) : (
                <>
                  {/* Two mode cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A — Based on Annual Leave */}
                    <button
                      type="button"
                      onClick={() => {
                        setTravelDateMode('leave_based');
                        if (latestAnnualLeave) {
                          setTravelDate(latestAnnualLeave.start_date);
                          setReturnDate(latestAnnualLeave.end_date);
                        }
                      }}
                      disabled={!latestAnnualLeave}
                      className={`p-4 rounded-xl border-2 text-start transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        travelDateMode === 'leave_based'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          : 'border-border bg-muted/30 hover:border-green-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {travelDateMode === 'leave_based'
                          ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />}
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {t('Based on Annual Leave', 'بناءً على الإجازة السنوية')}
                        </span>
                      </div>
                      {latestAnnualLeave ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {t('Travel date: ', 'تاريخ السفر: ')}<strong>{latestAnnualLeave.start_date}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('Return date: ', 'تاريخ العودة: ')}<strong>{latestAnnualLeave.end_date}</strong>
                          </p>
                          <Badge className={`mt-2 text-[10px] ${latestAnnualLeave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {latestAnnualLeave.status === 'approved' ? t('Approved leave', 'إجازة معتمدة') : t('Pending leave', 'إجازة معلقة')}
                          </Badge>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('No annual leave request found. Submit a leave request first.', 'لا يوجد طلب إجازة سنوية. قدّم طلب إجازة أولاً.')}
                        </p>
                      )}
                    </button>

                    {/* Option B — Custom Override */}
                    <button
                      type="button"
                      onClick={() => setTravelDateMode('custom')}
                      className={`p-4 rounded-xl border-2 text-start transition-all ${
                        travelDateMode === 'custom'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          : 'border-border bg-muted/30 hover:border-green-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {travelDateMode === 'custom'
                          ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />}
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {t('Custom Date', 'تاريخ مخصص')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'Override the default — e.g. leave one day earlier or arrive one day later.',
                          'تجاوز التاريخ الافتراضي — مثلاً السفر قبل يوم أو الوصول بعد يوم.'
                        )}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <Edit3 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{t('Enter your preferred dates below', 'أدخل تواريخك المفضلة أدناه')}</span>
                      </div>
                    </button>
                  </div>

                  {/* Context note if leave-based */}
                  {travelDateMode === 'leave_based' && latestAnnualLeave && (
                    <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-3 py-2">
                      <Info className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {t(
                          `Travel date is set to your annual leave start date (${latestAnnualLeave.start_date}). Switch to Custom Date if you need to depart earlier or return later.`,
                          `تاريخ السفر مضبوط على بداية إجازتك السنوية (${latestAnnualLeave.start_date}). اختر تاريخاً مخصصاً إذا أردت المغادرة أبكر أو العودة لاحقاً.`
                        )}
                      </p>
                    </div>
                  )}

                  {/* Custom date inputs */}
                  {travelDateMode === 'custom' && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">
                          {t('Travel Date', 'تاريخ السفر')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={customTravelDate}
                          onChange={e => {
                            setCustomTravelDate(e.target.value);
                            setTravelDate(e.target.value);
                          }}
                          className="h-10"
                        />
                        {latestAnnualLeave && (
                          <p className="text-[10px] text-muted-foreground">
                            {t(`Leave starts: ${latestAnnualLeave.start_date}`, `الإجازة تبدأ: ${latestAnnualLeave.start_date}`)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">
                          {t('Return Date', 'تاريخ العودة')}
                        </Label>
                        <Input
                          type="date"
                          value={customReturnDate}
                          onChange={e => {
                            setCustomReturnDate(e.target.value);
                            setReturnDate(e.target.value);
                          }}
                          min={customTravelDate || undefined}
                          className="h-10"
                        />
                        {latestAnnualLeave && (
                          <p className="text-[10px] text-muted-foreground">
                            {t(`Leave ends: ${latestAnnualLeave.end_date}`, `الإجازة تنتهي: ${latestAnnualLeave.end_date}`)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Travel Date — Re-entry visa (simple, no mode selector) */}
          {subType === 'reentry_visa' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {t('Travel Date', 'تاريخ السفر')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={travelDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setTravelDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {t('Return Date (Optional)', 'تاريخ العودة (اختياري)')}
                </Label>
                <Input
                  type="date"
                  value={returnDate}
                  min={travelDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setReturnDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Booking Details */}
          {subType === 'annual_ticket' && (
            <div className="space-y-2">
              <Label>{t('Booking Details', 'تفاصيل الحجز')}</Label>
              <Textarea
                value={bookingDetails}
                onChange={e => setBookingDetails(e.target.value)}
                placeholder={t('Preferred airline, flight timing, class preference, etc.', 'شركة الطيران المفضلة، توقيت الرحلة، تفضيلات الدرجة، إلخ.')}
                rows={3}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('Additional Notes', 'ملاحظات إضافية')}</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('Any additional information...', 'أي معلومات إضافية...')}
              rows={2}
            />
          </div>

          {/* Special Case Warning */}
          {isSpecialCase && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                {t(
                  '⚠️ Special Case: This ticket request is before your anniversary date and requires Super Admin approval. It will be deducted from your next year\'s annual ticket balance.',
                  '⚠️ حالة خاصة: هذا الطلب قبل تاريخ ذكرى التعيين ويتطلب موافقة المسؤول الأعلى. سيُخصم من رصيد تذكرتك السنوية للعام القادم.'
                )}
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isLoading || (subType === 'annual_ticket' && bandMatchStatus === 'loading')}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 me-2 animate-spin" /> {t('Submitting...', 'جارٍ الإرسال...')}</>
            ) : (
              <><Plane className="w-4 h-4 me-2" />
              {subType === 'annual_ticket' ? t('Submit Annual Ticket Request', 'تقديم طلب التذكرة السنوية') : t('Submit Re-Entry Visa Request', 'تقديم طلب خروج وعودة')}<ChevronRight className="w-4 h-4 ms-auto" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
