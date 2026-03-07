import React, { useState } from 'react';
import { Info, Copy, Check, ChevronDown, ChevronUp, Shield, User, Users, Calculator, Crown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from './ui/utils';

interface DemoAccount {
  role: 'admin' | 'manager' | 'accountant' | 'owner' | 'employee';
  roleLabel: string;
  roleLabelAr: string;
  id: string;
  password: string;
  name: string;
  nameAr: string;
  company?: string;
  portal: string;
  portalAr: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'admin',
    roleLabel: 'Super Admin',
    roleLabelAr: 'مدير النظام',
    id: '031984',
    password: 'aaaa@1237',
    name: 'Super Admin',
    nameAr: 'المسؤول الأعلى',
    portal: 'Admin Dashboard',
    portalAr: 'لوحة تحكم المسؤول',
  },
  {
    role: 'manager',
    roleLabel: 'Manager',
    roleLabelAr: 'مدير',
    id: '10002',
    password: 'demo123',
    name: 'Fatima Al-Zahrani',
    nameAr: 'فاطمة الزهراني',
    company: 'Ya Hala for Travel & Tours',
    portal: 'HR Portal',
    portalAr: 'بوابة الموارد البشرية',
  },
  {
    role: 'accountant',
    roleLabel: 'Accountant',
    roleLabelAr: 'محاسب',
    id: '10003',
    password: 'demo123',
    name: 'Mohammed Bin Ali',
    nameAr: 'محمد بن علي',
    company: 'AlEtihad for Tours & Travel',
    portal: 'HR Portal',
    portalAr: 'بوابة الموارد البشرية',
  },
  {
    role: 'owner',
    roleLabel: 'Owner',
    roleLabelAr: 'المالك',
    id: '10005',
    password: 'demo123',
    name: 'Khalid Al-Harbi',
    nameAr: 'خالد الحربي',
    company: 'Ya Hala for Travel & Tours',
    portal: 'HR Portal',
    portalAr: 'بوابة الموارد البشرية',
  },
  {
    role: 'employee',
    roleLabel: 'Employee',
    roleLabelAr: 'موظف',
    id: '10001',
    password: 'demo123',
    name: 'Ahmed Al-Saud',
    nameAr: 'أحمد السعود',
    company: 'Ya Hala for Travel & Tours',
    portal: 'Employee Portal',
    portalAr: 'بوابة الموظفين',
  },
  {
    role: 'employee',
    roleLabel: 'Employee',
    roleLabelAr: 'موظف',
    id: '10004',
    password: 'demo123',
    name: 'Sarah Al-Mutairi',
    nameAr: 'سارة المطيري',
    company: 'AlEtihad for Tours & Travel',
    portal: 'Employee Portal',
    portalAr: 'بوابة الموظفين',
  },
];

const roleConfig = {
  admin: {
    icon: Shield,
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    icon_color: 'text-indigo-600 dark:text-indigo-400',
  },
  manager: {
    icon: Users,
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-800',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
    icon_color: 'text-teal-600 dark:text-teal-400',
  },
  accountant: {
    icon: Calculator,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    icon_color: 'text-emerald-600 dark:text-emerald-400',
  },
  owner: {
    icon: Crown,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    icon_color: 'text-amber-600 dark:text-amber-400',
  },
  employee: {
    icon: User,
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    icon_color: 'text-slate-500 dark:text-slate-400',
  },
};

interface CopyButtonProps {
  text: string;
  label: string;
}

function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    >
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground" />
      }
    </button>
  );
}

interface DemoInfoProps {
  onFillCredentials?: (id: string, password: string) => void;
}

export function DemoInfo({ onFillCredentials }: DemoInfoProps) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/20 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {t('Demo Accounts', 'حسابات تجريبية')}
          </span>
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
            {DEMO_ACCOUNTS.length}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-blue-500" />
          : <ChevronDown className="w-4 h-4 text-blue-500" />
        }
      </button>

      {/* Accounts list */}
      {expanded && (
        <div className="border-t border-blue-200 dark:border-blue-900/50 divide-y divide-blue-100 dark:divide-blue-900/30">
          {DEMO_ACCOUNTS.map((account, i) => {
            const cfg = roleConfig[account.role];
            const RoleIcon = cfg.icon;

            return (
              <div
                key={`${account.id}-${i}`}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 transition-colors',
                  onFillCredentials && 'cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/20'
                )}
                onClick={() => onFillCredentials?.(account.id, account.password)}
                title={onFillCredentials ? t('Click to fill credentials', 'انقر لملء بيانات الدخول') : undefined}
              >
                {/* Role icon */}
                <div className={cn('p-1.5 rounded-lg mt-0.5 shrink-0', cfg.bg)}>
                  <RoleIcon className={cn('w-3.5 h-3.5', cfg.icon_color)} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cfg.badge)}>
                      {language === 'ar' ? account.roleLabelAr : account.roleLabel}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {language === 'ar' ? account.nameAr : account.name}
                    </span>
                  </div>
                  {account.company && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {account.company}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    → {language === 'ar' ? account.portalAr : account.portal}
                  </p>
                </div>

                {/* Credentials */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-mono text-[11px] text-foreground/80">{account.id}</span>
                    <CopyButton text={account.id} label="ID" />
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{account.password}</span>
                    <CopyButton text={account.password} label="password" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer hint */}
          {onFillCredentials && (
            <div className="px-4 py-2 bg-blue-100/40 dark:bg-blue-900/20">
              <p className="text-[10px] text-blue-600/70 dark:text-blue-400/60 text-center">
                {t('Click any row to auto-fill credentials', 'انقر على أي صف لملء البيانات تلقائياً')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
