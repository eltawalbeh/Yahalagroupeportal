import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Building2, 
  Settings, 
  Search, 
  Menu, 
  LogOut, 
  Files, 
  Megaphone, 
  Globe,
  Shield,
  AppWindow,
  BarChart3,
  Mail,
  Lock,
  Database,
  Server,
  AlertTriangle,
  ChevronRight,
  Plane,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { ThemeToggle } from '../../components/ThemeToggle';
import { NotificationBell } from '../../components/NotificationBell';
import { cn } from '../../components/ui/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  pendingCount?: number;
  settingsSection?: string;
  onSettingsSection?: (section: string) => void;
}

// Settings sub-navigation items
const SETTINGS_SUB_ITEMS = [
  { id: 'overview',     labelEn: 'System Overview',    labelAr: 'نظرة عامة',          icon: BarChart3,      iconColor: 'text-indigo-400',  activeColor: 'text-indigo-300' },
  { id: 'company',      labelEn: 'Company Config',     labelAr: 'إعدادات الشركة',      icon: Building2,      iconColor: 'text-blue-400',    activeColor: 'text-blue-300'   },
  { id: 'permissions',  labelEn: 'HR Permissions',     labelAr: 'صلاحيات الموارد',      icon: Users,          iconColor: 'text-violet-400',  activeColor: 'text-violet-300' },
  { id: 'email',        labelEn: 'Email System',       labelAr: 'نظام البريد',          icon: Mail,           iconColor: 'text-sky-400',     activeColor: 'text-sky-300'    },
  { id: 'security',     labelEn: 'Security',           labelAr: 'الأمان',               icon: Lock,           iconColor: 'text-emerald-400', activeColor: 'text-emerald-300'},
  { id: 'data',         labelEn: 'Data Management',    labelAr: 'إدارة البيانات',       icon: Database,       iconColor: 'text-amber-400',   activeColor: 'text-amber-300'  },
  { id: 'diagnostics',  labelEn: 'Diagnostics',        labelAr: 'التشخيص',              icon: Server,         iconColor: 'text-slate-400',   activeColor: 'text-slate-300'  },
  { id: 'danger',       labelEn: 'Danger Zone',        labelAr: 'منطقة الخطر',          icon: AlertTriangle,  iconColor: 'text-rose-400',    activeColor: 'text-rose-300', isDanger: true },
] as const;

export function AdminLayout({ children, activePage, onNavigate, pendingCount = 0, settingsSection = 'overview', onSettingsSection }: AdminLayoutProps) {
  const { t, language, setLanguage } = useLanguage();
  const { employee, logout, company, adminInfo } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navigation = [
    { id: 'dashboard', label: t('Dashboard', 'لوحة التحكم'), icon: LayoutDashboard },
    { id: 'requests', label: t('Requests', 'الطلبات'), icon: FileText, badge: pendingCount },
    { id: 'employees', label: t('Employees', 'الموظفون'), icon: Users },
    { id: 'ticket-management', label: t('Ticket Management', 'إدارة التذاكر'), icon: Plane },
    { id: 'document-expiry', label: t('Document Expiry', 'انتهاء الوثائق'), icon: AlertTriangle },
    { id: 'services', label: t('Portal Services', 'خدمات البوابة'), icon: AppWindow },
    { id: 'announcements', label: t('Announcements', 'التعاميم'), icon: Megaphone },
    { id: 'companies', label: t('Companies', 'الشركات'), icon: Building2 },
    { id: 'documents', label: t('Documents', 'المستندات'), icon: Files },
    { id: 'settings', label: t('Settings', 'الإعدادات'), icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/20">
          <Shield className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-tight">Ya Hala Group</h1>
          <p className="text-xs text-indigo-400/70 font-medium tracking-wider uppercase">Super Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {t('Menu', 'القائمة')}
        </p>
        {navigation.map((item) => {
          const isActive = activePage === item.id || (item.id === 'requests' && activePage === 'calendar');
          const isSettings = item.id === 'settings';
          const isSettingsActive = isActive && isSettings;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  isSettingsActive
                    ? "bg-slate-800 text-indigo-300"
                    : isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  isSettingsActive ? "text-indigo-400" : isActive ? "text-white" : "text-slate-400"
                )} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ms-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Settings Sub-menu — expands inline when Settings is active */}
              {isSettingsActive && (
                <div className="mt-1 ms-3 ps-3 border-s border-slate-700/60 space-y-0.5">
                  {SETTINGS_SUB_ITEMS.map((sub, idx) => {
                    const isSubActive = settingsSection === sub.id;
                    const showDivider = idx === SETTINGS_SUB_ITEMS.length - 2;
                    return (
                      <div key={sub.id}>
                        {showDivider && (
                          <div className="my-1.5 border-t border-dashed border-slate-700/60" />
                        )}
                        <button
                          onClick={() => {
                            onSettingsSection?.(sub.id);
                            setIsMobileOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 group",
                            isSubActive
                              ? sub.isDanger
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-white/10 text-white"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          )}
                        >
                          <sub.icon
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              isSubActive
                                ? sub.isDanger ? "text-rose-400" : sub.activeColor
                                : "text-slate-500 group-hover:text-slate-400"
                            )}
                          />
                          <span className="truncate">
                            {language === 'ar' ? sub.labelAr : sub.labelEn}
                          </span>
                          {isSubActive && (
                            <ChevronRight className={cn("w-3 h-3 ms-auto shrink-0 opacity-60")} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-slate-700">
            <AvatarImage src={employee?.photo_url} />
            <AvatarFallback className="bg-indigo-900/50 text-indigo-300">
              {adminInfo?.name?.charAt(0) || employee?.full_name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {language === 'ar' 
                ? adminInfo?.name_ar || adminInfo?.name || employee?.full_name_ar || employee?.full_name || 'Admin' 
                : adminInfo?.name || employee?.full_name || 'Admin'}
            </p>
            <p className="text-xs text-indigo-400/60 truncate">
              {t('Super Admin', 'المسؤول الأعلى')}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full border-slate-700 text-slate-300 hover:bg-rose-950/30 hover:text-rose-400 hover:border-rose-900 transition-colors justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          {t('Sign Out', 'تسجيل الخروج')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 border-e border-slate-200 dark:border-slate-800 shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden -ms-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={language === 'ar' ? 'right' : 'left'} className="p-0 w-72 border-r-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            {/* Search */}
            <div className="hidden md:flex items-center text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
              <Search className="w-4 h-4 me-2 opacity-50" />
              <input 
                type="text" 
                placeholder={t('Search anything...', 'بحث عن أي شيء...')}
                className="bg-transparent border-none outline-none w-48 placeholder:text-muted-foreground/50 text-foreground"
              />
              <div className="flex gap-1 ms-2">
                <span className="text-[10px] border rounded px-1.5 py-0.5 bg-background">⌘K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ar')} className={language === 'ar' ? 'bg-accent' : ''}>
                  العربية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
            <NotificationBell />
            
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            
            {/* Company Indicator */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-end hidden md:block">
                <p className="text-sm font-semibold leading-none">{company?.name || 'Ya Hala Group'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">
                  {t('Super Admin', 'المسؤول الأعلى')}
                </p>
              </div>
              <Avatar className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800">
                <AvatarImage src={company?.logo_url} />
                <AvatarFallback className="rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}