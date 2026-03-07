import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, DollarSign, LogOut, User, Clock, CheckCircle2,
  XCircle, AlertCircle, ChevronLeft, ChevronRight, Stethoscope,
  BanknoteIcon, History, ArrowUpRight, Sparkles, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeToggle } from '../components/ThemeToggle';
import { AnnouncementView } from '../components/AnnouncementView';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/* ─────────────────────────────────────────────── types ── */
interface Request {
  id: string;
  type: 'leave' | 'advance' | 'entry';
  sub_type: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes?: string;
  amount?: number;
}
interface LeaveDay { type: string; status: 'approved' | 'pending' }
interface Balances {
  annual: { used: number; pending: number; total: number };
  sick:   { used: number; pending: number; total: number };
  hourly: { used: number; pending: number; total: number };
  unpaid: { used: number; pending: number; total: number };
}

/* ─────────────────────────────────────────────── config ── */
const LEAVE_CFG: Record<string, { color: string; icon: React.ElementType; labelEn: string; labelAr: string }> = {
  annual:  { color: '#006B7D', icon: Calendar,     labelEn: 'Annual',   labelAr: 'سنوية'      },
  sick:    { color: '#DC2626', icon: Stethoscope,  labelEn: 'Sick',     labelAr: 'مرضية'      },
  hourly:  { color: '#7C3AED', icon: Clock,        labelEn: 'Hourly',   labelAr: 'ساعية'      },
  unpaid:  { color: '#92400E', icon: BanknoteIcon, labelEn: 'Unpaid',   labelAr: 'بدون راتب'  },
};

