/**
 * Local Authentication Storage Utilities
 * Manages Remember Me functionality with 30-day expiration
 */

const REMEMBER_KEY = 'ya_hala_remember';
const SESSION_KEY = 'ya_hala_session';
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface RememberData {
  employeeId: string;
  isAdmin: boolean;
  timestamp: number;
}

interface SessionData {
  employee: any;
  company: any;
}

/**
 * Save remember me data for auto-login
 */
export function saveRemember(employeeId: string, isAdmin: boolean): void {
  const data: RememberData = {
    employeeId,
    isAdmin,
    timestamp: Date.now()
  };
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(data));
}

/**
 * Save employee session data (for non-admin users)
 * Strips sensitive credential fields before persisting.
 */
export function saveEmployeeSession(employee: any, company: any): void {
  // Never store passwords or temp passwords in localStorage
  const { password: _p, temporary_password: _tp, ...safeEmployee } = employee ?? {};
  const data: SessionData = {
    employee: safeEmployee,
    company
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

/**
 * Load remember me data and validate expiration
 * Returns null if expired or invalid
 */
export function loadRemember(): RememberData | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;

    const data: RememberData = JSON.parse(raw);
    
    // Check expiration (30 days)
    if (Date.now() - data.timestamp > TTL) {
      clearRemember();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading remember data:', error);
    clearRemember();
    return null;
  }
}

/**
 * Load employee session data
 */
export function loadEmployeeSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error loading session data:', error);
    return null;
  }
}

/**
 * Clear all remember me and session data
 */
export function clearRemember(): void {
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Check if remember me is active
 */
export function hasRememberMe(): boolean {
  return loadRemember() !== null;
}