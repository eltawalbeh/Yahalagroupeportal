import { adminFetch } from '../utils/adminApi';
import React, { useState, useEffect } from 'react';
import { Save, Calendar, Clock, DollarSign, Users, Mail, Bell, Shield, Trash2, Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Holiday {
  id: string;
  date: string;
  nameEn: string;
  nameAr: string;
  type: 'national' | 'religious' | 'optional';
  recurring: boolean;
}

interface CompanySettingsData {
  companyId: string;
  workingDays: number[];
  weekendDays: number[];
  workStartTime: string;
  workEndTime: string;
  
  // Leave Policies
  annualLeaveDays: number;
  sickLeaveDays: number;
  emergencyLeaveDays: number;
  leaveCarryForward: number;
  leaveAdvanceNoticeDays: number;
  leaveMaxConsecutiveDays: number;
  
  // Advance Policies
  advanceEnabled: boolean;
  advanceMaxPercentage: number;
  advanceMinAmount: number;
  advanceMaxAmount: number;
  advanceMaxRequestsPerYear: number;
  advanceMinServiceMonths: number;
  
  // Permission Policies
  permissionEnabled: boolean;
  permissionMaxHoursPerRequest: number;
  permissionMaxRequestsPerMonth: number;
  
  // Email Settings
  emailNotificationsEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpFromEmail: string;
  smtpFromName: string;
  
  // Holidays
  publicHolidays: Holiday[];
}

export function CompanySettings() {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState<CompanySettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
    type: 'national',
    recurring: false
  });
  const [showAddHoliday, setShowAddHoliday] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await adminFetch('/admin/settings');

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(t('Failed to load settings', 'فشل تحميل الإعدادات'));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await adminFetch('/admin/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success(t('Settings saved successfully', 'تم حفظ الإعدادات بنجاح'));
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('Failed to save settings', 'فشل حفظ الإعدادات'));
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.nameEn || !newHoliday.nameAr) {
      toast.error(t('Please fill all holiday fields', 'يرجى ملء جميع حقول العطلة'));
      return;
    }

    const holiday: Holiday = {
      id: crypto.randomUUID(),
      date: newHoliday.date!,
      nameEn: newHoliday.nameEn!,
      nameAr: newHoliday.nameAr!,
      type: newHoliday.type as any || 'national',
      recurring: newHoliday.recurring || false
    };

    setSettings(prev => prev ? {
      ...prev,
      publicHolidays: [...prev.publicHolidays, holiday]
    } : null);

    setNewHoliday({ type: 'national', recurring: false });
    setShowAddHoliday(false);
    toast.success(t('Holiday added', 'تمت إضافة العطلة'));
  };

  const removeHoliday = (id: string) => {
    setSettings(prev => prev ? {
      ...prev,
      publicHolidays: prev.publicHolidays.filter(h => h.id !== id)
    } : null);
    toast.success(t('Holiday removed', 'تمت إزالة العطلة'));
  };

  const weekDays = [
    { value: 0, labelEn: 'Sunday', labelAr: 'الأحد' },
    { value: 1, labelEn: 'Monday', labelAr: 'الإثنين' },
    { value: 2, labelEn: 'Tuesday', labelAr: 'الثلاثاء' },
    { value: 3, labelEn: 'Wednesday', labelAr: 'الأربعاء' },
    { value: 4, labelEn: 'Thursday', labelAr: 'الخميس' },
    { value: 5, labelEn: 'Friday', labelAr: 'الجمعة' },
    { value: 6, labelEn: 'Saturday', labelAr: 'السبت' }
  ];

  if (loading || !settings) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            {t('Company Settings', 'إعدادات الشركة')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Configure company-wide policies and preferences', 'تكوين السياسات والتفضيلات على مستوى الشركة')}
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="px-[12px] py-[8px]">
          <Save className="h-4 w-4 me-2" />
          {saving ? t('Saving...', 'جاري الحفظ...') : t('Save All Changes', 'حفظ جميع التغييرات')}
        </Button>
      </div>

      <Tabs defaultValue="working-hours" className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
          <TabsTrigger value="working-hours">
            <Clock className="h-4 w-4 me-2" />
            {t('Working Hours', 'ساعات العمل')}
          </TabsTrigger>
          <TabsTrigger value="leave">
            <Calendar className="h-4 w-4 me-2" />
            {t('Leave Policies', 'سياسات الإجازات')}
          </TabsTrigger>
          <TabsTrigger value="advance">
            <DollarSign className="h-4 w-4 me-2" />
            {t('Advance Salary', 'السلفة')}
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <Calendar className="h-4 w-4 me-2" />
            {t('Holidays', 'العطلات')}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 me-2" />
            {t('Notifications', 'الإشعارات')}
          </TabsTrigger>
        </TabsList>

        {/* Working Hours Tab */}
        <TabsContent value="working-hours">
          <Card>
            <CardHeader>
              <CardTitle>{t('Working Hours & Days', 'ساعات وأيام العمل')}</CardTitle>
              <CardDescription>
                {t('Set working schedule for the company', 'تحديد جدول العمل للشركة')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('Work Start Time', 'وقت بدء العمل')}</Label>
                  <Input
                    type="time"
                    value={settings.workStartTime ?? ''}
                    onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Work End Time', 'وقت انتهاء العمل')}</Label>
                  <Input
                    type="time"
                    value={settings.workEndTime ?? ''}
                    onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>{t('Working Days', 'أيام العمل')}</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {weekDays.map(day => (
                    <div key={day.value} className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id={`work-${day.value}`}
                        checked={settings.workingDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSettings({
                              ...settings,
                              workingDays: [...settings.workingDays, day.value].sort(),
                              weekendDays: settings.weekendDays.filter(d => d !== day.value)
                            });
                          } else {
                            setSettings({
                              ...settings,
                              workingDays: settings.workingDays.filter(d => d !== day.value),
                              weekendDays: [...settings.weekendDays, day.value].sort()
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`work-${day.value}`} className="cursor-pointer">
                        {language === 'ar' ? day.labelAr : day.labelEn}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t('Weekend Days', 'أيام عطلة نهاية الأسبوع')}: {' '}
                  <span className="font-medium">
                    {settings.weekendDays.map(d => 
                      language === 'ar' ? weekDays[d].labelAr : weekDays[d].labelEn
                    ).join(', ')}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Policies Tab */}
        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>{t('Leave Policies', 'سياسات الإجازات')}</CardTitle>
              <CardDescription>
                {t('Configure leave entitlements and rules', 'تكوين استحقاقات الإجازات والقواعد')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('Annual Leave Days', 'أيام الإجازة السنوية')}</Label>
                  <Input
                    type="number"
                    value={settings.annualLeaveDays ?? ''}
                    onChange={(e) => setSettings({ ...settings, annualLeaveDays: parseInt(e.target.value) })}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('Default: 21 days per year', 'الافتراضي: 21 يوماً في السنة')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('Sick Leave Days', 'أيام الإجازة المرضية')}</Label>
                  <Input
                    type="number"
                    value={settings.sickLeaveDays ?? ''}
                    onChange={(e) => setSettings({ ...settings, sickLeaveDays: parseInt(e.target.value) })}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('Default: 30 days per year', 'الافتراضي: 30 يوماً في السنة')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('Emergency Leave Days', 'أيام الإجازة الطارئة')}</Label>
                  <Input
                    type="number"
                    value={settings.emergencyLeaveDays ?? ''}
                    onChange={(e) => setSettings({ ...settings, emergencyLeaveDays: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Leave Carry Forward (days)', 'ترحيل الإجازة (أيام)')}</Label>
                  <Input
                    type="number"
                    value={settings.leaveCarryForward ?? ''}
                    onChange={(e) => setSettings({ ...settings, leaveCarryForward: parseInt(e.target.value) })}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('Maximum days that can be carried to next year', 'الحد الأقصى من الأيام التي يمكن ترحيلها للعام المقبل')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('Advance Notice (days)', 'إشعار مسبق (أيام)')}</Label>
                  <Input
                    type="number"
                    value={settings.leaveAdvanceNoticeDays ?? ''}
                    onChange={(e) => setSettings({ ...settings, leaveAdvanceNoticeDays: parseInt(e.target.value) })}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('Days required to request leave in advance', 'الأيام المطلوبة لطلب الإجازة مسبقاً')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('Max Consecutive Days', 'الحد الأقصى للأيام المتتالية')}</Label>
                  <Input
                    type="number"
                    value={settings.leaveMaxConsecutiveDays ?? ''}
                    onChange={(e) => setSettings({ ...settings, leaveMaxConsecutiveDays: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advance Salary Tab */}
        <TabsContent value="advance">
          <Card>
            <CardHeader>
              <CardTitle>{t('Advance Salary Policies', 'سياسات السلفة')}</CardTitle>
              <CardDescription>
                {t('Configure advance salary rules and limits', 'تكوين قواعد وحدود السلفة')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>{t('Enable Advance Salary', 'تفعيل السلفة')}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Allow employees to request advance salary', 'السماح للموظفين بطلب السلفة')}
                  </p>
                </div>
                <Switch
                  checked={settings.advanceEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, advanceEnabled: checked })}
                />
              </div>

              {settings.advanceEnabled && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{t('Maximum Percentage of Salary', 'الحد الأقصى من نسبة الراتب')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.advanceMaxPercentage ?? ''}
                        onChange={(e) => setSettings({ ...settings, advanceMaxPercentage: parseInt(e.target.value) })}
                        min="0"
                        max="100"
                      />
                      <span>%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('Default: 50%', 'الافتراضي: 50%')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Minimum Amount (SAR)', 'الحد الأدنى للمبلغ (ريال)')}</Label>
                    <Input
                      type="number"
                      value={settings.advanceMinAmount ?? ''}
                      onChange={(e) => setSettings({ ...settings, advanceMinAmount: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Maximum Amount (SAR)', 'الحد الأقصى للمبلغ (ريال)')}</Label>
                    <Input
                      type="number"
                      value={settings.advanceMaxAmount ?? ''}
                      onChange={(e) => setSettings({ ...settings, advanceMaxAmount: parseInt(e.target.value) })}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Leave 0 for no limit', 'اترك 0 بدون حد')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Max Requests Per Year', 'الحد الأقصى للطلبات في السنة')}</Label>
                    <Input
                      type="number"
                      value={settings.advanceMaxRequestsPerYear ?? ''}
                      onChange={(e) => setSettings({ ...settings, advanceMaxRequestsPerYear: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Minimum Service (months)', 'الحد الأدنى للخدمة (أشهر)')}</Label>
                    <Input
                      type="number"
                      value={settings.advanceMinServiceMonths ?? ''}
                      onChange={(e) => setSettings({ ...settings, advanceMinServiceMonths: parseInt(e.target.value) })}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Months of service required to request advance', 'أشهر الخدمة المطلوبة لطلب السلفة')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('Public Holidays', 'العطلات الرسمية')}</CardTitle>
                  <CardDescription>
                    {t('Manage company holidays and observances', 'إدارة عطلات الشركة والمناسبات')}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddHoliday(true)}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('Add Holiday', 'إضافة عطلة')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddHoliday && (
                <Card className="border-primary">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{t('New Holiday', 'عطلة جديدة')}</h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddHoliday(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('Date', 'التاريخ')}</Label>
                        <Input
                          type="date"
                          value={newHoliday.date || ''}
                          onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Type', 'النوع')}</Label>
                        <Select
                          value={newHoliday.type}
                          onValueChange={(value) => setNewHoliday({ ...newHoliday, type: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national">{t('National', 'وطني')}</SelectItem>
                            <SelectItem value="religious">{t('Religious', 'ديني')}</SelectItem>
                            <SelectItem value="optional">{t('Optional', 'اختياري')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Name (English)', 'الاسم (إنجليزي)')}</Label>
                        <Input
                          value={newHoliday.nameEn || ''}
                          onChange={(e) => setNewHoliday({ ...newHoliday, nameEn: e.target.value })}
                          placeholder="e.g., Saudi National Day"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Name (Arabic)', 'الاسم (عربي)')}</Label>
                        <Input
                          value={newHoliday.nameAr || ''}
                          onChange={(e) => setNewHoliday({ ...newHoliday, nameAr: e.target.value })}
                          placeholder="مثال: اليوم الوطني السعودي"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Switch
                        id="recurring"
                        checked={newHoliday.recurring}
                        onCheckedChange={(checked) => setNewHoliday({ ...newHoliday, recurring: checked })}
                      />
                      <Label htmlFor="recurring">
                        {t('Recurring (every year)', 'متكرر (كل عام)')}
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={addHoliday} className="flex-1">
                        {t('Add Holiday', 'إضافة عطلة')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddHoliday(false)}>
                        {t('Cancel', 'إلغاء')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {settings.publicHolidays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('No holidays added yet', 'لم تتم إضافة عطلات بعد')}
                  </div>
                ) : (
                  settings.publicHolidays
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(holiday => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {language === 'ar' ? holiday.nameAr : holiday.nameEn}
                            </span>
                            <Badge variant={
                              holiday.type === 'national' ? 'default' :
                              holiday.type === 'religious' ? 'secondary' : 'outline'
                            }>
                              {holiday.type === 'national' ? t('National', 'وطني') :
                               holiday.type === 'religious' ? t('Religious', 'ديني') :
                               t('Optional', 'اختياري')}
                            </Badge>
                            {holiday.recurring && (
                              <Badge variant="outline">{t('Recurring', 'متكرر')}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(holiday.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHoliday(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('Notification Settings', 'إعدادات الإشعارات')}</CardTitle>
              <CardDescription>
                {t('Configure email and push notifications', 'تكوين إشعارات البريد الإلكتروني والدفع')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label>{t('Email Notifications', 'إشعارات البريد الإلكتروني')}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Send email notifications to users', 'إرسال إشعارات البريد الإلكتروني للمستخدمين')}
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotificationsEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotificationsEnabled: checked })}
                />
              </div>

              {settings.emailNotificationsEnabled && (
                <>
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium text-primary mb-1">
                          {t('SMTP Configuration Active', 'تكوين SMTP نشط')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {t('Email notifications are configured and ready to send', 'إشعارات البريد الإلكتروني مكونة وجاهزة للإرسال')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">{t('SMTP Server Details', 'تفاصيل خادم SMTP')}</h4>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('SMTP Host', 'مضيف SMTP')}</Label>
                        <Input value={settings.smtpHost ?? ''} disabled className="bg-muted" />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('SMTP Port', 'منفذ SMTP')}</Label>
                        <Input value={settings.smtpPort ?? ''} disabled className="bg-muted" />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('From Email', 'البريد الإلكتروني للمرسل')}</Label>
                        <Input value={settings.smtpFromEmail ?? ''} disabled className="bg-muted" />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('From Name', 'اسم المرسل')}</Label>
                        <Input value={settings.smtpFromName ?? ''} disabled className="bg-muted" />
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>{t('Note:', 'ملاحظة:')}</strong> {' '}
                        {t('SMTP credentials are securely stored and cannot be viewed for security reasons', 'يتم تخزين بيانات اعتماد SMTP بشكل آمن ولا يمكن عرضها لأسباب أمنية')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">{t('Email Types', 'أنواع البريد الإلكتروني')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{t('Request Submitted', 'تم تقديم الطلب')}</span>
                        <Badge variant="outline">{t('Active', 'نشط')}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{t('Request Approved', 'تمت الموافقة على الطلب')}</span>
                        <Badge variant="outline">{t('Active', 'نشط')}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{t('Request Rejected', 'تم رفض الطلب')}</span>
                        <Badge variant="outline">{t('Active', 'نشط')}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{t('Approval Needed (Manager)', 'مطلوب موافقة (المدير)')}</span>
                        <Badge variant="outline">{t('Active', 'نشط')}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{t('Password Reset', 'إعادة تعيين كلمة المرور')}</span>
                        <Badge variant="outline">{t('Active', 'نشط')}</Badge>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}