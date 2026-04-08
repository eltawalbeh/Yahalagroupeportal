import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CalendarDays,
  User, Building2, X, Clock, Plane, Stethoscope,
  Banknote, UserCheck, DoorOpen
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { adminFetch } from '../../utils/adminApi';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface LeaveCalendarProps {
  onBack: () => void;
  /** Pass the logged-in manager's ID to use the manager API endpoint instead of admin */
  managerId?: number | string;
}

interface LeaveEvent {
  id: string;
  employee_name: string;
  employee_name_ar?: string;
  company_name: string;
  start_date: string;
  end_date: string;
  type: string;
  sub_type: string;
  status?: string;
}

// ─── leave type config ───────────────────────────────────────────────────────
const LEAVE_TYPE_CONFIG: Record<string, {
  labelEn: string; labelAr: string;
  bg: string; text: string; border: string;
  icon: React.ElementType;
}> = {
  annual:   { labelEn: 'Annual Leave',   labelAr: 'إجازة سنوية',       bg: 'bg-indigo-100 dark:bg-indigo-900/40',   text: 'text-indigo-700 dark:text-indigo-300',   border: 'border-indigo-300 dark:border-indigo-700',   icon: Plane },
  sick:     { labelEn: 'Sick Leave',     labelAr: 'إجازة مرضية',       bg: 'bg-rose-100 dark:bg-rose-900/40',       text: 'text-rose-700 dark:text-rose-300',       border: 'border-rose-300 dark:border-rose-700',       icon: Stethoscope },
  unpaid:   { labelEn: 'Unpaid Leave',   labelAr: 'إجازة بدون راتب',   bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-300 dark:border-amber-700',     icon: Banknote },
  personal: { labelEn: 'Personal Leave', labelAr: 'إجازة شخصية',       bg: 'bg-violet-100 dark:bg-violet-900/40',   text: 'text-violet-700 dark:text-violet-300',   border: 'border-violet-300 dark:border-violet-700',   icon: UserCheck },
  hourly:   { labelEn: 'Hourly Leave',   labelAr: 'إجازة ساعية',       bg: 'bg-sky-100 dark:bg-sky-900/40',         text: 'text-sky-700 dark:text-sky-300',         border: 'border-sky-300 dark:border-sky-700',         icon: Clock },
  work:     { labelEn: 'Exit & Return',  labelAr: 'خروج وعودة',        bg: 'bg-teal-100 dark:bg-teal-900/40',       text: 'text-teal-700 dark:text-teal-300',       border: 'border-teal-300 dark:border-teal-700',       icon: DoorOpen },
  leave:    { labelEn: 'Leave',          labelAr: 'إجازة',             bg: 'bg-blue-100 dark:bg-blue-900/40',       text: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-300 dark:border-blue-700',       icon: Plane },
};

function getLeaveConfig(type: string, subType?: string) {
  return LEAVE_TYPE_CONFIG[subType || ''] || LEAVE_TYPE_CONFIG[type] || LEAVE_TYPE_CONFIG['leave'];
}

export function LeaveCalendar({ onBack, managerId }: LeaveCalendarProps) {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveEvents, setLeaveEvents] = useState<LeaveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { fetchLeaveEvents(); }, [currentDate, managerId]);

  const fetchLeaveEvents = async () => {
    setLoading(true);
    try {
      let response: Response;
      if (managerId) {
        // Manager portal: use the manager endpoint (no admin token required)
        response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/leave-calendar?manager_id=${managerId}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
      } else {
        // Admin portal: use the admin-authed endpoint
        response = await adminFetch('/admin/leave-calendar');
      }
      const data = await response.json();
      if (data.success) setLeaveEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching leave events:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── date helpers ──────────────────────────────────────────────────────────
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun

  const isDateInRange = (day: number, event: LeaveEvent) => {
    const d     = new Date(year, month, day);
    const start = new Date(event.start_date);
    const end   = new Date(event.end_date);
    // ignore time component
    d.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  };

  const getEventsForDay = (day: number) => leaveEvents.filter(e => isDateInRange(day, e));

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const monthLabel = currentDate.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'long', year: 'numeric'
  });

  const weekDays = [
    t('Sun','الأحد'), t('Mon','الإثنين'), t('Tue','الثلاثاء'),
    t('Wed','الأربعاء'), t('Thu','الخميس'), t('Fri','الجمعة'), t('Sat','السبت')
  ];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedDateLabel = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : '';

  // month summary — unique employees on leave across the whole month
  const monthlyEmployees = new Set(
    leaveEvents
      .filter(e => {
        const start = new Date(e.start_date);
        const end   = new Date(e.end_date);
        const mStart = new Date(year, month, 1);
        const mEnd   = new Date(year, month + 1, 0);
        return start <= mEnd && end >= mStart;
      })
      .map(e => e.employee_name)
  );

  // Pending count for the summary pill
  const monthlyPending = leaveEvents.filter(e => {
    const start = new Date(e.start_date);
    const end   = new Date(e.end_date);
    const mStart = new Date(year, month, 1);
    const mEnd   = new Date(year, month + 1, 0);
    return e.status === 'pending' && start <= mEnd && end >= mStart;
  }).length;

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('Back', 'رجوع')}
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-500" />
              {t('Leave Calendar', 'تقويم الإجازات')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('Click any highlighted day to see who is on leave', 'انقر على أي يوم مميز لعرض من هم في إجازة')}
            </p>
          </div>
        </div>

        {/* Summary pill */}
        {!loading && (
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {monthlyEmployees.size} {t('on leave this month', 'موظف في إجازة هذا الشهر')}
              </span>
            </div>
            {monthlyPending > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {monthlyPending} {t('pending', 'معلق')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Calendar card ─────────────────────────────────────��───────────── */}
      <Card className="overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setCurrentDate(new Date())}
            >
              {t('Today', 'اليوم')}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {t('Loading calendar...', 'جاري تحميل التقويم...')}
          </div>
        ) : (
          <div className="p-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before month start */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[90px] lg:min-h-[110px]" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day    = i + 1;
                const events = getEventsForDay(day);
                const hasEvents = events.length > 0;
                const todayFlag = isToday(day);
                // On desktop show up to 3 event chips, on mobile show up to 1
                const MAX_VISIBLE_DESKTOP = 3;
                const MAX_VISIBLE_MOBILE = 1;
                const remaining = events.length - MAX_VISIBLE_DESKTOP;

                return (
                  <button
                    key={day}
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDay(day);
                        setDialogOpen(true);
                      }
                    }}
                    className={[
                      'min-h-[60px] sm:min-h-[90px] lg:min-h-[110px] rounded-xl p-1 sm:p-1.5 flex flex-col transition-all duration-150 text-start relative',
                      todayFlag
                        ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'bg-muted/20 dark:bg-slate-900/30',
                      hasEvents
                        ? 'hover:bg-blue-100/50 dark:hover:bg-blue-900/40 cursor-pointer shadow-sm hover:shadow-md'
                        : 'cursor-default opacity-70',
                    ].join(' ')}
                    disabled={!hasEvents}
                  >
                    {/* Day number row */}
                    <div className="flex items-center justify-between w-full mb-0.5 sm:mb-1">
                      <span className={[
                        'text-xs sm:text-sm font-semibold leading-none',
                        todayFlag
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : hasEvents
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      ].join(' ')}>
                        {day}
                      </span>
                      {/* Event count badge */}
                      {hasEvents && events.length > 1 && (
                        <span className="min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {events.length}
                        </span>
                      )}
                    </div>

                    {/* ── Event chips visible in cell ── */}
                    {hasEvents && (
                      <div className="flex flex-col gap-0.5 w-full overflow-hidden flex-1">
                        {/* Mobile: show limited chips */}
                        <div className="sm:hidden flex flex-col gap-0.5 w-full">
                          {events.slice(0, MAX_VISIBLE_MOBILE).map((ev, idx) => {
                            const cfg = getLeaveConfig(ev.type, ev.sub_type);
                            const Icon = cfg.icon;
                            const firstName = (language === 'ar'
                              ? (ev.employee_name_ar || ev.employee_name)
                              : ev.employee_name
                            ).split(' ')[0];
                            return (
                              <div
                                key={ev.id || idx}
                                className={`flex items-center gap-0.5 rounded px-1 py-px text-[8px] font-medium truncate border ${cfg.bg} ${cfg.text} ${cfg.border} ${ev.status === 'pending' ? 'border-dashed opacity-80' : ''}`}
                              >
                                <Icon className="w-2 h-2 shrink-0" />
                                <span className="truncate">{firstName}</span>
                              </div>
                            );
                          })}
                          {events.length > MAX_VISIBLE_MOBILE && (
                            <span className="text-[8px] text-blue-600 dark:text-blue-400 font-semibold px-1">
                              +{events.length - MAX_VISIBLE_MOBILE} {t('more', 'أكثر')}
                            </span>
                          )}
                        </div>

                        {/* Desktop/Tablet: show more chips */}
                        <div className="hidden sm:flex flex-col gap-0.5 w-full">
                          {events.slice(0, MAX_VISIBLE_DESKTOP).map((ev, idx) => {
                            const cfg = getLeaveConfig(ev.type, ev.sub_type);
                            const Icon = cfg.icon;
                            const displayName = language === 'ar'
                              ? (ev.employee_name_ar || ev.employee_name)
                              : ev.employee_name;
                            // Show first name on tablet, fuller name on large screens
                            const shortName = displayName.split(' ').slice(0, 2).join(' ');
                            return (
                              <div
                                key={ev.id || idx}
                                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] lg:text-[11px] font-medium truncate border ${cfg.bg} ${cfg.text} ${cfg.border} ${ev.status === 'pending' ? 'border-dashed opacity-80' : ''}`}
                                title={`${displayName} — ${language === 'ar' ? cfg.labelAr : cfg.labelEn}${ev.status === 'pending' ? ' (Pending)' : ''}`}
                              >
                                <Icon className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{shortName}</span>
                              </div>
                            );
                          })}
                          {remaining > 0 && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-1">
                              +{remaining} {t('more', 'أكثر')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Legend ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t('Leave Types', 'أنواع الإجازات')}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {Object.entries(LEAVE_TYPE_CONFIG).filter(([k]) => k !== 'leave').map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}`} />
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-indigo-500 bg-indigo-50" />
              <span className="text-xs text-muted-foreground">{t('Today', 'اليوم')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-dashed border-slate-400 bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-muted-foreground">{t('Pending (dashed)', 'معلق (متقطع)')}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Day Detail Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setSelectedDay(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-5 h-5 text-indigo-500 shrink-0" />
              <span>{selectedDateLabel}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {selectedEvents.length}{' '}
              {selectedEvents.length === 1
                ? t('employee on leave', 'موظف في إجازة')
                : t('employees on leave', 'موظفون في إجازة')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {selectedEvents.map((event, idx) => {
              const cfg = getLeaveConfig(event.type, event.sub_type);
              const Icon = cfg.icon;
              const name = language === 'ar'
                ? (event.employee_name_ar || event.employee_name)
                : event.employee_name;

              return (
                <div
                  key={event.id || idx}
                  className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
                >
                  {/* Employee name + leave type */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20 ${cfg.text}`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${cfg.text}`}>{name}</p>
                        {event.employee_name_ar && language !== 'ar' && (
                          <p className="text-xs text-muted-foreground">{event.employee_name_ar}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}>
                      <Icon className="w-3 h-3" />
                      {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Company */}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{event.company_name || t('N/A', 'غير محدد')}</span>
                    </div>

                    {/* Status */}
                    {event.status && (
                      <div className="flex items-center justify-end">
                        <Badge
                          className={
                            event.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]'
                              : event.status === 'pending'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]'
                              : 'bg-slate-100 text-slate-600 border-0 text-[10px]'
                          }
                        >
                          {event.status === 'approved' ? t('Approved', 'موافق عليها')
                            : event.status === 'pending' ? t('Pending', 'معلقة')
                            : event.status}
                        </Badge>
                      </div>
                    )}

                    {/* Date range (full width) */}
                    <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {formatDate(event.start_date)}
                        {event.end_date && event.end_date !== event.start_date && (
                          <> &mdash; {formatDate(event.end_date)}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}