import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Edit2, Pin, PinOff, Eye, AlertTriangle, Info, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
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
  delivery_channel?: 'system' | 'email' | 'both';
  image_url?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
}

interface Company {
  id: number;
  name: string;
  slug: string;
}

interface ReadReceipt {
  announcement_id: string;
  employee_id: number;
  employee_name: string;
  employee_name_ar?: string;
  read_at: string;
}

type FormData = {
  title: string;
  title_ar: string;
  message: string;
  message_ar: string;
  priority: 'urgent' | 'important' | 'info';
  company_ids: number[];
  pinned: boolean;
  delivery_channel: 'system' | 'email' | 'both';
};

const EMPTY_FORM: FormData = {
  title: '',
  title_ar: '',
  message: '',
  message_ar: '',
  priority: 'info',
  company_ids: [],
  pinned: false,
  delivery_channel: 'system',
};

/** HR Announcement Board — uses employee session token (not admin token) */
export function HRAnnouncementBoard() {
  const { t, language } = useLanguage();
  const { employee } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptsModalOpen, setIsReceiptsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  // HR fetch helper — no custom headers beyond Authorization + Content-Type
  const hrFetch = (path: string, init: RequestInit = {}) =>
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> || {}),
      },
    });

  useEffect(() => {
    fetchAnnouncements();
    fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await hrFetch(`/manager/hr-announcements?employee_id=${employee?.id}`);
      const data = await response.json();
      if (data.success) setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/companies`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.message) {
      toast.error(t('Please fill in all required fields', 'يرجى ملء جميع الحقول المطلوبة'));
      return;
    }
    try {
      const response = await hrFetch('/manager/hr-announcements', {
        method: 'POST',
        body: JSON.stringify({ ...formData, created_by_employee_id: employee?.id }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Announcement created successfully', 'تم إنشاء الإعلان بنجاح'));
        setIsCreateModalOpen(false);
        resetForm();
        fetchAnnouncements();
      } else {
        toast.error(data.message || t('Failed to create announcement', 'فشل إنشاء الإعلان'));
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error(t('Failed to create announcement', 'فشل إنشاء الإعلان'));
    }
  };

  const handleEdit = async () => {
    if (!editingAnnouncement) return;
    try {
      const response = await hrFetch(`/manager/hr-announcements/${editingAnnouncement.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...formData, employee_id: employee?.id }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Announcement updated successfully', 'تم تحديث الإعلان بنجاح'));
        setIsEditModalOpen(false);
        setEditingAnnouncement(null);
        resetForm();
        fetchAnnouncements();
      } else {
        toast.error(data.message || t('Failed to update announcement', 'فشل تحديث الإعلان'));
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error(t('Failed to update announcement', 'فشل تحديث الإعلان'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this announcement?', 'هل أنت متأكد من حذف هذا الإعلان؟'))) return;
    try {
      const response = await hrFetch(`/manager/hr-announcements/${id}?employee_id=${employee?.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(t('Announcement deleted successfully', 'تم حذف الإعلان بنجاح'));
        fetchAnnouncements();
      } else {
        toast.error(t('Failed to delete announcement', 'فشل حذف الإعلان'));
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const togglePin = async (announcement: Announcement) => {
    try {
      const response = await hrFetch(`/manager/hr-announcements/${announcement.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned: !announcement.pinned, employee_id: employee?.id }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(announcement.pinned
          ? t('Announcement unpinned', 'تم إلغاء تثبيت الإعلان')
          : t('Announcement pinned', 'تم تثبيت الإعلان')
        );
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const viewReadReceipts = async (announcementId: string) => {
    try {
      const response = await hrFetch(`/manager/hr-announcements/${announcementId}/receipts?employee_id=${employee?.id}`);
      const data = await response.json();
      if (data.success) {
        setReadReceipts(data.receipts || []);
        setIsReceiptsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching read receipts:', error);
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      title_ar: announcement.title_ar || '',
      message: announcement.message,
      message_ar: announcement.message_ar || '',
      priority: announcement.priority,
      company_ids: announcement.company_ids || [],
      pinned: announcement.pinned,
      delivery_channel: announcement.delivery_channel || 'system',
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => setFormData(EMPTY_FORM);

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string; labelAr: string }> = {
      urgent:    { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" />, label: 'Urgent',    labelAr: 'عاجل' },
      important: { variant: 'default',     icon: <Bell className="h-3 w-3" />,          label: 'Important', labelAr: 'مهم' },
      info:      { variant: 'secondary',   icon: <Info className="h-3 w-3" />,          label: 'Info',      labelAr: 'معلومات' },
    };
    const config = variants[priority] || variants.info;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {t(config.label, config.labelAr)}
      </Badge>
    );
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':    return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'important': return <Bell className="h-5 w-5 text-primary" />;
      default:          return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Render function (NOT a component) so it shares state without remounting on every render
  const renderAnnouncementForm = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>{t('Priority', 'الأولوية')} *</Label>
        <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="info">{t('Info', 'معلومات')}</SelectItem>
            <SelectItem value="important">{t('Important', 'مهم')}</SelectItem>
            <SelectItem value="urgent">{t('Urgent', 'عاجل')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Title (English)', 'العنوان (إنجليزي)')} *</Label>
          <Input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder={t('Enter title', 'أدخل العنوان')} />
        </div>
        <div className="space-y-2">
          <Label>{t('Title (Arabic)', 'العنوان (عربي)')}</Label>
          <Input value={formData.title_ar} onChange={e => setFormData(prev => ({ ...prev, title_ar: e.target.value }))} placeholder={t('Enter Arabic title', 'أدخل العنوان بالعربية')} dir="rtl" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('Message (English)', 'الرسالة (إنجليزي)')} *</Label>
          <Textarea value={formData.message} onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))} placeholder={t('Enter message', 'أدخل الرسالة')} rows={4} />
        </div>
        <div className="space-y-2">
          <Label>{t('Message (Arabic)', 'الرسالة (عربي)')}</Label>
          <Textarea value={formData.message_ar} onChange={e => setFormData(prev => ({ ...prev, message_ar: e.target.value }))} placeholder={t('Enter Arabic message', 'أدخل الرسالة بالعربية')} rows={4} dir="rtl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('Target Companies', 'الشركات المستهدفة')}</Label>
        <p className="text-xs text-muted-foreground">{t('Leave empty to send to all companies', 'اترك فارغاً للإرسال إلى جميع الشركات')}</p>
        <div className="space-y-2">
          {companies.map(company => (
            <div key={company.id} className="flex items-center gap-2">
              <Checkbox
                checked={formData.company_ids.includes(company.id)}
                onCheckedChange={checked => {
                  setFormData(prev => ({
                    ...prev,
                    company_ids: checked
                      ? [...prev.company_ids, company.id]
                      : prev.company_ids.filter(id => id !== company.id),
                  }));
                }}
              />
              <Label className="cursor-pointer">{company.name}</Label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={formData.pinned} onCheckedChange={checked => setFormData(prev => ({ ...prev, pinned: checked as boolean }))} />
        <Label className="cursor-pointer">{t('Pin this announcement to the top', 'تثبيت هذا الإعلان في الأعلى')}</Label>
      </div>
      <div className="space-y-2">
        <Label>{t('Delivery Channel', 'قناة التوصيل')}</Label>
        <Select value={formData.delivery_channel} onValueChange={(value: any) => setFormData(prev => ({ ...prev, delivery_channel: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{t('System Notification', 'إشعار النظام')}</SelectItem>
            <SelectItem value="email">{t('Email', 'بريد إلكتروني')}</SelectItem>
            <SelectItem value="both">{t('Both', 'كلاهما')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-teal-600" />
            {t('Announcement Board', 'لوحة الإعلانات')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Create and manage company announcements on behalf of management', 'إنشاء وإدارة إعلانات الشركة بالنيابة عن الإدارة')}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 me-2" />
          {t('New Announcement', 'إعلان جديد')}
        </Button>
      </div>

      {/* HR notice banner */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
        <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
        <p className="text-sm text-teal-700 dark:text-teal-400">
          {t(
            'You have HR permission to create and manage announcements. Announcements will be visible to all employees.',
            'لديك صلاحية الموارد البشرية لإنشاء وإدارة الإعلانات. ستكون الإعلانات مرئية لجميع الموظفين.'
          )}
        </p>
      </div>

      {/* Announcements list */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('Loading...', 'جاري التحميل...')}</p>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground">{t('No announcements yet', 'لا توجد إعلانات بعد')}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('Create your first announcement to notify employees', 'أنشئ أول إعلان لإخطار الموظفين')}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => (
            <Card key={announcement.id} className={`p-6 ${announcement.pinned ? 'border-teal-500 border-2' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getPriorityIcon(announcement.priority)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">
                          {language === 'ar' && announcement.title_ar ? announcement.title_ar : announcement.title}
                        </h3>
                        {announcement.pinned && (
                          <Badge variant="outline" className="gap-1">
                            <Pin className="h-3 w-3" />
                            {t('Pinned', 'مثبت')}
                          </Badge>
                        )}
                        {getPriorityBadge(announcement.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' && announcement.message_ar ? announcement.message_ar : announcement.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span>{t('Posted', 'تاريخ النشر')}: {new Date(announcement.created_at).toLocaleDateString()}</span>
                    {announcement.company_ids && announcement.company_ids.length > 0 && (
                      <span>{t('Companies', 'الشركات')}: {announcement.company_ids.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => viewReadReceipts(announcement.id)}>
                      <Eye className="h-4 w-4 me-2" />
                      {t('View Receipts', 'عرض الإيصالات')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => togglePin(announcement)}>
                      {announcement.pinned
                        ? <><PinOff className="h-4 w-4 me-2" /> {t('Unpin', 'إلغاء التثبيت')}</>
                        : <><Pin className="h-4 w-4 me-2" /> {t('Pin', 'تثبيت')}</>
                      }
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(announcement)}>
                      <Edit2 className="h-4 w-4 me-2" />
                      {t('Edit', 'تعديل')}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(announcement.id)}>
                      <Trash2 className="h-4 w-4 me-2" />
                      {t('Delete', 'حذف')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={open => { setIsCreateModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Create New Announcement', 'إنشاء إعلان جديد')}</DialogTitle>
            <DialogDescription>{t('Fill in the details below to create an announcement', 'املأ التفاصيل أدناه لإنشاء إعلان')}</DialogDescription>
          </DialogHeader>
          {renderAnnouncementForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 text-white">{t('Create Announcement', 'إنشاء الإعلان')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={open => { setIsEditModalOpen(open); if (!open) { setEditingAnnouncement(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Announcement', 'تعديل الإعلان')}</DialogTitle>
            <DialogDescription>{t('Update the announcement details below', 'قم بتحديث تفاصيل الإعلان أدناه')}</DialogDescription>
          </DialogHeader>
          {renderAnnouncementForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); resetForm(); }}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleEdit} className="bg-teal-600 hover:bg-teal-700 text-white">{t('Update Announcement', 'تحديث الإعلان')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read Receipts Modal */}
      <Dialog open={isReceiptsModalOpen} onOpenChange={setIsReceiptsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Read Receipts', 'إيصالات القراءة')}</DialogTitle>
            <DialogDescription>{t('Employees who have read this announcement', 'الموظفون الذين قرأوا هذا الإعلان')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-2">
            {readReceipts.length > 0 ? readReceipts.map((receipt, idx) => (
              <div key={`${receipt.announcement_id}-${receipt.employee_id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border">
                <p className="text-sm font-medium">
                  {language === 'ar' ? receipt.employee_name_ar || receipt.employee_name : receipt.employee_name}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(receipt.read_at).toLocaleDateString()}</p>
              </div>
            )) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {t('No reads yet', 'لم يقرأها أحد بعد')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


