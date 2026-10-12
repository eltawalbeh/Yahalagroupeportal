import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, Info, Bell, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Announcement {
  id: string;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  priority: 'urgent' | 'important' | 'info';
  company_ids: number[];
  pinned: boolean;
  created_at: string;
}

export function AnnouncementView() {
  const { t, language } = useLanguage();
  const { employee } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee?.company_id) {
      fetchAnnouncements();
      loadReadStatus();
    }
  }, [employee?.company_id]);

  const fetchAnnouncements = async () => {
    if (!employee?.company_id) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/announcements?company_id=${employee.company_id}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReadStatus = () => {
    // Load from localStorage
    const storedRead = localStorage.getItem(`announcements_read_${employee?.id}`);
    if (storedRead) {
      setReadAnnouncementIds(new Set(JSON.parse(storedRead)));
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!employee?.id) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/announcements/${announcementId}/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ employee_id: employee.id })
        }
      );
      const data = await response.json();

      if (data.success) {
        // Update local state
        const newReadIds = new Set(readAnnouncementIds);
        newReadIds.add(announcementId);
        setReadAnnouncementIds(newReadIds);

        // Save to localStorage
        localStorage.setItem(
          `announcements_read_${employee.id}`,
          JSON.stringify(Array.from(newReadIds))
        );
      }
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  const dismissAnnouncement = (announcementId: string) => {
    markAsRead(announcementId);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'important':
        return <Bell className="h-5 w-5 text-primary" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string; labelAr: string }> = {
      urgent: { 
        variant: 'destructive' as const, 
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Urgent',
        labelAr: 'عاجل'
      },
      important: { 
        variant: 'default' as const, 
        icon: <Bell className="h-3 w-3" />,
        label: 'Important',
        labelAr: 'مهم'
      },
      info: { 
        variant: 'secondary' as const, 
        icon: <Info className="h-3 w-3" />,
        label: 'Info',
        labelAr: 'معلومات'
      }
    };

    const config = variants[priority] || variants.info;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {t(config.label, config.labelAr)}
      </Badge>
    );
  };

  // Filter out read announcements (except pinned urgent ones)
  const visibleAnnouncements = announcements.filter(a => {
    if (a.pinned && a.priority === 'urgent') return true; // Always show pinned urgent
    return !readAnnouncementIds.has(a.id);
  });

  if (loading) {
    return null;
  }

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <Card 
          key={announcement.id} 
          className={`p-4 ${
            announcement.priority === 'urgent' 
              ? 'border-destructive border-2 bg-destructive/5' 
              : announcement.priority === 'important'
                ? 'border-primary bg-primary/5'
                : ''
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getPriorityIcon(announcement.priority)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium">
                      {language === 'ar' && announcement.title_ar 
                        ? announcement.title_ar 
                        : announcement.title}
                    </h4>
                    {getPriorityBadge(announcement.priority)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' && announcement.message_ar 
                      ? announcement.message_ar 
                      : announcement.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0"
                  onClick={() => dismissAnnouncement(announcement.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </p>
                {!readAnnouncementIds.has(announcement.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead(announcement.id)}
                  >
                    {t('Mark as Read', 'وضع علامة مقروء')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
