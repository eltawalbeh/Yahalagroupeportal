import React from 'react';
import {
  BarChart3,
  Building2,
  Users,
  Mail,
  Lock,
  Database,
  Server,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CompanySettings } from './CompanySettings';
import { HRPermissionsManager } from './HRPermissionsManager';
import { SoftDeleteManager } from './SoftDeleteManager';
import { ServerConnectivityTest } from './ServerConnectivityTest';
import { EmailTester } from './EmailTester';
import { PasswordResetRequests } from './PasswordResetRequests';
import { AdminSettings } from './AdminSettings';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

type SectionId =
  | 'overview'
  | 'company'
  | 'permissions'
  | 'email'
  | 'security'
  | 'data'
  | 'diagnostics'
  | 'danger';

interface SectionMeta {
  id: SectionId;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  isDanger?: boolean;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'overview',
    labelEn: 'System Overview',
    labelAr: 'نظرة عامة على النظام',
    descEn: 'Live stats & activity metrics',
    descAr: 'إحصائيات مباشرة ومؤشرات النشاط',
    icon: BarChart3,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    id: 'company',
    labelEn: 'Company Config',
    labelAr: 'إعدادات الشركة',
    descEn: 'Work hours, leaves, advances & holidays',
    descAr: 'ساعات العمل، الإجازات، السلف والعطل',
    icon: Building2,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'permissions',
    labelEn: 'HR Permissions',
    labelAr: 'صلاحيات الموارد البشرية',
    descEn: 'Control HR manager access levels',
    descAr: 'التحكم في مستويات وصول مديري الموارد البشرية',
    icon: Users,
    iconColor: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    id: 'email',
    labelEn: 'Email System',
    labelAr: 'نظام البريد الإلكتروني',
    descEn: 'Test & configure email notifications',
    descAr: 'اختبار وتهيئة إشعارات البريد الإلكتروني',
    icon: Mail,
    iconColor: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
  },
  {
    id: 'security',
    labelEn: 'Security',
    labelAr: 'الأمان',
    descEn: 'Password management & reset requests',
    descAr: 'إدارة كلمات المرور وطلبات الإعادة',
    icon: Lock,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    id: 'data',
    labelEn: 'Data Management',
    labelAr: 'إدارة البيانات',
    descEn: 'Soft delete manager & activity logs',
    descAr: 'الحذف المؤقت وسجلات النشاط',
    icon: Database,
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    id: 'diagnostics',
    labelEn: 'Diagnostics',
    labelAr: 'التشخيص',
    descEn: 'Server connectivity & health checks',
    descAr: 'اتصال الخادم وفحوصات السلامة',
    icon: Server,
    iconColor: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    id: 'danger',
    labelEn: 'Danger Zone',
    labelAr: 'منطقة الخطر',
    descEn: 'Destructive & irreversible actions',
    descAr: 'الإجراءات التدميرية وغير القابلة للتراجع',
    icon: AlertTriangle,
    iconColor: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    isDanger: true,
  },
];

function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'overview':
      return <AdminSettings sections={['stats']} />;
    case 'company':
      return <CompanySettings />;
    case 'permissions':
      return <HRPermissionsManager />;
    case 'email':
      return <EmailTester />;
    case 'security':
      return (
        <div className="space-y-8">
          <AdminSettings sections={['security']} />
          <div className="border-t border-border pt-6">
            <PasswordResetRequests />
          </div>
        </div>
      );
    case 'data':
      return (
        <div className="space-y-8">
          <AdminSettings sections={['maintenance']} />
          <div className="border-t border-border pt-6">
            <SoftDeleteManager />
          </div>
        </div>
      );
    case 'diagnostics':
      return <ServerConnectivityTest />;
    case 'danger':
      return <AdminSettings sections={['danger']} />;
    default:
      return null;
  }
}

interface SettingsPageProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function SettingsPage({ activeSection = 'overview', onSectionChange }: SettingsPageProps) {
  const { t, language } = useLanguage();

  const activeMeta = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">{t('Settings', 'الإعدادات')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('Manage system configuration and preferences', 'إدارة تهيئة النظام والتفضيلات')}
          </p>
        </div>
      </div>

      {/* ── Mobile section switcher (horizontal scroll pills) ── */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange?.(section.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
                isActive
                  ? section.isDanger
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <section.icon className="h-3.5 w-3.5 shrink-0" />
              {language === 'ar' ? section.labelAr : section.labelEn}
            </button>
          );
        })}
      </div>

      {/* ── Content Panel ── */}
      <div>
        {/* Section header banner */}
        <div
          className={cn(
            'rounded-2xl p-5 mb-6 flex items-center gap-4',
            activeMeta.bgColor
          )}
        >
          <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-white/60 dark:bg-black/20 shadow-sm shrink-0">
            <activeMeta.icon className={cn('h-5 w-5', activeMeta.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-bold text-base',
                activeMeta.isDanger ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'
              )}
            >
              {language === 'ar' ? activeMeta.labelAr : activeMeta.labelEn}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {language === 'ar' ? activeMeta.descAr : activeMeta.descEn}
            </p>
          </div>
          {activeMeta.isDanger && (
            <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 shrink-0">
              {t('High Risk', 'خطر عالٍ')}
            </Badge>
          )}
        </div>

        {/* Dynamic section content */}
        <SectionContent id={activeSection as SectionId} />
      </div>
    </div>
  );
}
