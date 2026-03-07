import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadRemember, loadEmployeeSession, clearRemember } from '../utils/authLocal';
import { clearAdminToken, hasAdminToken } from '../utils/adminApi';

interface Employee {
  id: number;
  full_name: string;
  full_name_ar?: string;
  iqama?: string;
  phone?: string;
  date_of_birth?: string;
  position?: string;
  position_ar?: string;
  iban?: string;
  bank_name?: string;
  photo_url?: string;
  company_id?: number;
  manager_id?: number;
  role?: 'employee' | 'manager' | 'accountant' | 'owner';
  contract_end_date?: string;
  hire_date?: string;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
}

export interface AdminInfo {
  id: string;
  name: string;
  name_ar: string;
  email?: string;
  role: string;
  employee_id?: number;
}

interface AuthContextType {
  employee: Employee | null;
  company: Company | null;
  isAdmin: boolean;
  adminInfo: AdminInfo | null;
  setAuth: (employee: Employee | null, company: Company | null, isAdmin: boolean, adminInfo?: AdminInfo | null) => void;
  logout: () => void;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_INFO_KEY = 'ya_hala_admin_info';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for saved session on mount (auto-login)
  useEffect(() => {
    const checkSavedSession = () => {
      try {
        const rememberData = loadRemember();
        
        if (!rememberData) {
          setIsInitializing(false);
          return;
        }

        // Handle admin session
        if (rememberData.isAdmin) {
          // Admin sessions also require a valid X-Admin-Token in sessionStorage.
          // If the browser was closed, the token is gone → require fresh login.
          if (!hasAdminToken()) {
            clearRemember();
            setIsInitializing(false);
            return;
          }
          setIsAdmin(true);
          // Restore admin info from sessionStorage
          try {
            const savedAdminInfo = sessionStorage.getItem(ADMIN_INFO_KEY);
            if (savedAdminInfo) {
              setAdminInfo(JSON.parse(savedAdminInfo));
            }
          } catch (e) {
            console.log('Could not restore admin info from session');
          }
          setIsInitializing(false);
          return;
        }

        // Handle employee session
        const sessionData = loadEmployeeSession();
        if (sessionData?.employee && sessionData?.company) {
          setEmployee(sessionData.employee);
          setCompany(sessionData.company);
          setIsAdmin(false);
        } else {
          // Remember data exists but session is missing - clear everything
          clearRemember();
        }
      } catch (error) {
        console.error('Error checking saved session:', error);
        clearRemember();
      } finally {
        setIsInitializing(false);
      }
    };

    checkSavedSession();
  }, []);

  const setAuth = (emp: Employee | null, comp: Company | null, admin: boolean, info?: AdminInfo | null) => {
    setEmployee(emp);
    setCompany(comp);
    setIsAdmin(admin);
    if (info) {
      setAdminInfo(info);
      // Persist admin info to sessionStorage for auto-login restore
      try {
        sessionStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info));
      } catch (e) {
        console.log('Could not persist admin info to session');
      }
    } else if (!admin) {
      setAdminInfo(null);
      sessionStorage.removeItem(ADMIN_INFO_KEY);
    }
  };

  const logout = () => {
    setEmployee(null);
    setCompany(null);
    setIsAdmin(false);
    setAdminInfo(null);
    sessionStorage.removeItem(ADMIN_INFO_KEY);
    clearAdminToken();   // ← Invalidate the admin session token
    clearRemember();
  };

  return (
    <AuthContext.Provider value={{ employee, company, isAdmin, adminInfo, setAuth, logout, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}