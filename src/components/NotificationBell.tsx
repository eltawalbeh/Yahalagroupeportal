import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Notification {
  id: string;
  request_id?: string;
  request_type?: string;
  status?: string;
  message: string;
  message_ar?: string;
  timestamp: string;
  read: boolean;
  type?: string;
  title?: string;
  metadata?: any;
}

export function NotificationBell() {
  const { t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // REMOVED: Duplicate polling - NotificationContext already handles this!
  // No need for fetchNotifications() or setInterval here

  const handleMarkAsRead = async (id: string) => {
    markAsRead(id);
    
    // Also update on server (keep existing logic)
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/notifications/mark-read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ notificationId: id })
        }
      );
    } catch (error) {
      // Silently fail - context will handle it
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    // Context handles the server update
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '';
    switch (status) {
      case 'approved':
        return 'bg-status-approved-bg text-status-approved-fg';
      case 'rejected':
        return 'bg-status-rejected-bg text-status-rejected-fg';
      default:
        return 'bg-status-pending-bg text-status-pending-fg';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('Just now', 'الآن');
    if (diffMins < 60) return t(`${diffMins}m ago`, `منذ ${diffMins} د`);
    if (diffHours < 24) return t(`${diffHours}h ago`, `منذ ${diffHours} س`);
    if (diffDays < 7) return t(`${diffDays}d ago`, `منذ ${diffDays} ي`);
    return date.toLocaleDateString();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative bg-[rgba(255,255,255,0)] text-[rgb(167,167,167)] hover:text-white"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -end-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h3 className="text-base">
            {t('Notifications', 'الإشعارات')}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs"
            >
              {t('Mark all as read', 'تحديد الكل كمقروء')}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t('No notifications yet', 'لا توجد إشعارات بعد')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notification.status && (
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(notification.status)}`}>
                            {t(
                              notification.status.charAt(0).toUpperCase() + notification.status.slice(1),
                              notification.status === 'approved' ? 'موافق عليه' :
                              notification.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'
                            )}
                          </span>
                        )}
                        {notification.type && (
                          <Badge variant={
                            notification.type === 'announcement_urgent' ? 'destructive' :
                            notification.type === 'doc_expiry' ? 'destructive' : 'secondary'
                          } className="text-xs">
                            {notification.type === 'announcement_urgent' ? t('Urgent', 'عاجل') :
                             notification.type === 'doc_expiry' ? (
                               <span className="flex items-center gap-1">
                                 <AlertTriangle className="w-3 h-3" />
                                 {t('Doc Expiry', 'وثيقة')}
                               </span>
                             ) : t('Announcement', 'إعلان')}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm break-words">
                        {t(notification.message, notification.message_ar || notification.message)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}