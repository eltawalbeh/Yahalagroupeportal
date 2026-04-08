import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ClipboardCheck,
  UserCircle,
  Search, 
  Menu, 
  LogOut, 
  Globe,
  CalendarDays,
  Building2,
  DollarSign,
  DoorOpen,
  Megaphone,
  FolderOpen,
  Shield,
  Calculator,
  Crown,
  AlertTriangle,
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

interface ManagerLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  pendingCount?: number;
}

// Role badge config
const ROLE_CONFIG: Record<string, { label: string; labelAr: string; icon: any; color: string }> = {
  manager: { label: 'HR Manager', labelAr: 'مدير الموارد البشرية', icon: Users, color: 'text-teal-400' },
  accountant: { label: 'Accountant', labelAr: 'محاسب', icon: Calculator, color: 'text-emerald-400' },
  owner: { label: 'Owner', labelAr: 'المالك', icon: Crown, color: 'text-amber-400' },
  admin: { label: 'Admin', labelAr: 'مسؤول', icon: Shield, color: 'text-indigo-400' },
};

export function ManagerLayout({ children, activePage, onNavigate, pendingCount = 0 }: ManagerLayoutProps) {
  const { t, language, setLanguage } = useLanguage();
  const { employee, logout, company } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleCfg = ROLE_CONFIG[employee?.role || 'manager'] || ROLE_CONFIG.manager;
  const RoleIcon = roleCfg.icon;

  const navigation = [
    { id: 'dashboard', label: t('Dashboard', 'لوحة التحكم'), icon: LayoutDashboard },
    { id: 'requests', label: t('Team Requests', 'طلبات الفريق'), icon: ClipboardCheck, badge: pendingCount },
    { id: 'employees', label: t('Team Members', 'أعضاء الفريق'), icon: Users },
    { id: 'calendar', label: t('Leave Calendar', 'تقويم الإجازات'), icon: CalendarDays },
    { id: 'document-expiry', label: t('Document Expiry', 'انتهاء الوثائق'), icon: AlertTriangle },
    { id: 'announcements', label: t('Announcements', 'التعاميم'), icon: Megaphone },
    { id: 'documents', label: t('Documents', 'المستندات'), icon: FolderOpen },
    { id: 'profile', label: t('My Profile', 'ملفي الشخصي'), icon: UserCircle },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/20">
          <ClipboardCheck className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-tight">Ya Hala Group</h1>
          <p className="text-xs text-teal-400/70 font-medium tracking-wider uppercase">HR Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {t('Menu', 'القائمة')}
        </p>
        {navigation.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-teal-600 text-white shadow-md shadow-teal-900/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ms-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Self-service section */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t('Self Service', 'الخدمة الذاتية')}
          </p>
          {[
            { id: 'leave', label: t('Request Leave', 'طلب إجازة'), icon: FileText },
            { id: 'advance', label: t('Request Advance', 'طلب سلفة'), icon: DollarSign },
            { id: 'entry', label: t('Entry Permission', 'إذن خروج وعودة'), icon: DoorOpen },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 mb-3 px-2">
          <Avatar className="h-9 w-9 border border-slate-700">
            <AvatarImage src={employee?.photo_url} />
            <AvatarFallback className="bg-teal-900/50 text-teal-300">
              {employee?.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {language === 'ar' ? employee?.full_name_ar || employee?.full_name : employee?.full_name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <RoleIcon className={cn("w-3 h-3 shrink-0", roleCfg.color)} />
              <p className={cn("text-xs truncate font-medium", roleCfg.color)}>
                {language === 'ar' ? roleCfg.labelAr : roleCfg.label}
              </p>
            </div>
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
                placeholder={t('Search employees or requests...', 'بحث عن موظفين أو طلبات...')}
                className="bg-transparent border-none outline-none w-56 placeholder:text-muted-foreground/50 text-foreground"
              />
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
            
            {/* Role badge + Company */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-end hidden md:block">
                <p className="text-sm font-semibold leading-none">{company?.name || 'Ya Hala Group'}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <RoleIcon className={cn("w-3 h-3", roleCfg.color)} />
                  <p className={cn("text-[10px] uppercase tracking-wide font-semibold", roleCfg.color)}>
                    {language === 'ar' ? roleCfg.labelAr : roleCfg.label}
                  </p>
                </div>
              </div>
              <Avatar className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800">
                <AvatarImage src={company?.logo_url} />
                <AvatarFallback className="rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
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