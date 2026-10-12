import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'request_approved' | 'request_rejected' | 'request_pending' | 'system' | 'doc_expiry';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [docAlerts, setDocAlerts] = useState<Notification[]>([]);
  const { employee } = useAuth();

  // Combined: server notifications + ephemeral doc expiry alerts
  const allNotifications = [...docAlerts, ...notifications];
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    if (!employee?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/notifications/${employee.id}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      if (!response.ok) {
        if (response.status !== 404) {
          console.error('Error fetching notifications:', response.status);
        }
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Failed to fetch') {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  // Fetch document expiry and inject as synthetic bell notifications (≤50 days)
  const fetchDocAlerts = async () => {
    if (!employee?.id) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee-document-expiry/${employee.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const THRESHOLD = 50;
      const alerts: Notification[] = (data.documents || [])
        .filter((d: any) => d.days_remaining <= THRESHOLD)
        .map((d: any): Notification => {
          const isExpired = d.is_expired;
          const days = d.days_remaining;
          return {
            id: `doc_expiry_${d.field}`,
            type: 'doc_expiry',
            title: isExpired
              ? `${d.label} Expired / ${d.labelAr} منتهية`
              : `${d.label} Expiring Soon / ${d.labelAr} تنتهي قريباً`,
            message: isExpired
              ? `Your ${d.label} expired ${Math.abs(days)} day(s) ago. Please renew immediately. | ${d.labelAr} انتهت منذ ${Math.abs(days)} يوم. يرجى التجديد فوراً.`
              : `Your ${d.label} expires in ${days} day(s) (${d.expiry_date}). | ${d.labelAr} تنتهي خلال ${days} يوم (${d.expiry_date}).`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: { field: d.field, days_remaining: days, expiry_date: d.expiry_date }
          };
        });

      setDocAlerts(alerts);
    } catch (e) {
      // silently fail — doc alerts are non-critical
    }
  };

  const markAsRead = async (id: string) => {
    // Handle synthetic doc expiry notifications locally
    if (id.startsWith('doc_expiry_')) {
      setDocAlerts(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      return;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/notifications/${id}/read`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!employee?.id) return;
    // Mark doc alerts read locally
    setDocAlerts(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/notifications/${employee.id}/read-all`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearNotification = async (id: string) => {
    if (id.startsWith('doc_expiry_')) {
      setDocAlerts(prev => prev.filter(n => n.id !== id));
      return;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/notifications/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
    fetchDocAlerts();
  };

  // Poll for new notifications every 2 minutes; doc alerts every 10 minutes
  useEffect(() => {
    if (employee?.id) {
      fetchNotifications();
      fetchDocAlerts();
      const interval = setInterval(fetchNotifications, 120000);
      const docInterval = setInterval(fetchDocAlerts, 600000);
      return () => { clearInterval(interval); clearInterval(docInterval); };
    }
  }, [employee?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: allNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}