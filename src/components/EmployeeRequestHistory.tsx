import React, { useState, useEffect, useRef } from 'react';
import {
  Printer, FileText, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, AlertTriangle, Ban,
  Calendar, DollarSign, LogOut as ExitIcon,
  Search, RefreshCw, Send
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { adminFetch } from '../utils/adminApi';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface RequestRecord {
  id: string;
  type: 'leave' | 'advance' | 'entry';
  sub_type?: string;
  leave_type?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  amount?: number;
  notes?: string;
  admin_notes?: string;
  cancel_reason?: string;
  cancel_reason_ar?: string;
  cancelled_by_name?: string;
  cancelled_at?: string;
  processed_by_name?: string;
  processed_at?: string;
  activity_log?: ActivityEntry[];
}

interface ActivityEntry {
  id: string;
  action: string;
  performed_by_name?: string;
  performed_by_name_ar?: string;
  performed_by_role?: string;
  timestamp: string;
  notes?: string;
  notes_ar?: string;
  previous_status?: string;
  balance_restored?: number | null;
}

interface EmployeeInfo {
  id: number;
  full_name: string;
  full_name_ar?: string;
  position?: string;
  position_ar?: string;
  email?: string;
  phone?: string;
  iqama?: string;
  hire_date?: string;
}

interface Company {
  id: number;
  name: string;
}

interface EmployeeRequestHistoryProps {
  employee: EmployeeInfo;
  company?: Company | null;
  onClose: () => void;
  /** When set, uses the Manager Portal endpoint instead of the Admin endpoint */
  managerContext?: {
    managerId: number | string;
    managerName?: string;
    managerNameAr?: string;
    canCancel?: boolean;
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function calcDays(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  try {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
  } catch { return null; }
}

function fmtDate(iso?: string, lang = 'en'): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return iso; }
}

function fmtDateTime(iso?: string, lang = 'en'): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function EmployeeRequestHistory({ employee, company, onClose, managerContext }: EmployeeRequestHistoryProps) {
  const { t, language } = useLanguage();
  const { adminInfo } = useAuth() as any;

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  // Date range filter
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<RequestRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonAr, setCancelReasonAr] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  /* ── Load ─────────────────────────────────────────────────────────────── */
  const loadRequests = async () => {
    setLoading(true);
    try {
      let res: Response;
      if (managerContext) {
        // Manager Portal path — uses publicAnonKey, no X-Admin-Token needed
        res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/employee-requests/${employee.id}?manager_id=${managerContext.managerId}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
      } else {
        // Admin Portal path
        res = await adminFetch(`/admin/requests/employee/${employee.id}`);
      }
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        console.error('EmployeeRequestHistory server error:', data.message);
        toast.error(t('Failed to load requests', 'فشل تحميل الطلبات'));
      }
    } catch (err) {
      console.error('EmployeeRequestHistory load error:', err);
      toast.error(t('Error loading request history', 'خطأ في تحميل سجل الطلبات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, [employee.id]);

  /* ── Derived list ─────────────────────────────────────────────────────── */
  const years = Array.from(
    new Set(requests.map(r => new Date(r.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  const filtered = requests.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterYear !== 'all' && new Date(r.created_at).getFullYear().toString() !== filterYear) return false;
    // Date range filter
    if (filterDateFrom) {
      if (new Date(r.created_at) < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(r.created_at) > to) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        (r.admin_notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  /* ── Cancel ───────────────────────────────────────────────────────────── */
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      let res: Response;
      if (managerContext) {
        // Use manager cancel endpoint
        res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/manager/cancel-request`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              request_id: cancelTarget.id,
              manager_id: managerContext.managerId,
              reason: cancelReason,
              reason_ar: cancelReasonAr,
              manager_name: managerContext.managerName || '',
              manager_name_ar: managerContext.managerNameAr || ''
            })
          }
        );
      } else {
        res = await adminFetch(`/admin/requests/${cancelTarget.id}/cancel`, {
          method: 'POST',
          body: JSON.stringify({
            reason: cancelReason,
            reason_ar: cancelReasonAr,
            cancelled_by_id: adminInfo?.id || 'admin',
            cancelled_by_name: adminInfo?.name || 'Admin',
            cancelled_by_name_ar: adminInfo?.name_ar || 'المسؤول'
          })
        });
      }
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.balance_restored
            ? t(
                `Request cancelled. ${data.balance_restored} leave day(s) restored.`,
                `تم الإلغاء. تمت استعادة ${data.balance_restored} يوم إجازة.`
              )
            : t('Request cancelled successfully', 'تم إلغاء الطلب بنجاح')
        );
        setCancelTarget(null);
        setCancelReason('');
        setCancelReasonAr('');
        loadRequests();
      } else {
        toast.error(data.message || t('Failed to cancel request', 'فشل إلغاء الطلب'));
      }
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error(t('Error cancelling request', 'خطأ في إلغاء الطلب'));
    } finally {
      setIsCancelling(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     PRINT ENGINE
     Every status change lives in the activity_log array. We build a full
     visual lifecycle timeline so cancelled/restored requests show ALL steps.
  ════════════════════════════════════════════════════════════════════════ */

  const getTypeLabel = (r: RequestRecord): string => {
    const types: Record<string, { en: string; ar: string }> = {
      leave:   { en: 'Leave',            ar: 'إجازة'        },
      advance: { en: 'Advance',           ar: 'سلفة'         },
      entry:   { en: 'Entry Permission',  ar: 'خروج وعودة'   }
    };
    const subTypes: Record<string, { en: string; ar: string }> = {
      annual:   { en: 'Annual',   ar: 'سنوية'      },
      sick:     { en: 'Sick',     ar: 'مرضية'      },
      unpaid:   { en: 'Unpaid',   ar: 'بدون راتب'  },
      personal: { en: 'Personal', ar: 'شخصية'      },
      hourly:   { en: 'Hourly',   ar: 'ساعية'      },
      work:     { en: 'Work',     ar: 'للعمل'      }
    };
    const base = types[r.type] ?? { en: r.type, ar: r.type };
    const sub  = r.sub_type || r.leave_type;
    const subLabel = sub && subTypes[sub]
      ? ` (${t(subTypes[sub].en, subTypes[sub].ar)})`
      : '';
    return `${t(base.en, base.ar)}${subLabel}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':  return { label: t('Approved',  'موافق'),          labelClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
      case 'pending':   return { label: t('Pending',   'قيد المراجعة'),   labelClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         icon: <Clock        className="w-3.5 h-3.5" /> };
      case 'rejected':  return { label: t('Rejected',  'مرفوض'),          labelClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                   icon: <XCircle      className="w-3.5 h-3.5" /> };
      case 'cancelled': return { label: t('Cancelled', 'ملغي'),           labelClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',              icon: <Ban          className="w-3.5 h-3.5" /> };
      default:          return { label: status,                             labelClass: 'bg-muted text-muted-foreground',                                                  icon: null };
    }
  };

  /* ── Build the HTML for a single request's lifecycle timeline ── */
  const buildTimelineHtml = (r: RequestRecord, dir: string): string => {
    const lang = language;

    // Reconstruct events. Start with the submission event, then activity_log entries.
    type TimelineEvent = {
      icon: string;        // emoji / unicode for plain HTML
      color: string;       // hex
      bg: string;          // hex
      title: string;
      subtitle?: string;
      note?: string;
      noteColor?: string;
      badge?: string;
      badgeColor?: string;
      timestamp: string;
    };

    const events: TimelineEvent[] = [];

    // 1. Submission
    events.push({
      icon: '📋',
      color: '#2563eb',
      bg: '#eff6ff',
      title: lang === 'ar' ? 'تقديم الطلب' : 'Request Submitted',
      subtitle: lang === 'ar'
        ? `قدّم ${(employee.full_name_ar || employee.full_name)} هذا الطلب`
        : `${employee.full_name} submitted this request`,
      note: r.notes || undefined,
      timestamp: fmtDateTime(r.created_at, lang)
    });

    // 2. Activity log entries
    if (Array.isArray(r.activity_log)) {
      for (const entry of r.activity_log) {
        const actor = lang === 'ar'
          ? (entry.performed_by_name_ar || entry.performed_by_name || (lang === 'ar' ? 'النظام' : 'System'))
          : (entry.performed_by_name || 'System');
        const roleLabel: Record<string, { en: string; ar: string }> = {
          admin:    { en: 'HR / Admin',  ar: 'شؤون الموظفين' },
          manager:  { en: 'Manager',     ar: 'المدير'          },
          employee: { en: 'Employee',    ar: 'الموظف'          },
          system:   { en: 'System',      ar: 'النظام'          }
        };
        const roleStr = entry.performed_by_role
          ? (lang === 'ar'
              ? (roleLabel[entry.performed_by_role]?.ar || entry.performed_by_role)
              : (roleLabel[entry.performed_by_role]?.en || entry.performed_by_role))
          : '';

        switch (entry.action) {
          case 'approved': {
            events.push({
              icon: '✅',
              color: '#15803d',
              bg: '#f0fdf4',
              title: lang === 'ar' ? 'تمت الموافقة على الطلب' : 'Request Approved',
              subtitle: lang === 'ar' ? `وافق ${actor} (${roleStr})` : `Approved by ${actor} (${roleStr})`,
              note: entry.notes || r.admin_notes || undefined,
              badge: lang === 'ar' ? 'موافق' : 'Approved',
              badgeColor: '#15803d',
              timestamp: fmtDateTime(entry.timestamp, lang)
            });
            break;
          }
          case 'rejected': {
            events.push({
              icon: '❌',
              color: '#dc2626',
              bg: '#fef2f2',
              title: lang === 'ar' ? 'تم رفض الطلب' : 'Request Rejected',
              subtitle: lang === 'ar' ? `رفض ${actor} (${roleStr})` : `Rejected by ${actor} (${roleStr})`,
              note: entry.notes || r.admin_notes || undefined,
              badge: lang === 'ar' ? 'مرفوض' : 'Rejected',
              badgeColor: '#dc2626',
              timestamp: fmtDateTime(entry.timestamp, lang)
            });
            break;
          }
          case 'cancelled': {
            events.push({
              icon: '🚫',
              color: '#64748b',
              bg: '#f8fafc',
              title: lang === 'ar' ? 'إلغاء ذاتي من الموظف' : 'Cancelled by Employee',
              subtitle: lang === 'ar'
                ? `ألغى ${actor} الطلب بنفسه`
                : `${actor} self-cancelled this request`,
              note: entry.notes || r.cancel_reason || undefined,
              badge: lang === 'ar' ? 'ملغي' : 'Cancelled',
              badgeColor: '#64748b',
              timestamp: fmtDateTime(entry.timestamp, lang)
            });
            break;
          }
          case 'cancelled_by_admin': {
            const prevStatus = entry.previous_status || '';
            const prevLabel: Record<string, { en: string; ar: string }> = {
              pending:  { en: 'was pending approval', ar: 'كان معلق الموافقة' },
              approved: { en: 'was previously approved', ar: 'كانت موافقاً عليها مسبقاً' }
            };
            const prevStr = prevLabel[prevStatus]
              ? (lang === 'ar' ? prevLabel[prevStatus].ar : prevLabel[prevStatus].en)
              : '';

            const balStr = entry.balance_restored != null && entry.balance_restored > 0
              ? (lang === 'ar'
                  ? `✔ تمت استعادة ${entry.balance_restored} يوم إجازة سنوية إلى رصيد الموظف تلقائياً`
                  : `✔ ${entry.balance_restored} annual leave day(s) automatically restored to employee balance`)
              : null;

            events.push({
              icon: '🚫',
              color: '#b45309',
              bg: '#fffbeb',
              title: lang === 'ar' ? 'إلغاء من قِبل شؤون الموظفين / الإدارة' : 'Cancelled by HR / Admin',
              subtitle: lang === 'ar'
                ? `ألغى ${actor} (${roleStr}) الطلب${prevStr ? ' — ' + prevStr : ''}`
                : `${actor} (${roleStr}) cancelled this request${prevStr ? ' — ' + prevStr : ''}`,
              note: (entry.notes || r.cancel_reason)
                ? `${lang === 'ar' ? 'السبب' : 'Reason'}: ${lang === 'ar' ? (entry.notes_ar || entry.notes || r.cancel_reason_ar || r.cancel_reason) : (entry.notes || r.cancel_reason)}`
                : undefined,
              noteColor: '#b45309',
              badge: balStr || undefined,
              badgeColor: '#15803d',
              timestamp: fmtDateTime(entry.timestamp, lang)
            });
            break;
          }
          default: {
            events.push({
              icon: '🔄',
              color: '#6366f1',
              bg: '#eef2ff',
              title: lang === 'ar' ? `تحديث: ${entry.action}` : `Update: ${entry.action}`,
              subtitle: lang === 'ar' ? `بواسطة ${actor}` : `By ${actor}`,
              note: entry.notes || undefined,
              timestamp: fmtDateTime(entry.timestamp, lang)
            });
          }
        }
      }
    }

    /* render */
    const isRtl = dir === 'rtl';
    const timelineItems = events.map((ev, idx) => {
      const isLast = idx === events.length - 1;
      return `
        <div style="display:flex;gap:0;position:relative;">
          <!-- Left column: icon + vertical line -->
          <div style="display:flex;flex-direction:column;align-items:center;width:36px;flex-shrink:0;${isRtl ? 'margin-left:0;margin-right:0;' : ''}">
            <div style="width:32px;height:32px;border-radius:50%;background:${ev.bg};border:2px solid ${ev.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">
              ${ev.icon}
            </div>
            ${!isLast ? `<div style="width:2px;flex:1;min-height:16px;background:#e2e8f0;margin:4px 0;"></div>` : ''}
          </div>
          <!-- Right column: content -->
          <div style="flex:1;${isRtl ? 'margin-right:14px;' : 'margin-left:14px;'}padding-bottom:${isLast ? '0' : '20px'};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
              <p style="font-weight:700;font-size:13px;color:${ev.color};margin:0;">${ev.title}</p>
              <span style="font-size:10px;color:#94a3b8;white-space:nowrap;">${ev.timestamp}</span>
            </div>
            ${ev.subtitle ? `<p style="font-size:12px;color:#475569;margin:0 0 6px;">${ev.subtitle}</p>` : ''}
            ${ev.note ? `
              <div style="background:${ev.noteColor ? ev.noteColor + '12' : '#f1f5f9'};border-${isRtl ? 'right' : 'left'}:3px solid ${ev.noteColor || ev.color};padding:6px 10px;border-radius:4px;margin-bottom:6px;">
                <p style="font-size:12px;color:${ev.noteColor || '#475569'};margin:0;font-style:italic;">${ev.note}</p>
              </div>` : ''}
            ${ev.badge ? `
              <div style="display:inline-flex;background:${ev.badgeColor}18;border:1px solid ${ev.badgeColor}30;padding:4px 10px;border-radius:20px;margin-top:2px;">
                <p style="font-size:11px;font-weight:600;color:${ev.badgeColor};margin:0;">${ev.badge}</p>
              </div>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div style="border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;margin-top:12px;background:#fcfcfd;">
        <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:0 0 14px;">
          ${lang === 'ar' ? 'سجل التغييرات الكامل' : 'Complete Change History'}
        </p>
        ${timelineItems}
      </div>`;
  };

  /* ── Build full request card HTML for print ── */
  const buildRequestCardHtml = (r: RequestRecord, dir: string, isSingle: boolean): string => {
    const lang = language;
    const status = getStatusConfig(r.status);
    const days = calcDays(r.start_date, r.end_date);
    const statusColors: Record<string, string> = {
      approved: '#15803d', pending: '#b45309', rejected: '#dc2626', cancelled: '#9f3fbf'
    };
    const statusColor = statusColors[r.status] || '#64748b';
    const isRtl = dir === 'rtl';

    // Total restored days across all log entries
    const totalRestored = Array.isArray(r.activity_log)
      ? r.activity_log.reduce((sum, e) => sum + (e.balance_restored || 0), 0)
      : 0;

    // Cancelled banner (only for cancelled with a previous approved state)
    const wasApproved = Array.isArray(r.activity_log)
      && r.activity_log.some(e => e.action === 'cancelled_by_admin' && e.previous_status === 'approved');

    const cancelledBanner = r.status === 'cancelled' ? `
      <div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">⚠️</span>
        <div>
          <p style="font-size:12px;font-weight:700;color:#854d0e;margin:0;">
            ${lang === 'ar' ? 'هذا الطلب ملغي' : 'This request has been cancelled'}
          </p>
          ${wasApproved && totalRestored > 0 ? `
          <p style="font-size:11px;color:#166534;margin:2px 0 0;font-weight:600;">
            ✔ ${lang === 'ar' ? `تمت استعادة ${totalRestored} يوم إجازة سنوية إلى رصيد الموظف` : `${totalRestored} annual leave day(s) restored to employee balance`}
          </p>` : ''}
        </div>
      </div>` : '';

    const timeline = buildTimelineHtml(r, dir);

    return `
      <div class="request-card" style="border:1px solid ${r.status === 'cancelled' ? '#fde047' : '#e2e8f0'};border-radius:10px;padding:20px 22px;margin-bottom:${isSingle ? '0' : '24px'};page-break-inside:avoid;background:#fff;">

        <!-- Card Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;">
          <div>
            <span style="font-size:10px;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase;">${lang === 'ar' ? 'رقم الطلب' : 'Request ID'}</span>
            <p style="font-weight:800;font-size:16px;margin:2px 0 0;font-family:monospace;letter-spacing:.04em;">#${r.id.slice(0, 8).toUpperCase()}</p>
            <p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${lang === 'ar' ? 'تاريخ التقديم' : 'Submitted'}: ${fmtDateTime(r.created_at, lang)}</p>
          </div>
          <div style="text-align:${isRtl ? 'left' : 'right'};">
            <span style="display:inline-block;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}30;">
              ${status.label}
            </span>
            <p style="font-size:13px;font-weight:600;margin:5px 0 0;color:#334155;">${getTypeLabel(r)}</p>
          </div>
        </div>

        ${cancelledBanner}

        <!-- Key Details Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:12px 0;margin-bottom:12px;">
          ${r.start_date ? `<div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</span><p style="font-weight:600;font-size:13px;margin:3px 0 0;">${fmtDate(r.start_date, lang)}</p></div>` : ''}
          ${r.end_date   ? `<div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</span><p style="font-weight:600;font-size:13px;margin:3px 0 0;">${fmtDate(r.end_date, lang)}</p></div>` : ''}
          ${days != null ? `<div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'عدد الأيام' : 'Duration'}</span><p style="font-weight:700;font-size:18px;margin:2px 0 0;color:#0f172a;">${days} <span style="font-size:11px;font-weight:500;color:#64748b;">${lang === 'ar' ? 'يوم' : 'day(s)'}</span></p></div>` : ''}
          ${r.start_time ? `<div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'الوقت' : 'Time'}</span><p style="font-weight:600;font-size:13px;margin:3px 0 0;">${r.start_time}</p></div>` : ''}
          ${r.amount != null ? `<div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'المبلغ' : 'Amount'}</span><p style="font-weight:700;font-size:16px;margin:2px 0 0;color:#0f172a;">${r.amount.toLocaleString()} <span style="font-size:11px;font-weight:500;color:#64748b;">${lang === 'ar' ? 'ر.س' : 'SAR'}</span></p></div>` : ''}
          ${r.processed_by_name ? `<div><span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'تمت المعالجة بواسطة' : 'Processed By'}</span><p style="font-weight:600;font-size:13px;margin:3px 0 0;">${r.processed_by_name}</p></div>` : ''}
        </div>

        <!-- Employee Reason/Notes -->
        ${r.notes ? `
        <div style="background:#f8fafc;border-${isRtl ? 'right' : 'left'}:3px solid #94a3b8;padding:8px 12px;border-radius:4px;margin-bottom:10px;">
          <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin:0 0 3px;">${lang === 'ar' ? 'سبب / ملاحظات الموظف' : 'Employee Reason / Notes'}</p>
          <p style="font-size:12px;color:#334155;margin:0;">${r.notes}</p>
        </div>` : ''}

        <!-- HR Approval Notes -->
        ${r.admin_notes ? `
        <div style="background:#f0fdf4;border-${isRtl ? 'right' : 'left'}:3px solid #86efac;padding:8px 12px;border-radius:4px;margin-bottom:10px;">
          <p style="font-size:10px;color:#166534;text-transform:uppercase;margin:0 0 3px;">${lang === 'ar' ? 'ملاحظات شؤون الموظفين' : 'HR / Admin Notes'}</p>
          <p style="font-size:12px;color:#14532d;margin:0;">${r.admin_notes}</p>
        </div>` : ''}

        <!-- Full lifecycle timeline (always shown) -->
        ${timeline}
      </div>`;
  };

  /* ── Open print window ── */
  const openPrintWindow = (html: string) => {
    const win = window.open('', '_blank', 'width=960,height=760');
    if (!win) {
      toast.error(t('Please allow popups for printing', 'يرجى السماح بالنوافذ المنبثقة للطباعة'));
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 700);
  };

  /* ── Shared page wrapper ── */
  const wrapInPage = (
    bodyHtml: string,
    title: string,
    isSingle: boolean,
    reqs: RequestRecord[]
  ): string => {
    const dir      = language === 'ar' ? 'rtl' : 'ltr';
    const lang     = language;
    const logoText = 'Ya Hala Group';
    const coName   = company?.name || '';
    const today    = fmtDateTime(new Date().toISOString(), lang);
    const empName  = lang === 'ar' ? (employee.full_name_ar || employee.full_name) : employee.full_name;
    const isRtl    = dir === 'rtl';

    const summaryBar = isSingle ? '' : `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;">
        ${(['pending','approved','rejected','cancelled'] as const).map(s => {
          const cnt = reqs.filter(r => r.status === s).length;
          const colors: Record<string, string> = { pending:'#b45309', approved:'#15803d', rejected:'#dc2626', cancelled:'#64748b' };
          const labels: Record<string, string> = {
            pending:   lang === 'ar' ? 'معلق'    : 'Pending',
            approved:  lang === 'ar' ? 'موافق'   : 'Approved',
            rejected:  lang === 'ar' ? 'مرفوض'  : 'Rejected',
            cancelled: lang === 'ar' ? 'ملغي'    : 'Cancelled'
          };
          return `<div style="padding:10px 18px;border-radius:8px;background:${colors[s]}10;border:1px solid ${colors[s]}30;text-align:center;min-width:80px;">
            <p style="font-size:22px;font-weight:800;color:${colors[s]};margin:0;">${cnt}</p>
            <p style="font-size:10px;color:${colors[s]};margin:2px 0 0;text-transform:uppercase;letter-spacing:.04em;">${labels[s]}</p>
          </div>`;
        }).join('')}
        <div style="padding:10px 18px;border-radius:8px;background:#0f172a10;border:1px solid #0f172a20;text-align:center;min-width:80px;">
          <p style="font-size:22px;font-weight:800;color:#0f172a;margin:0;">${reqs.length}</p>
          <p style="font-size:10px;color:#64748b;margin:2px 0 0;text-transform:uppercase;letter-spacing:.04em;">${lang === 'ar' ? 'الإجمالي' : 'Total'}</p>
        </div>
      </div>`;

    return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: ${isRtl ? "'Noto Sans Arabic'," : ""} system-ui, -apple-system, sans-serif;
      font-size: 13px; color: #1e293b; margin: 0; padding: 36px 44px; direction: ${dir};
      background: #fff;
    }
    h1, h2, h3, h4, p { margin: 0; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid #0f172a; }
    .emp-bar { background:#f8fafc; border-radius:10px; padding:16px 20px; margin-bottom:24px; border:1px solid #e2e8f0; }
    .section-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; }
    .print-btn { display:inline-block; margin-bottom:18px; padding:8px 20px; background:#0f172a; color:#fff; border-radius:6px; font-size:13px; cursor:pointer; border:none; }
    .print-btn:hover { background:#1e293b; }
    @media print {
      body { padding: 22px 30px; }
      .no-print { display: none !important; }
      .request-card { break-inside: avoid; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="margin-bottom:16px;">
    <button class="print-btn" onclick="window.print()">🖨️ ${lang === 'ar' ? 'طباعة' : 'Print'}</button>
  </div>

  <!-- Page Header -->
  <div class="page-header">
    <div>
      <h1 style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-.02em;">${logoText}</h1>
      <p style="color:#64748b;font-size:12px;margin-top:3px;">${coName}</p>
    </div>
    <div style="text-align:${isRtl ? 'left' : 'right'};">
      <h2 style="font-size:17px;font-weight:700;color:#0f172a;">${title}</h2>
      <p style="color:#94a3b8;font-size:11px;margin-top:3px;">${lang === 'ar' ? 'صدر في' : 'Generated'}: ${today}</p>
    </div>
  </div>

  <!-- Employee Info Bar -->
  <div class="emp-bar">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;">
      <div>
        <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'الموظف' : 'Employee'}</span>
        <p style="font-weight:700;font-size:15px;margin:3px 0 0;">${empName}</p>
      </div>
      <div>
        <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'الرقم' : 'ID'}</span>
        <p style="font-weight:600;font-size:13px;margin:3px 0 0;font-family:monospace;">${employee.id}</p>
      </div>
      ${employee.position ? `<div>
        <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'المنصب' : 'Position'}</span>
        <p style="font-weight:600;font-size:13px;margin:3px 0 0;">${lang === 'ar' ? (employee.position_ar || employee.position) : employee.position}</p>
      </div>` : ''}
      ${employee.iqama ? `<div>
        <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'الإقامة/الهوية' : 'Iqama / ID'}</span>
        <p style="font-weight:600;font-size:13px;margin:3px 0 0;font-family:monospace;">${employee.iqama}</p>
      </div>` : ''}
      ${employee.hire_date ? `<div>
        <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${lang === 'ar' ? 'تاريخ التوظيف' : 'Hire Date'}</span>
        <p style="font-weight:600;font-size:13px;margin:3px 0 0;">${fmtDate(employee.hire_date, lang)}</p>
      </div>` : ''}
    </div>
  </div>

  ${summaryBar}

  <!-- Requests -->
  <p class="section-label">${isSingle ? (lang === 'ar' ? 'تفاصيل الطلب والسجل الكامل' : 'Request Details & Complete History') : `${reqs.length} ${lang === 'ar' ? 'طلبات' : 'Requests'}`}</p>
  ${bodyHtml}

  <!-- Footer -->
  <div style="margin-top:36px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <p style="font-size:10px;color:#cbd5e1;">${lang === 'ar' ? 'بوابة مجموعة يا هلا — وثيقة سرية' : 'Ya Hala Group E-Portal — Confidential Document'}</p>
    <p style="font-size:10px;color:#cbd5e1;">${today}</p>
  </div>

</body>
</html>`;
  };

  /* ── Print single request ── */
  const printSingle = (req: RequestRecord) => {
    const lang = language;
    const empName = lang === 'ar' ? (employee.full_name_ar || employee.full_name) : employee.full_name;
    const title = `${lang === 'ar' ? 'طلب' : 'Request'} #${req.id.slice(0, 8).toUpperCase()} — ${empName}`;
    const body = buildRequestCardHtml(req, lang === 'ar' ? 'rtl' : 'ltr', true);
    openPrintWindow(wrapInPage(body, title, true, [req]));
  };

  /* ── Print all (filtered) requests ── */
  const printAll = () => {
    const lang = language;
    const dir  = lang === 'ar' ? 'rtl' : 'ltr';
    const empName = lang === 'ar' ? (employee.full_name_ar || employee.full_name) : employee.full_name;
    const title = `${lang === 'ar' ? 'سجل الطلبات' : 'Request History'} — ${empName}`;
    const body = filtered.length === 0
      ? `<p style="text-align:center;color:#94a3b8;padding:40px;">${lang === 'ar' ? 'لا توجد طلبات' : 'No requests found'}</p>`
      : filtered.map(r => buildRequestCardHtml(r, dir, false)).join('');
    openPrintWindow(wrapInPage(body, title, false, filtered));
  };

  /* ─── Stats ─────────────────────────────────────────────────────────── */
  const stats = {
    total:     requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length
  };

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">

      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
        <div>
          <h2 className="text-lg font-bold">
            {t('Request History', 'سجل الطلبات')} — {language === 'ar' ? (employee.full_name_ar || employee.full_name) : employee.full_name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {company?.name} • {t('Employee ID', 'رقم الموظف')}: {employee.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRequests} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('Refresh', 'تحديث')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={printAll}
            disabled={filtered.length === 0}
            className="gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            {t('Print All', 'طباعة الكل')}
          </Button>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 py-3 shrink-0">
        {[
          { key: 'total',     label: t('Total',     'الإجمالي'), color: 'text-foreground',  bg: 'bg-muted/60' },
          { key: 'pending',   label: t('Pending',   'معلق'),      color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { key: 'approved',  label: t('Approved',  'موافق'),     color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { key: 'rejected',  label: t('Rejected',  'مرفوض'),    color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20' },
          { key: 'cancelled', label: t('Cancelled', 'ملغي'),     color: 'text-slate-500',   bg: 'bg-slate-50 dark:bg-slate-800/40' },
        ].map(({ key, label, color, bg }) => (
          <div key={key} className={`rounded-lg p-2.5 text-center ${bg}`}>
            <p className={`text-xl font-bold ${color}`}>{stats[key as keyof typeof stats]}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pb-3 shrink-0">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Search requests…', 'البحث في الطلبات…')}
            className="ps-8 h-8 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 text-sm w-[130px]">
            <SelectValue placeholder={t('Type', 'النوع')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Types',   'جميع الأنواع')}</SelectItem>
            <SelectItem value="leave">{t('Leave',      'إجازة')}</SelectItem>
            <SelectItem value="advance">{t('Advance',  'سلفة')}</SelectItem>
            <SelectItem value="entry">{t('Entry Perm.','خروج وعودة')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-sm w-[130px]">
            <SelectValue placeholder={t('Status', 'الحالة')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses', 'جميع الحالات')}</SelectItem>
            <SelectItem value="pending">{t('Pending',   'معلق')}</SelectItem>
            <SelectItem value="approved">{t('Approved', 'موافق')}</SelectItem>
            <SelectItem value="rejected">{t('Rejected', 'مرفوض')}</SelectItem>
            <SelectItem value="cancelled">{t('Cancelled','ملغي')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="h-8 text-sm w-[110px]">
            <SelectValue placeholder={t('Year', 'السنة')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Years', 'جميع السنوات')}</SelectItem>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Date Range Filter ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pb-3 shrink-0 items-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{t('Date range:', 'نطاق التاريخ:')}</span>
        <input
          type="date"
          value={filterDateFrom}
          onChange={e => setFilterDateFrom(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          title={t('From', 'من')}
        />
        <span className="text-xs text-muted-foreground">—</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={e => setFilterDateTo(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          title={t('To', 'إلى')}
        />
        {(filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
            className="h-8 px-2 text-xs rounded-md border border-input hover:bg-muted text-muted-foreground"
          >
            {t('Clear', 'مسح')}
          </button>
        )}
      </div>

      {/* ── Request list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin me-2" />
            {t('Loading…', 'جاري التحميل…')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileText className="w-10 h-10 opacity-30" />
            <p>{t('No requests match your filters', 'لا توجد طلبات تطابق المرشحات')}</p>
          </div>
        ) : (
          filtered.map(req => {
            const st = getStatusConfig(req.status);
            const days = calcDays(req.start_date, req.end_date);
            const isExpanded = expandedId === req.id;
            // In manager context, cancel button only shows if the permission gate is open
            const canCancel = (req.status === 'pending' || req.status === 'approved') &&
              (managerContext ? (managerContext.canCancel === true) : true);

            // Balance restored from activity log
            const totalRestored = Array.isArray(req.activity_log)
              ? req.activity_log.reduce((s, e) => s + (e.balance_restored || 0), 0)
              : 0;

            return (
              <div
                key={req.id}
                className={`border rounded-lg overflow-hidden bg-card transition-all hover:shadow-sm ${
                  req.status === 'cancelled' ? 'border-amber-200 dark:border-amber-800/50' : 'border-border'
                }`}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Type icon */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {req.type === 'leave'   ? <Calendar   className="w-4 h-4 text-indigo-500"  /> :
                     req.type === 'advance' ? <DollarSign className="w-4 h-4 text-emerald-500" /> :
                                              <ExitIcon   className="w-4 h-4 text-amber-500"   />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{getTypeLabel(req)}</span>
                      <Badge className={`text-[10px] px-2 py-0 h-5 gap-1 ${st.labelClass}`}>
                        {st.icon}{st.label}
                      </Badge>
                      {req.status === 'cancelled' && totalRestored > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          ✓ {totalRestored} {t('days restored', 'يوم مُستعاد')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">#{req.id.slice(0, 8).toUpperCase()}</span>
                      <span>{fmtDate(req.created_at, language)}</span>
                      {req.start_date && (
                        <span>
                          {fmtDate(req.start_date, language)}
                          {req.end_date && req.end_date !== req.start_date ? ` → ${fmtDate(req.end_date, language)}` : ''}
                        </span>
                      )}
                      {days != null && <span>{days} {t('days', 'أيام')}</span>}
                      {req.amount != null && <span>{req.amount.toLocaleString()} {t('SAR', 'ر.س')}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      title={t('Print this request (incl. full change history)', 'طباعة هذا الطلب (مع السجل الكامل)')}
                      onClick={() => printSingle(req)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title={t('Cancel request', 'إلغاء الطلب')}
                        onClick={() => { setCancelTarget(req); setCancelReason(''); setCancelReasonAr(''); }}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 bg-muted/20 space-y-3">

                    {/* Cancelled banner */}
                    {req.status === 'cancelled' && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                            {t('This request has been cancelled', 'هذا الطلب ملغي')}
                          </p>
                          {totalRestored > 0 && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                              ✓ {t(`${totalRestored} annual leave day(s) restored to balance`, `تمت استعادة ${totalRestored} يوم إجازة سنوية إلى الرصيد`)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Key details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {req.start_date && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t('Start Date', 'تاريخ البدء')}</p>
                          <p className="font-medium">{fmtDate(req.start_date, language)}</p>
                        </div>
                      )}
                      {req.end_date && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t('End Date', 'تاريخ الانتهاء')}</p>
                          <p className="font-medium">{fmtDate(req.end_date, language)}</p>
                        </div>
                      )}
                      {days != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t('Duration', 'المدة')}</p>
                          <p className="font-medium">{days} {t('day(s)', 'يوم(أيام)')}</p>
                        </div>
                      )}
                      {req.amount != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t('Amount', 'المبلغ')}</p>
                          <p className="font-medium">{req.amount.toLocaleString()} {t('SAR', 'ر.س')}</p>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {req.notes && (
                      <div className="rounded-md bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-muted-foreground mb-1">{t('Employee Reason / Notes', 'سبب / ملاحظات الموظف')}</p>
                        <p className="text-sm">{req.notes}</p>
                      </div>
                    )}
                    {req.admin_notes && (
                      <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">{t('HR Notes', 'ملاحظات شؤون الموظفين')}</p>
                        <p className="text-sm">{req.admin_notes}</p>
                      </div>
                    )}

                    {/* ── Complete change history timeline (in UI) ── */}
                    {Array.isArray(req.activity_log) && req.activity_log.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                          {t('Complete Change History', 'سجل التغييرات الكامل')}
                        </p>

                        {/* Submission event */}
                        <div className="flex gap-3 items-start mb-3">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 flex items-center justify-center text-xs">📋</div>
                            <div className="w-0.5 flex-1 bg-border mt-1 min-h-[12px]" />
                          </div>
                          <div className="pb-3 flex-1">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{t('Request Submitted', 'تقديم الطلب')}</p>
                            <p className="text-xs text-muted-foreground">{fmtDateTime(req.created_at, language)}</p>
                            {req.notes && <p className="text-xs italic text-muted-foreground mt-0.5">"{req.notes}"</p>}
                          </div>
                        </div>

                        {req.activity_log.map((entry, idx) => {
                          const isLast = idx === req.activity_log!.length - 1;
                          const actor = language === 'ar'
                            ? (entry.performed_by_name_ar || entry.performed_by_name || t('System', 'النظام'))
                            : (entry.performed_by_name || t('System', 'النظام'));

                          let icon = '🔄';
                          let colorClass = 'text-indigo-600 dark:text-indigo-400';
                          let borderColor = 'border-indigo-300';
                          let bgClass = 'bg-indigo-50 dark:bg-indigo-900/30';
                          let title = entry.action;

                          if (entry.action === 'approved') {
                            icon = '✅'; colorClass = 'text-emerald-600 dark:text-emerald-400';
                            borderColor = 'border-emerald-400'; bgClass = 'bg-emerald-50 dark:bg-emerald-900/30';
                            title = t('Request Approved', 'تمت الموافقة على الطلب');
                          } else if (entry.action === 'rejected') {
                            icon = '❌'; colorClass = 'text-red-600 dark:text-red-400';
                            borderColor = 'border-red-400'; bgClass = 'bg-red-50 dark:bg-red-900/30';
                            title = t('Request Rejected', 'تم رفض الطلب');
                          } else if (entry.action === 'cancelled') {
                            icon = '🚫'; colorClass = 'text-slate-600 dark:text-slate-400';
                            borderColor = 'border-slate-400'; bgClass = 'bg-slate-50 dark:bg-slate-800/50';
                            title = t('Self-Cancelled by Employee', 'إلغاء ذاتي من الموظف');
                          } else if (entry.action === 'cancelled_by_admin') {
                            icon = '🚫'; colorClass = 'text-amber-700 dark:text-amber-400';
                            borderColor = 'border-amber-400'; bgClass = 'bg-amber-50 dark:bg-amber-900/30';
                            title = t('Cancelled by HR / Admin', 'إلغاء من شؤون الموظفين');
                          }

                          return (
                            <div key={entry.id || idx} className="flex gap-3 items-start">
                              <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full border-2 ${borderColor} ${bgClass} flex items-center justify-center text-xs`}>
                                  {icon}
                                </div>
                                {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[12px]" />}
                              </div>
                              <div className={`${isLast ? 'pb-0' : 'pb-3'} flex-1`}>
                                <p className={`text-xs font-semibold ${colorClass}`}>{title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {actor}
                                  {entry.performed_by_role && (
                                    <span className="opacity-60"> · {entry.performed_by_role}</span>
                                  )}
                                  {' · '}{fmtDateTime(entry.timestamp, language)}
                                </p>
                                {entry.previous_status && (
                                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                                    {t('Previous status', 'الحالة السابقة')}: {entry.previous_status}
                                  </p>
                                )}
                                {(entry.notes || (entry.action === 'cancelled_by_admin' && req.cancel_reason)) && (
                                  <p className="text-xs italic text-muted-foreground mt-0.5">
                                    "{entry.notes || req.cancel_reason}"
                                  </p>
                                )}
                                {entry.balance_restored != null && entry.balance_restored > 0 && (
                                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {t(`${entry.balance_restored} leave day(s) restored to balance`, `تمت استعادة ${entry.balance_restored} يوم إجازة إلى الرصيد`)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Cancel Confirmation Dialog ─────────────────────────────────── */}
      <Dialog open={!!cancelTarget} onOpenChange={open => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {t('Cancel Request', 'إلغاء الطلب')}
            </DialogTitle>
            <DialogDescription>
              {cancelTarget?.status === 'approved'
                ? t(
                    'This request is APPROVED. Cancelling will notify the employee and restore any used annual leave balance.',
                    'هذا الطلب موافق عليه. سيؤدي الإلغاء إلى إشعار الموظف واستعادة رصيد الإجازة السنوية المستخدم.'
                  )
                : t(
                    'Are you sure you want to cancel this pending request? The employee will be notified.',
                    'هل أنت متأكد من إلغاء هذا الطلب المعلق؟ سيتم إشعار الموظف.'
                  )}
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1.5 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Type', 'النوع')}</span>
                  <span className="font-medium">{getTypeLabel(cancelTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Status', 'الحالة')}</span>
                  <Badge className={`text-xs ${getStatusConfig(cancelTarget.status).labelClass}`}>
                    {getStatusConfig(cancelTarget.status).label}
                  </Badge>
                </div>
                {cancelTarget.start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Date', 'التاريخ')}</span>
                    <span>
                      {fmtDate(cancelTarget.start_date, language)}
                      {cancelTarget.end_date ? ` → ${fmtDate(cancelTarget.end_date, language)}` : ''}
                    </span>
                  </div>
                )}
                {cancelTarget.amount != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Amount', 'المبلغ')}</span>
                    <span>{cancelTarget.amount.toLocaleString()} {t('SAR', 'ر.س')}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('Cancellation Reason (English)', 'سبب الإلغاء (بالإنجليزية)')}</Label>
                <Textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder={t('e.g., Employee emailed to cancel due to changed plans', 'مثال: أرسل الموظف بريداً إلكترونياً للإلغاء بسبب تغيير الخطط')}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Cancellation Reason (Arabic)', 'سبب الإلغاء (بالعربية)')}</Label>
                <Textarea
                  value={cancelReasonAr}
                  onChange={e => setCancelReasonAr(e.target.value)}
                  placeholder="مثال: طلب الموظف الإلغاء عبر البريد الإلكتروني بسبب تغيير الخطط"
                  rows={2}
                  dir="rtl"
                  className="text-sm resize-none"
                />
              </div>

              {cancelTarget.status === 'approved' &&
                cancelTarget.type === 'leave' &&
                (cancelTarget.sub_type === 'annual' || cancelTarget.leave_type === 'annual') && (
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      {t(
                        `${calcDays(cancelTarget.start_date, cancelTarget.end_date) ?? 0} annual leave day(s) will be automatically restored to the employee's balance.`,
                        `سيتم استعادة ${calcDays(cancelTarget.start_date, cancelTarget.end_date) ?? 0} يوم إجازة سنوية تلقائياً إلى رصيد الموظف.`
                      )}
                    </span>
                  </div>
                )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancelTarget(null)} disabled={isCancelling}>
                  {t('Keep Request', 'الإبقاء على الطلب')}
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={isCancelling}>
                  {isCancelling
                    ? t('Cancelling…', 'جارٍ الإلغاء…')
                    : t('Confirm Cancellation', 'تأكيد الإلغاء')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