/* ─────────────────────────────────────────── helpers ── */
function calcHours(s: string, e: string) {
  const [h1, m1] = s.split(':').map(Number);
  const [h2, m2] = e.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
}
function daysBetween(a: string, b: string) {
  return Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getGreeting(lang: string) {
  const h = new Date().getHours();
  if (h < 5)  return lang === 'ar' ? 'ليلة طيبة 🌙'  : 'Good night 🌙';
  if (h < 12) return lang === 'ar' ? 'صباح الخير ☀️'  : 'Good morning ☀️';
  if (h < 17) return lang === 'ar' ? 'ظهرك خير 🌤️'    : 'Good afternoon 🌤️';
  if (h < 21) return lang === 'ar' ? 'مساء الخير 🌆'   : 'Good evening 🌆';
  return lang === 'ar' ? 'تصبح على خير 🌙' : 'Good night 🌙';
}
function todayLabel(lang: string) {
  const now = new Date();
  return now.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/* ─────────────────────── status helpers ── */
const STATUS_CFG = {
  pending:  { color: '#F59E0B', icon: AlertCircle,   labelEn: 'Pending',  labelAr: 'قيد المراجعة' },
  approved: { color: '#22C55E', icon: CheckCircle2,  labelEn: 'Approved', labelAr: 'موافق عليه'   },
  rejected: { color: '#EF4444', icon: XCircle,       labelEn: 'Rejected', labelAr: 'مرفوض'        },
};
const TYPE_LABEL: Record<string, [string, string]> = {
  'leave:annual':  ['Annual Leave',   'إجازة سنوية'],
  'leave:sick':    ['Sick Leave',     'إجازة مرضية'],
  'leave:hourly':  ['Hourly Leave',   'إجازة ساعية'],
  'leave:unpaid':  ['Unpaid Leave',   'إجازة بدون راتب'],
  'advance':       ['Salary Advance', 'سلفة مالية'],
  'entry:personal':['Personal Exit',  'خروج شخصي'],
  'entry:work':    ['Work Exit',      'خروج للعمل'],
};

/* ════════════════════════════════════════════ MAIN PAGE ══ */
interface CompanyPortalProps {
  onServiceSelect: (service: 'leave' | 'advance' | 'entry' | 'history' | 'profile') => void;
  onLogout: () => void;
}

export function CompanyPortal({ onServiceSelect, onLogout }: CompanyPortalProps) {
  const { t, language } = useLanguage();
  const { employee, company } = useAuth();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());
  const [tooltip, setTooltip] = useState<{ day: number; leaves: LeaveDay[] } | null>(null);

  /* ── fetch ── */
  useEffect(() => {
    if (employee?.id) fetchRequests();
  }, [employee?.id]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/requests/employee/${employee!.id}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success) setRequests(data.requests || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ── derived: balances ── */
  const balances = useMemo<Balances>(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth();
    const leaves = requests.filter(r => r.type === 'leave');
    const byType = (sub: string, stat: string) =>
      leaves.filter(r => r.sub_type === sub && r.status === stat && new Date(r.created_at).getFullYear() === yr);
    const sumDays = (arr: Request[]) => arr.reduce((a, r) => a + daysBetween(r.start_date, r.end_date), 0);
    const hourlyFilter = (stat: string) =>
      leaves.filter(r => {
        const d = new Date(r.created_at);
        return r.sub_type === 'hourly' && r.status === stat && d.getFullYear() === yr && d.getMonth() === mo;
      }).reduce((a, r) => a + (r.start_time && r.end_time ? calcHours(r.start_time, r.end_time) : 0), 0);
    return {
      annual: { used: sumDays(byType('annual','approved')), pending: sumDays(byType('annual','pending')), total: 30 },
      sick:   { used: sumDays(byType('sick','approved')),   pending: sumDays(byType('sick','pending')),   total: 14 },
      hourly: { used: hourlyFilter('approved'),              pending: hourlyFilter('pending'),              total: 6  },
      unpaid: { used: sumDays(byType('unpaid','approved')), pending: sumDays(byType('unpaid','pending')), total: 30 },
    };
  }, [requests]);

  /* ── derived: calendar leave-days map ── */
  const leaveDays = useMemo(() => {
    const map = new Map<string, LeaveDay[]>();
    requests.forEach(r => {
      if (r.type !== 'leave' || r.status === 'rejected') return;
      const start = new Date(r.start_date);
      const end   = new Date(r.end_date);
      const cur   = new Date(start);
      while (cur <= end) {
        const k = dateKey(cur);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push({ type: r.sub_type, status: r.status as 'approved' | 'pending' });
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [requests]);

  /* ── derived: recent requests ── */
  const recent = useMemo(() =>
    [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
  [requests]);

  /* ── calendar helpers ── */
  const calYear  = calMonth.getFullYear();
  const calMo    = calMonth.getMonth();
  const firstDay = new Date(calYear, calMo, 1).getDay();   // 0=Sun
  const daysInMo = new Date(calYear, calMo + 1, 0).getDate();
  const calDays  = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)];
  const calMonthLabel = new Date(calYear, calMo, 1).toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' }
  );
  const todayDate = new Date();
  const isToday = (d: number) =>
    d === todayDate.getDate() && calMo === todayDate.getMonth() && calYear === todayDate.getFullYear();
  const getLeavesForDay = (d: number | null): LeaveDay[] => {
    if (!d) return [];
    return leaveDays.get(`${calYear}-${String(calMo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`) || [];
  };
  const DAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const DAY_NAMES_AR = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
  const dayNames = language === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;

  /* ── request type label ── */
  const getTypeLabel = (r: Request) => {
    const key = r.type === 'leave' ? `leave:${r.sub_type}` : r.type === 'advance' ? 'advance' : `entry:${r.sub_type}`;
    const pair = TYPE_LABEL[key] || [r.type, r.type];
    return language === 'ar' ? pair[1] : pair[0];
  };
  const getTypeColor = (r: Request) => {
    if (r.type === 'advance') return '#7AC143';
    if (r.type === 'entry')   return '#00A89C';
    return LEAVE_CFG[r.sub_type]?.color || '#006B7D';
  };
  const getTypeIcon = (r: Request): React.ElementType => {
    if (r.type === 'advance') return DollarSign;
    if (r.type === 'entry')   return MapPin;
    return LEAVE_CFG[r.sub_type]?.icon || Calendar;
  };

  /* ── action cards ── */
  const ACTIONS = [
    {
      id: 'leave' as const,
      icon: Calendar,
      gradient: 'from-[#006B7D] to-[#00A89C]',
      labelEn: 'Leave Request',
      labelAr: 'طلب إجازة',
      descEn: '4 types · Annual, Sick, Hourly, Unpaid',
      descAr: '4 أنواع · سنوية، مرضية، ساعية، بدون راتب',
    },
    {
      id: 'advance' as const,
      icon: DollarSign,
      gradient: 'from-[#3d7a1a] to-[#7AC143]',
      labelEn: 'Salary Advance',
      labelAr: 'سلفة مالية',
      descEn: 'Up to 1.5× monthly salary',
      descAr: 'حتى راتب ونصف كحد أقصى',
    },
    {
      id: 'entry' as const,
      icon: MapPin,
      gradient: 'from-[#006B6B] to-[#00A89C]',
      labelEn: 'Exit & Return',
      labelAr: 'خروج وعودة',
      descEn: 'Personal or work exit permission',
      descAr: 'خروج شخصي أو للعمل',
    },
  ];

  const remainingAnnual = Math.max(0, balances.annual.total - balances.annual.used - balances.annual.pending);
  const name = language === 'ar' ? (employee?.full_name_ar || employee?.full_name) : employee?.full_name;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ══════════ HEADER ══════════ */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {company?.logo_url && (
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40">
                <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain p-1" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">{company?.name}</p>
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {t('Employee Portal', 'بوابة الموظفين')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => onServiceSelect('profile')}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              {employee?.photo_url
                ? <img src={employee.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
                : <User className="w-4 h-4 text-slate-500" />
              }
            </button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="hidden sm:flex h-8 text-xs text-slate-500 hover:text-red-500 gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              {t('Logout', 'خروج')}
            </Button>
          </div>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <div className="bg-gradient-to-br from-[#00364A] via-[#005F73] to-[#0A9396] text-white relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-[#94D2BD]/10 blur-2xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative flex-shrink-0"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center overflow-hidden shadow-xl">
                {employee?.photo_url
                  ? <img src={employee.photo_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-3xl sm:text-4xl font-bold text-white/80">
                      {name?.charAt(0).toUpperCase()}
                    </span>
                }
              </div>
              <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-green-400 border-2 border-[#005F73] shadow" />
            </motion.div>

            {/* Greeting */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-white/60 text-sm mb-1">{getGreeting(language)}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{name}</h2>
              <p className="text-white/70 text-sm mt-1">
                {employee?.position && <span className="me-2">{t(employee.position, employee.position_ar || employee.position)}</span>}
              </p>
              <p className="text-white/50 text-xs mt-1.5">{todayLabel(language)}</p>
            </motion.div>

            {/* Annual balance badge */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="hidden sm:flex flex-col items-end gap-1"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                <p className="text-white/60 text-xs mb-1">{t('Annual Leave Left', 'رصيد سنوي')}</p>
                <p className="text-3xl font-black text-white">{remainingAnnual}</p>
                <p className="text-white/60 text-xs">{t('days', 'يوم')}</p>
              </div>
            </motion.div>
          </div>

          {/* ── Balance Pills ── */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {([
              { key: 'annual', totalLabel: '30d', unit: 'd', unitAr: 'ي' },
              { key: 'sick',   totalLabel: '14d', unit: 'd', unitAr: 'ي' },
              { key: 'hourly', totalLabel: '6hr', unit: 'hr', unitAr: 'س', isHourly: true },
              { key: 'unpaid', totalLabel: '30d', unit: 'd', unitAr: 'ي' },
            ] as const).map(({ key, totalLabel, unit, unitAr, isHourly }) => {
              const cfg = LEAVE_CFG[key];
              const b = balances[key as keyof Balances];
              const rem = Math.max(0, b.total - b.used - b.pending);
              const pct = Math.min(100, ((b.used + b.pending) / b.total) * 100);
              const IconC = cfg.icon;
              return (
                <div key={key} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <IconC className="w-3.5 h-3.5 text-white/70" />
                      <span className="text-white/70 text-xs font-medium">
                        {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                      </span>
                    </div>
                    <span className="text-white font-bold text-sm">
                      {isHourly ? rem.toFixed(1) : rem}
                      <span className="text-white/50 text-[10px] ms-0.5">{language === 'ar' ? unitAr : unit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: rem === 0 ? '#EF4444' : '#94D2BD' }}
                    />
                  </div>
                  <p className="text-white/40 text-[10px] mt-1">
                    {t(`Used: ${isHourly ? b.used.toFixed(1) : b.used} / ${totalLabel}`, `مستخدم: ${isHourly ? b.used.toFixed(1) : b.used} / ${totalLabel}`)}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Quick Action Cards ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-0.5">
            {t('New Request', 'طلب جديد')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.05 * i }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onServiceSelect(action.id)}
                  className={`relative text-start p-5 sm:p-6 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg hover:shadow-xl transition-shadow group overflow-hidden`}
                >
                  {/* Decorative circle */}
                  <div className="absolute -end-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
                  <div className="absolute -end-2 -bottom-2 w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />

                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {language === 'ar' ? action.labelAr : action.labelEn}
                    </h3>
                    <p className="text-white/65 text-xs mt-1 leading-relaxed">
                      {language === 'ar' ? action.descAr : action.descEn}
                    </p>
                    <div className="flex items-center gap-1 mt-4 text-white/80 text-xs font-medium">
                      {t('Request now', 'اطلب الآن')}
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Calendar + Timeline grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── MINI CALENDAR ── (3/5) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5"
          >
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  {t('Leave Calendar', 'تقويم الإجازات')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('Your approved and pending leaves', 'إجازاتك الموافق عليها والمعلقة')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalMonth(new Date(calYear, calMo - 1, 1))}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[120px] text-center">
                  {calMonthLabel}
                </span>
                <button
                  onClick={() => setCalMonth(new Date(calYear, calMo + 1, 1))}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day, idx) => {
                const leaves = getLeavesForDay(day);
                const hasApproved = leaves.some(l => l.status === 'approved');
                const hasPending  = leaves.some(l => l.status === 'pending');
                const primaryType = leaves[0]?.type;
                const bgColor = primaryType ? LEAVE_CFG[primaryType]?.color : undefined;
                const todayDay = isToday(day!);

                return (
                  <div key={idx} className="relative aspect-square flex flex-col items-center justify-center">
                    {day !== null ? (
                      <div
                        className={`
                          w-full h-full flex flex-col items-center justify-center rounded-lg cursor-default
                          transition-all duration-150 relative
                          ${leaves.length > 0 ? 'hover:scale-105' : ''}
                          ${todayDay && !leaves.length ? 'ring-2 ring-[#006B7D] ring-offset-1 dark:ring-offset-slate-900' : ''}
                        `}
                        style={leaves.length > 0 ? {
                          backgroundColor: `${bgColor}${hasPending && !hasApproved ? '40' : '22'}`,
                          border: hasPending && !hasApproved ? `1.5px dashed ${bgColor}80` : 'none',
                        } : {}}
                        onMouseEnter={() => leaves.length > 0 && setTooltip({ day: day!, leaves })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span
                          className={`text-xs font-medium ${
                            todayDay
                              ? 'text-[#006B7D] font-bold'
                              : leaves.length > 0
                              ? 'font-semibold'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                          style={leaves.length > 0 ? { color: bgColor } : undefined}
                        >
                          {day}
                        </span>
                        {/* Dots for leave types */}
                        {leaves.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {[...new Set(leaves.map(l => l.type))].slice(0, 3).map(type => (
                              <div
                                key={type}
                                className="w-1 h-1 rounded-full"
                                style={{ backgroundColor: LEAVE_CFG[type]?.color || '#006B7D' }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mt-3 rounded-xl border border-border/60 bg-slate-50 dark:bg-slate-800 p-3 flex flex-wrap gap-2"
                >
                  <p className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {t(`Day ${tooltip.day}`, `يوم ${tooltip.day}`)} — {calMonthLabel}
                  </p>
                  {tooltip.leaves.map((l, i) => {
                    const cfg = LEAVE_CFG[l.type];
                    const Icon = cfg?.icon || Calendar;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white text-xs font-medium"
                        style={{ backgroundColor: `${cfg?.color}cc` }}
                      >
                        <Icon className="w-3 h-3" />
                        {language === 'ar' ? cfg?.labelAr : cfg?.labelEn}
                        {' · '}
                        {l.status === 'approved'
                          ? t('Approved', 'موافق عليه')
                          : t('Pending', 'قيد المراجعة')}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-3">
              {Object.entries(LEAVE_CFG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
                    {language === 'ar' ? cfg.labelAr : cfg.labelEn}
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-slate-400 bg-slate-200 dark:bg-slate-700" />
                {t('Pending', 'قيد المراجعة')}
              </div>
            </div>
          </motion.div>

          {/* ── REQUEST TIMELINE ── (2/5) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  {t('Recent Requests', 'آخر الطلبات')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('Your latest activity', 'نشاطك الأخير')}
                </p>
              </div>
              <button
                onClick={() => onServiceSelect('history')}
                className="flex items-center gap-1 text-xs text-[#006B7D] hover:underline font-medium"
              >
                {t('View all', 'عرض الكل')}
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3 flex-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Sparkles className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {t('No requests yet', 'لا توجد طلبات بعد')}
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                  {t('Use the cards above to submit a new request', 'استخدم البطاقات أعلاه لتقديم طلب')}
                </p>
              </div>
            ) : (
              <div className="flex-1 relative">
                {/* Vertical line */}
                <div className="absolute start-4 top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800" />

                <div className="space-y-1">
                  {recent.map((req, i) => {
                    const sc = STATUS_CFG[req.status as keyof typeof STATUS_CFG] ?? STATUS_CFG['pending'];
                    const typeColor = getTypeColor(req);
                    const TypeIcon = getTypeIcon(req);
                    const StatusIcon = sc.icon;
                    const dateStr = new Date(req.created_at).toLocaleDateString(
                      language === 'ar' ? 'ar-SA' : 'en-US',
                      { month: 'short', day: 'numeric' }
                    );
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex gap-3 ps-0 group"
                      >
                        {/* Timeline dot */}
                        <div className="relative flex-shrink-0 w-8 flex justify-center">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center z-10 shadow-sm border-2 border-white dark:border-slate-900"
                            style={{ backgroundColor: `${typeColor}22` }}
                          >
                            <TypeIcon className="w-3.5 h-3.5" style={{ color: typeColor }} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-4 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate leading-tight">
                                {getTypeLabel(req)}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {req.type === 'advance' && req.amount
                                  ? `${req.amount.toLocaleString()} ${t('SAR', 'ر.س')}`
                                  : req.type === 'leave' && req.sub_type === 'hourly' && req.start_time && req.end_time
                                  ? `${req.start_time} – ${req.end_time}`
                                  : req.start_date && req.end_date
                                  ? req.start_date === req.end_date
                                    ? req.start_date
                                    : `${req.start_date} → ${req.end_date}`
                                  : dateStr
                                }
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ backgroundColor: `${sc.color}18`, color: sc.color }}
                              >
                                <StatusIcon className="w-2.5 h-2.5" />
                                {language === 'ar' ? sc.labelAr : sc.labelEn}
                              </div>
                              <p className="text-[10px] text-slate-400">{dateStr}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View history footer */}
            <button
              onClick={() => onServiceSelect('history')}
              className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#006B7D] hover:border-[#006B7D]/40 transition-all flex items-center justify-center gap-2"
            >
              <History className="w-3.5 h-3.5" />
              {t('View Full History', 'عرض السجل الكامل')}
            </button>
          </motion.div>
        </div>

        {/* ── Announcements ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <AnnouncementView />
        </motion.div>

        {/* ── Mobile logout ── */}
        <div className="sm:hidden pb-4">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full h-11 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
          >
            <LogOut className="w-4 h-4 me-2" />
            {t('Logout', 'تسجيل الخروج')}
          </Button>
        </div>
      </div>
    </div>
  );
}