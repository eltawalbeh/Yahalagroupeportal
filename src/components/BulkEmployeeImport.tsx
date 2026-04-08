import React, { useState, useRef } from 'react';
import {
  Upload, Download, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, FileText, X, Info, ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { adminFetch } from '../utils/adminApi';
import { toast } from 'sonner@2.0.3';

/* ─── CSV Column Definitions ─────────────────────────────────────────────── */
const CSV_COLUMNS = [
  // Required
  { key: 'id',                label: 'ID',                 required: true,  example: '10001' },
  { key: 'full_name',         label: 'Full Name (EN)',      required: true,  example: 'Ahmed Al-Rashidi' },
  { key: 'email',             label: 'Email',               required: true,  example: 'ahmed@yahala.co' },
  { key: 'company_id',        label: 'Company ID',          required: true,  example: '1' },
  // Personal
  { key: 'full_name_ar',      label: 'Full Name (AR)',      required: false, example: 'أحمد الراشدي' },
  { key: 'phone',             label: 'Phone',               required: false, example: '+966501234567' },
  { key: 'nationality',       label: 'Nationality',         required: false, example: 'Saudi' },
  { key: 'date_of_birth',     label: 'Date of Birth',       required: false, example: '1990-05-15' },
  { key: 'gender',            label: 'Gender',              required: false, example: 'male' },
  { key: 'address',           label: 'Address',             required: false, example: 'Riyadh, KSA' },
  // Employment
  { key: 'position',          label: 'Position (EN)',       required: false, example: 'Operations Manager' },
  { key: 'position_ar',       label: 'Position (AR)',       required: false, example: 'مدير عمليات' },
  { key: 'hire_date',         label: 'Hire Date',           required: false, example: '2023-03-17' },
  { key: 'contract_end_date', label: 'Contract End Date',   required: false, example: '2025-03-17' },
  { key: 'salary',            label: 'Salary (SAR)',        required: false, example: '8500' },
  { key: 'role',              label: 'Role',                required: false, example: 'employee' },
  { key: 'iqama',             label: 'Iqama Number',        required: false, example: '2456789012' },
  // Banking
  { key: 'iban',              label: 'IBAN',                required: false, example: 'SA0380000000608010167519' },
  { key: 'bank_name',         label: 'Bank Name',           required: false, example: 'Al Rajhi Bank' },
  // Emergency
  { key: 'emergency_contact', label: 'Emergency Contact',   required: false, example: 'Mohammed Ahmed' },
  { key: 'emergency_phone',   label: 'Emergency Phone',     required: false, example: '+966509876543' },
  // Documents (extra_info)
  { key: 'passport_number',   label: 'Passport Number',     required: false, example: 'A12345678' },
  { key: 'passport_expiry',   label: 'Passport Expiry',     required: false, example: '2028-06-30' },
  { key: 'iqama_expiry',      label: 'Iqama Expiry',        required: false, example: '2025-09-15' },
  { key: 'work_permit_expiry',label: 'Work Permit Expiry',  required: false, example: '2025-09-15' },
  { key: 'reentry_visa_expiry',label: 'Re-entry Visa Expiry',required: false, example: '2025-07-01' },
  // Leave balances (manual override for implementation year)
  { key: 'annual_balance_override',   label: 'Annual Leave Balance Override', required: false, example: '17' },
  { key: 'sick_balance_override',     label: 'Sick Leave Balance Override',   required: false, example: '7' },
  { key: 'unpaid_balance_override',   label: 'Unpaid Leave Balance Override', required: false, example: '0' },
  // Entry/Exit history
  { key: 'last_exit_date',    label: 'Last Exit/Re-entry Date', required: false, example: '2024-11-20' },
  // Status
  { key: 'status',            label: 'Status',              required: false, example: 'active' },
  { key: 'password',          label: 'Initial Password',    required: false, example: 'Welcome@123' },
];

const EXTRA_INFO_KEYS = new Set(['passport_number','passport_expiry','iqama_expiry','work_permit_expiry','reentry_visa_expiry']);
const BALANCE_KEYS = new Set(['annual_balance_override','sick_balance_override','unpaid_balance_override']);

function generateCSVTemplate(): string {
  const header = CSV_COLUMNS.map(c => c.key).join(',');
  const example = CSV_COLUMNS.map(c => `"${c.example}"`).join(',');
  return `${header}\n${example}`;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string,string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseRow(l);
    const obj: Record<string,string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

interface ValidationResult {
  rowIndex: number;
  row: Record<string, string>;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

function validateRow(row: Record<string, string>, rowIdx: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.id || isNaN(Number(row.id))) errors.push('ID must be a number');
  if (!row.full_name?.trim()) errors.push('Full Name is required');
  if (!row.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Valid email is required');
  if (!row.company_id || isNaN(Number(row.company_id))) errors.push('Company ID must be a number');

  if (row.salary && isNaN(Number(row.salary))) errors.push('Salary must be a number');
  if (row.hire_date && isNaN(Date.parse(row.hire_date))) errors.push('Hire date must be YYYY-MM-DD');
  if (row.date_of_birth && isNaN(Date.parse(row.date_of_birth))) errors.push('Date of birth must be YYYY-MM-DD');
  if (row.passport_expiry && isNaN(Date.parse(row.passport_expiry))) warnings.push('Passport expiry should be YYYY-MM-DD');
  if (row.iqama_expiry && isNaN(Date.parse(row.iqama_expiry))) warnings.push('Iqama expiry should be YYYY-MM-DD');
  if (row.role && !['employee','manager','accountant','owner'].includes(row.role)) warnings.push(`Unknown role "${row.role}" — defaulting to employee`);
  if (row.status && !['active','inactive'].includes(row.status)) warnings.push(`Unknown status "${row.status}" — defaulting to active`);

  return { rowIndex: rowIdx, row, errors, warnings, valid: errors.length === 0 };
}

function buildEmployeePayload(row: Record<string, string>) {
  const extra_info: Record<string, string> = {};
  EXTRA_INFO_KEYS.forEach(k => { if (row[k]) extra_info[k] = row[k]; });

  const balanceOverrides: Record<string, number> = {};
  BALANCE_KEYS.forEach(k => {
    if (row[k] && !isNaN(Number(row[k]))) {
      balanceOverrides[k.replace('_balance_override', '')] = Number(row[k]);
    }
  });

  return {
    id: parseInt(row.id),
    full_name: row.full_name,
    full_name_ar: row.full_name_ar || null,
    email: row.email,
    phone: row.phone || null,
    company_id: parseInt(row.company_id),
    position: row.position || null,
    position_ar: row.position_ar || null,
    hire_date: row.hire_date || null,
    contract_end_date: row.contract_end_date || null,
    salary: row.salary ? parseFloat(row.salary) : null,
    role: row.role || 'employee',
    iqama: row.iqama || null,
    nationality: row.nationality || null,
    date_of_birth: row.date_of_birth || null,
    gender: row.gender || null,
    address: row.address || null,
    iban: row.iban || null,
    bank_name: row.bank_name || null,
    emergency_contact: row.emergency_contact || null,
    emergency_phone: row.emergency_phone || null,
    status: (row.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    password: row.password || undefined,
    extra_info: Object.keys(extra_info).length > 0 ? extra_info : undefined,
    balance_overrides: Object.keys(balanceOverrides).length > 0 ? balanceOverrides : undefined,
  };
}

interface BulkEmployeeImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkEmployeeImport({ open, onClose, onSuccess }: BulkEmployeeImportProps) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ ok: number; failed: number; details: any[] }>({ ok: 0, failed: 0, details: [] });
  const [showErrors, setShowErrors] = useState(true);
  const [showColumnInfo, setShowColumnInfo] = useState(false);

  const downloadTemplate = () => {
    const csv = generateCSVTemplate();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'employee_import_template.csv';
    a.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const { rows } = parseCSV(text);
      const validated = rows.map((r, i) => validateRow(r, i + 2)); // +2 = row number in sheet
      setParsed(validated);
      setStep('preview');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    const valid = parsed.filter(r => r.valid);
    if (valid.length === 0) {
      toast.error(t('No valid rows to import', 'لا توجد صفوف صالحة للاستيراد'));
      return;
    }
    setImporting(true);
    setStep('importing');

    let ok = 0, failed = 0;
    const details: any[] = [];

    for (const v of valid) {
      try {
        const payload = buildEmployeePayload(v.row);
        const res = await adminFetch('/admin/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          ok++;
          details.push({ id: v.row.id, name: v.row.full_name, status: 'ok' });

          // Apply balance overrides if present
          if (payload.balance_overrides && Object.keys(payload.balance_overrides).length > 0 && payload.id) {
            for (const [type, days] of Object.entries(payload.balance_overrides)) {
              await adminFetch(`/admin/leave-balances/${payload.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  leaveType: type,
                  adjustmentDays: days,
                  reason: 'Bulk import — historical balance entry',
                  reasonAr: 'استيراد جماعي — إدخال رصيد تاريخي',
                  adjustedBy: 'System Import',
                }),
              }).catch(e => console.error(`Balance override for ${payload.id}:`, e));
            }
          }
        } else {
          failed++;
          details.push({ id: v.row.id, name: v.row.full_name, status: 'failed', error: data.message });
        }
      } catch (err: any) {
        failed++;
        details.push({ id: v.row.id, name: v.row.full_name, status: 'failed', error: err.message });
      }
    }

    setResults({ ok, failed, details });
    setImporting(false);
    setStep('done');
    if (ok > 0) { onSuccess(); toast.success(t(`Imported ${ok} employees successfully`, `تم استيراد ${ok} موظف بنجاح`)); }
    if (failed > 0) toast.error(t(`${failed} rows failed`, `فشل ${failed} صفوف`));
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setParsed([]);
    setResults({ ok: 0, failed: 0, details: [] });
  };

  const validCount = parsed.filter(r => r.valid).length;
  const errorCount = parsed.filter(r => !r.valid).length;
  const warnCount = parsed.filter(r => r.valid && r.warnings.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            {t('Bulk Employee Import', 'استيراد موظفين بالجملة')}
          </DialogTitle>
          <DialogDescription>
            {t('Upload a CSV file to add multiple employees at once, including historical leave balances and document expiry dates.',
               'ارفع ملف CSV لإضافة عدة موظفين دفعة واحدة مع أرصدة الإجازات التاريخية وتواريخ انتهاء الوثائق.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">

          {/* ── STEP: UPLOAD ── */}
          {(step === 'upload') && (
            <div className="space-y-4">
              {/* Template download */}
              <Card className="p-4 border-dashed border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {t('Step 1: Download the template', 'الخطوة 1: تنزيل النموذج')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('Download and fill in the CSV template with your employee data. Required fields are marked with *.', 
                         'قم بتنزيل نموذج CSV وملء بيانات الموظفين. الحقول المطلوبة مميزة بـ *.')}
                    </p>
                    <Button size="sm" variant="outline" onClick={downloadTemplate} className="mt-2 gap-2 border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300">
                      <Download className="w-3.5 h-3.5" />
                      {t('Download CSV Template', 'تنزيل نموذج CSV')}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Column info toggle */}
              <button
                onClick={() => setShowColumnInfo(!showColumnInfo)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showColumnInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {t('View all column definitions', 'عرض تعريفات جميع الأعمدة')} ({CSV_COLUMNS.length})
              </button>

              {showColumnInfo && (
                <Card className="p-0 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-start font-medium">{t('Column', 'العمود')}</th>
                          <th className="px-3 py-2 text-start font-medium">{t('Required', 'مطلوب')}</th>
                          <th className="px-3 py-2 text-start font-medium">{t('Example', 'مثال')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {CSV_COLUMNS.map(c => (
                          <tr key={c.key} className="hover:bg-muted/20">
                            <td className="px-3 py-1.5 font-mono text-indigo-600 dark:text-indigo-400">{c.key}</td>
                            <td className="px-3 py-1.5">
                              {c.required
                                ? <span className="text-red-600 font-semibold">✓ {t('Yes', 'نعم')}</span>
                                : <span className="text-muted-foreground">{t('No', 'لا')}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{c.example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* File upload */}
              <Card
                className="p-8 border-dashed border-2 border-border hover:border-indigo-400 transition-colors cursor-pointer text-center"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">{t('Click to select CSV file', 'انقر لاختيار ملف CSV')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('or drag and drop', 'أو اسحب وأفلت')}</p>
                <p className="text-xs text-muted-foreground mt-2">CSV, UTF-8 encoded</p>
              </Card>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">{t('File', 'الملف')}: <span className="font-medium">{fileName}</span></span>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 me-1" />{validCount} {t('valid', 'صالح')}
                </Badge>
                {warnCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 me-1" />{warnCount} {t('warnings', 'تحذيرات')}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="w-3 h-3 me-1" />{errorCount} {t('errors', 'أخطاء')}
                  </Badge>
                )}
              </div>

              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {showErrors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showErrors ? t('Hide validation details', 'إخفاء تفاصيل التحقق') : t('Show validation details', 'عرض تفاصيل التحقق')}
              </button>

              {showErrors && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {parsed.map((r, idx) => (
                    <div key={idx} className={`text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${
                      !r.valid ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900' :
                      r.warnings.length > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900' :
                      'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900'
                    }`}>
                      {!r.valid ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" /> :
                       r.warnings.length > 0 ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> :
                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                      <div>
                        <span className="font-medium">Row {r.rowIndex}: {r.row.full_name || '(no name)'}</span>
                        {r.errors.map((e, i) => <div key={i} className="text-red-600 dark:text-red-400">✗ {e}</div>)}
                        {r.warnings.map((w, i) => <div key={i} className="text-amber-600 dark:text-amber-400">⚠ {w}</div>)}
                        {r.valid && r.warnings.length === 0 && <div className="text-emerald-600 dark:text-emerald-400">Ready to import</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-start">#</th>
                        <th className="px-2 py-2 text-start">{t('Status', 'الحالة')}</th>
                        <th className="px-2 py-2 text-start">ID</th>
                        <th className="px-2 py-2 text-start">{t('Name', 'الاسم')}</th>
                        <th className="px-2 py-2 text-start">Email</th>
                        <th className="px-2 py-2 text-start">{t('Company', 'الشركة')}</th>
                        <th className="px-2 py-2 text-start">{t('Hire Date', 'التعيين')}</th>
                        <th className="px-2 py-2 text-start">{t('Salary', 'الراتب')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsed.map((r, idx) => (
                        <tr key={idx} className={!r.valid ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                          <td className="px-2 py-1.5 text-muted-foreground">{r.rowIndex}</td>
                          <td className="px-2 py-1.5">
                            {!r.valid ? <span className="text-red-600">✗</span> :
                             r.warnings.length > 0 ? <span className="text-amber-500">⚠</span> :
                             <span className="text-emerald-500">✓</span>}
                          </td>
                          <td className="px-2 py-1.5 font-mono">{r.row.id}</td>
                          <td className="px-2 py-1.5 font-medium">{r.row.full_name}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{r.row.email}</td>
                          <td className="px-2 py-1.5">{r.row.company_id}</td>
                          <td className="px-2 py-1.5">{r.row.hire_date || '—'}</td>
                          <td className="px-2 py-1.5">{r.row.salary ? `${r.row.salary} SAR` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: IMPORTING ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="font-medium">{t('Importing employees...', 'جاري استيراد الموظفين...')}</p>
              <p className="text-sm text-muted-foreground">
                {t('This may take a moment. Do not close this window.', 'قد يستغرق هذا لحظة. لا تغلق هذه النافذة.')}
              </p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-emerald-600">{results.ok}</p>
                  <p className="text-sm text-muted-foreground">{t('Imported', 'تم استيرادهم')}</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                  <p className="text-sm text-muted-foreground">{t('Failed', 'فشل')}</p>
                </div>
              </div>
              {results.details.filter(d => d.status === 'failed').length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-red-600">{t('Failed rows:', 'الصفوف الفاشلة:')}</p>
                  {results.details.filter(d => d.status === 'failed').map((d, i) => (
                    <div key={i} className="text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded px-3 py-2">
                      <span className="font-medium">ID {d.id} — {d.name}</span>
                      {d.error && <span className="text-red-600 ms-2">{d.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button variant="ghost" onClick={() => { if (step === 'preview') reset(); else { reset(); onClose(); } }}>
            {step === 'preview' ? <><X className="w-4 h-4 me-1.5" />{t('Start Over', 'ابدأ من جديد')}</> : t('Close', 'إغلاق')}
          </Button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Upload className="w-4 h-4" />
                {t(`Import ${validCount} Employees`, `استيراد ${validCount} موظف`)}
              </Button>
            )}
            {step === 'done' && (
              <>
                <Button variant="outline" onClick={reset}>{t('Import More', 'استيراد المزيد')}</Button>
                <Button onClick={() => { reset(); onClose(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {t('Done', 'تم')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
