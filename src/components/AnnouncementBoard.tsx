import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Edit2, Pin, PinOff, Eye, AlertTriangle, Info, Bell, Mail, BellRing, Image as ImageIcon, X, Upload } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
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
import { adminFetch } from '../utils/adminApi';

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

export function AnnouncementBoard() {
  const { t, language } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptsModalOpen, setIsReceiptsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    message: '',
    message_ar: '',
    priority: 'info' as 'urgent' | 'important' | 'info',
    company_ids: [] as number[],
    pinned: false,
    delivery_channel: 'system' as 'system' | 'email' | 'both',
    image_url: ''
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchCompanies();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await adminFetch('/announcements');
      const data = await response.json();
      
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error(t('Failed to load announcements', 'فشل تحميل الإعلانات'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await adminFetch('/companies');
      const data = await response.json();
      
      if (data.success) {
        setCompanies(data.companies || []);
      }
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
      // Upload image if selected
      let imageUrl = formData.image_url;
      if (selectedImage && !imageUrl) {
        setUploadingImage(true);
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedImage);

        const uploadResponse = await adminFetch('/admin/announcements/upload-image', {
          body: uploadFormData,
        });
        const uploadData = await uploadResponse.json();

        if (uploadData.success) {
          imageUrl = uploadData.imageUrl;
        } else {
          toast.error(t('Failed to upload image', 'فشل تحميل الصورة'));
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const response = await adminFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl || null
        })
      });
      const data = await response.json();

      if (data.success) {
        // Show success with stats
        const stats = data.stats;
        let message = t('Announcement created successfully', 'تم إنشاء الإعلان بنجاح');
        if (stats) {
          message += ` - ${stats.total_employees} ${t('employees', 'موظف')}`;
          if (stats.notifications_created > 0) {
            message += `, ${stats.notifications_created} ${t('notifications', 'إشعار')}`;
          }
          if (stats.emails_sent > 0) {
            message += `, ${stats.emails_sent} ${t('emails sent', 'بريد مرسل')}`;
          }
        }
        toast.success(message);
        setIsCreateModalOpen(false);
        resetForm();
        setSelectedImage(null);
        setImagePreview('');
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
      const response = await adminFetch(`/admin/announcements/${editingAnnouncement.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
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
    if (!confirm(t('Are you sure you want to delete this announcement?', 'هل أنت متأكد من حذف هذا الإعلان؟'))) {
      return;
    }

    try {
      const response = await adminFetch(`/admin/announcements/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success(t('Announcement deleted successfully', 'تم حذف الإعلان بنجاح'));
        fetchAnnouncements();
      } else {
        toast.error(t('Failed to delete announcement', 'فشل حذف الإعلان'));
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error(t('Failed to delete announcement', 'فشل حذف الإعلان'));
    }
  };

  const togglePin = async (announcement: Announcement) => {
    try {
      const response = await adminFetch(`/admin/announcements/${announcement.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned: !announcement.pinned })
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
      toast.error(t('Failed to update announcement', 'فشل تحديث الإعلان'));
    }
  };

  const viewReadReceipts = async (announcementId: string) => {
    try {
      const response = await adminFetch(`/admin/announcements/${announcementId}/receipts`);
      const data = await response.json();

      if (data.success) {
        setReadReceipts(data.receipts || []);
        setIsReceiptsModalOpen(true);
      } else {
        toast.error(t('Failed to load read receipts', 'فشل تحميل إيصالات القراءة'));
      }
    } catch (error) {
      console.error('Error fetching read receipts:', error);
      toast.error(t('Failed to load read receipts', 'فشل تحميل إيصالات القراءة'));
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
      image_url: announcement.image_url || ''
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      title_ar: '',
      message: '',
      message_ar: '',
      priority: 'info',
      company_ids: [],
      pinned: false,
      delivery_channel: 'system',
      image_url: ''
    });
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const response = await adminFetch('/admin/upload-image', {
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setFormData({ ...formData, image_url: data.url });
        toast.success(t('Image uploaded successfully', 'تم تحميل الصورة بنجاح'));
      } else {
        toast.error(data.message || t('Failed to upload image', 'فشل تحميل الصورة'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(t('Failed to upload image', 'فشل تحميل الصورة'));
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            {t('Announcement Board', 'لوحة الإعلانات')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Create and manage company announcements', 'إنشاء وإدارة إعلانات الشركة')}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t('New Announcement', 'إعلان جديد')}
        </Button>
      </div>

      {/* Announcements List */}
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
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={`p-6 ${announcement.pinned ? 'border-primary border-2' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Priority Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getPriorityIcon(announcement.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">
                          {language === 'ar' && announcement.title_ar 
                            ? announcement.title_ar 
                            : announcement.title}
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
                        {language === 'ar' && announcement.message_ar 
                          ? announcement.message_ar 
                          : announcement.message}
                      </p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span>
                      {t('Posted', 'تاريخ النشر')}: {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                    {announcement.company_ids && announcement.company_ids.length > 0 && (
                      <span>
                        {t('Companies', 'الشركات')}: {announcement.company_ids.length}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewReadReceipts(announcement.id)}
                    >
                      <Eye className="h-4 w-4 me-2" />
                      {t('View Receipts', 'عرض الإيصالات')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePin(announcement)}
                    >
                      {announcement.pinned ? (
                        <><PinOff className="h-4 w-4 me-2" /> {t('Unpin', 'إلغاء التثبيت')}</>
                      ) : (
                        <><Pin className="h-4 w-4 me-2" /> {t('Pin', 'تثبيت')}</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(announcement)}
                    >
                      <Edit2 className="h-4 w-4 me-2" />
                      {t('Edit', 'تعديل')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(announcement.id)}
                    >
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
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Create New Announcement', 'إنشاء إعلان جديد')}</DialogTitle>
            <DialogDescription>
              {t('Fill in the details below to create an announcement', 'املأ التفاصيل أدناه لإنشاء إعلان')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>{t('Priority', 'الأولوية')} *</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: any) => setFormData({...formData, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t('Info', 'معلومات')}</SelectItem>
                  <SelectItem value="important">{t('Important', 'مهم')}</SelectItem>
                  <SelectItem value="urgent">{t('Urgent', 'عاجل')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Title (English)', 'العنوان (إنجليزي)')} *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={t('Enter title', 'أدخل العنوان')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Title (Arabic)', 'العنوان (عربي)')}</Label>
                <Input
                  value={formData.title_ar}
                  onChange={(e) => setFormData({...formData, title_ar: e.target.value})}
                  placeholder={t('Enter Arabic title', 'أدخل العنوان بالعربية')}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Message */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Message (English)', 'الرسالة (إنجليزي)')} *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder={t('Enter message', 'أدخل الرسالة')}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Message (Arabic)', 'الرسالة (عربي)')}</Label>
                <Textarea
                  value={formData.message_ar}
                  onChange={(e) => setFormData({...formData, message_ar: e.target.value})}
                  placeholder={t('Enter Arabic message', 'أدخل الرسالة بالعربية')}
                  rows={4}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Companies */}
            <div className="space-y-2">
              <Label>{t('Target Companies', 'الشركات المستهدفة')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('Leave empty to send to all companies', 'اترك فارغاً للإرسال إلى جميع الشركات')}
              </p>
              <div className="space-y-2">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.company_ids.includes(company.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            company_ids: [...formData.company_ids, company.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            company_ids: formData.company_ids.filter(id => id !== company.id)
                          });
                        }
                      }}
                    />
                    <Label className="cursor-pointer">{company.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Pin */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.pinned}
                onCheckedChange={(checked) => setFormData({...formData, pinned: checked as boolean})}
              />
              <Label className="cursor-pointer">
                {t('Pin this announcement to the top', 'تثبيت هذا الإعلان في الأعلى')}
              </Label>
            </div>

            {/* Delivery Channel */}
            <div className="space-y-2">
              <Label>{t('Delivery Channel', 'قناة التوصيل')}</Label>
              <Select 
                value={formData.delivery_channel} 
                onValueChange={(value: any) => setFormData({...formData, delivery_channel: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('System Notification', 'إشعار النظام')}</SelectItem>
                  <SelectItem value="email">{t('Email', 'بريد إلكتروني')}</SelectItem>
                  <SelectItem value="both">{t('Both', 'كلاهما')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>{t('Image', 'صورة')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder={t('Enter image URL', 'أدخل رابط الصورة')}
                />
                {formData.image_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData({...formData, image_url: ''})}
                  >
                    <X className="h-4 w-4 me-2" />
                    {t('Remove', 'حذف')}
                  </Button>
                )}
              </div>
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Announcement"
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {selectedImage && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImageUpload}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <><Upload className="h-4 w-4 me-2" /> {t('Uploading...', 'جاري التحميل...')}</>
                      ) : (
                        <><Upload className="h-4 w-4 me-2" /> {t('Upload Image', 'تحميل الصورة')}</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleCreate}>
              {t('Create Announcement', 'إنشاء الإعلان')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Announcement', 'تعديل الإعلان')}</DialogTitle>
            <DialogDescription>
              {t('Update the announcement details below', 'قم بتحديث تفاصيل الإعلان أدناه')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label>{t('Priority', 'الأولوية')} *</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: any) => setFormData({...formData, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t('Info', 'معلومات')}</SelectItem>
                  <SelectItem value="important">{t('Important', 'مهم')}</SelectItem>
                  <SelectItem value="urgent">{t('Urgent', 'عاجل')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Title (English)', 'العنوان (إنجليزي)')} *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={t('Enter title', 'أدخل العنوان')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Title (Arabic)', 'العنوان (عربي)')}</Label>
                <Input
                  value={formData.title_ar}
                  onChange={(e) => setFormData({...formData, title_ar: e.target.value})}
                  placeholder={t('Enter Arabic title', 'أدخل العنوان بالعربية')}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Message */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Message (English)', 'الرسالة (إنجليزي)')} *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder={t('Enter message', 'أدخل الرسالة')}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Message (Arabic)', 'الرسالة (عربي)')}</Label>
                <Textarea
                  value={formData.message_ar}
                  onChange={(e) => setFormData({...formData, message_ar: e.target.value})}
                  placeholder={t('Enter Arabic message', 'أدخل الرسالة بالعربية')}
                  rows={4}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Companies */}
            <div className="space-y-2">
              <Label>{t('Target Companies', 'الشركات المستهدفة')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('Leave empty to send to all companies', 'اترك فارغاً للإرسال إلى جميع الشركات')}
              </p>
              <div className="space-y-2">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.company_ids.includes(company.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            company_ids: [...formData.company_ids, company.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            company_ids: formData.company_ids.filter(id => id !== company.id)
                          });
                        }
                      }}
                    />
                    <Label className="cursor-pointer">{company.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Pin */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.pinned}
                onCheckedChange={(checked) => setFormData({...formData, pinned: checked as boolean})}
              />
              <Label className="cursor-pointer">
                {t('Pin this announcement to the top', 'تثبيت هذا الإعلان في الأعلى')}
              </Label>
            </div>

            {/* Delivery Channel */}
            <div className="space-y-2">
              <Label>{t('Delivery Channel', 'قناة التوصيل')}</Label>
              <Select 
                value={formData.delivery_channel} 
                onValueChange={(value: any) => setFormData({...formData, delivery_channel: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('System Notification', 'إشعار النظام')}</SelectItem>
                  <SelectItem value="email">{t('Email', 'بريد إلكتروني')}</SelectItem>
                  <SelectItem value="both">{t('Both', 'كلاهما')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>{t('Image', 'صورة')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder={t('Enter image URL', 'أدخل رابط الصورة')}
                />
                {formData.image_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData({...formData, image_url: ''})}
                  >
                    <X className="h-4 w-4 me-2" />
                    {t('Remove', 'حذف')}
                  </Button>
                )}
              </div>
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Announcement"
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {selectedImage && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImageUpload}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <><Upload className="h-4 w-4 me-2" /> {t('Uploading...', 'جاري التحميل...')}</>
                      ) : (
                        <><Upload className="h-4 w-4 me-2" /> {t('Upload Image', 'تحميل الصورة')}</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingAnnouncement(null); resetForm(); }}>
              {t('Cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleEdit}>
              {t('Update Announcement', 'تحديث الإعلان')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read Receipts Modal */}
      <Dialog open={isReceiptsModalOpen} onOpenChange={setIsReceiptsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Read Receipts', 'إيصالات القراءة')}</DialogTitle>
            <DialogDescription>
              {t('See who has read this announcement', 'شاهد من قرأ هذا الإعلان')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {readReceipts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('No one has read this announcement yet', 'لم يقرأ أحد هذا الإعلان بعد')}
              </p>
            ) : (
              readReceipts.map((receipt) => (
                <div key={receipt.employee_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">
                      {language === 'ar' && receipt.employee_name_ar 
                        ? receipt.employee_name_ar 
                        : receipt.employee_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('Read at', 'قراءة في')}: {new Date(receipt.read_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{t('Read', 'مقروء')}</Badge>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptsModalOpen(false)}>
              {t('Close', 'إغلاق')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}