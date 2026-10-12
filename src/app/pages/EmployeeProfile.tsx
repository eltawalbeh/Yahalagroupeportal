import React, { useState } from 'react';
import { ArrowLeft, User, Camera, Lock, Save, Mail, Phone, CreditCard, Building2, Calendar, IdCard } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface EmployeeProfileProps {
  onBack: () => void;
}

export function EmployeeProfile({ onBack }: EmployeeProfileProps) {
  const { t } = useLanguage();
  const { employee, setAuth, company } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  
  // Personal Info
  const [fullName, setFullName] = useState(employee?.full_name || '');
  const [fullNameAr, setFullNameAr] = useState(employee?.full_name_ar || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [email, setEmail] = useState(employee?.email || '');
  
  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee/profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            employee_id: employee?.id,
            full_name: fullName,
            full_name_ar: fullNameAr,
            phone,
            email
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        setAuth(data.employee, company, false);
        toast.success(t('Profile updated successfully', 'تم تحديث الملف الشخصي بنجاح'));
        setIsEditing(false);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('Failed to update profile', 'فشل تحديث الملف الشخصي'));
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('Please fill in all fields', 'يرجى ملء جميع الحقول'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('Passwords do not match', 'كلمات المرور غير متطابقة'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('Password must be at least 6 characters', 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'));
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            employee_id: employee?.id,
            current_password: currentPassword,
            new_password: newPassword
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(t('Password changed successfully', 'تم تغيير كلمة المرور بنجاح'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(t('Current password is incorrect', 'كلمة المرور الحالية غير صحيحة'));
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('Failed to change password', 'فشل تغيير كلمة المرور'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ms-2">
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('Back', 'رجوع')}
          </Button>
          <h1 className="text-xl sm:text-2xl mb-2">
            {t('My Profile & Settings', 'ملفي الشخصي والإعدادات')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('Manage your personal information and settings', 'إدارة معلوماتك الشخصية والإعدادات')}
          </p>
        </div>

        {/* Profile Header Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Photo */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary-teal/20 flex items-center justify-center overflow-hidden ring-4 ring-primary/10">
                {employee?.photo_url ? (
                  <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-primary" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-start">
              <h2 className="text-xl mb-1">
                {t(employee?.full_name || '', employee?.full_name_ar || employee?.full_name || '')}
              </h2>
              <p className="text-muted-foreground mb-2">
                {t(employee?.position || 'Employee', employee?.position_ar || employee?.position || 'موظف')}
              </p>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{company?.name}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full grid grid-cols-3 h-auto p-1">
            <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4 me-2" />
              {t('Info', 'المعلومات')}
            </TabsTrigger>
            <TabsTrigger value="employment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
              <IdCard className="w-4 h-4 me-2" />
              {t('Employment', 'الوظيفة')}
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
              <Lock className="w-4 h-4 me-2" />
              {t('Security', 'الأمان')}
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="info">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg">{t('Personal Information', 'المعلومات الشخصية')}</h3>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    {t('Edit', 'تعديل')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                      {t('Cancel', 'إلغاء')}
                    </Button>
                    <Button onClick={handleSaveProfile} size="sm">
                      <Save className="w-4 h-4 me-2" />
                      {t('Save', 'حفظ')}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('Full Name (English)', 'الاسم الكامل (بالإنجليزية)')}</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Full Name (Arabic)', 'الاسم الكامل (بالعربية)')}</Label>
                    <Input
                      value={fullNameAr}
                      onChange={(e) => setFullNameAr(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      <Phone className="w-4 h-4 inline me-2" />
                      {t('Phone', 'الهاتف')}
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      <Mail className="w-4 h-4 inline me-2" />
                      {t('Email', 'البريد الإلكتروني')}
                    </Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditing}
                      type="email"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Employment Details Tab */}
          <TabsContent value="employment">
            <Card className="p-6">
              <h3 className="text-lg mb-6">{t('Employment Details', 'تفاصيل الوظيفة')}</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Employee ID', 'رقم الموظف')}</Label>
                    <p className="text-base mt-1">{employee?.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Iqama/ID', 'الإقامة/الهوية')}</Label>
                    <p className="text-base mt-1">{employee?.iqama || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Position', 'المنصب')}</Label>
                    <p className="text-base mt-1">{t(employee?.position || '-', employee?.position_ar || employee?.position || '-')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Company', 'الشركة')}</Label>
                    <p className="text-base mt-1">{company?.name || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Date of Birth', 'تاريخ الميلاد')}</Label>
                    <p className="text-base mt-1">{employee?.date_of_birth || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('Nationality', 'الجنسية')}</Label>
                    <p className="text-base mt-1">{employee?.nationality || '-'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">{t('Banking Information', 'المعلومات المصرفية')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">{t('IBAN', 'الآيبان')}</Label>
                      <p className="text-base mt-1 font-mono text-sm">{employee?.iban || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">{t('Bank Name', 'اسم البنك')}</Label>
                      <p className="text-base mt-1">{employee?.bank_name || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="p-6">
              <h3 className="text-lg mb-6">{t('Change Password', 'تغيير كلمة المرور')}</h3>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>{t('Current Password', 'كلمة المرور الحالية')}</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('Enter current password', 'أدخل كلمة المرور الحالية')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('New Password', 'كلمة المرور الجديدة')}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('Enter new password', 'أدخل كلمة المرور الجديدة')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('At least 6 characters', 'على الأقل 6 أحرف')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('Confirm New Password', 'تأكيد كلمة المرور الجديدة')}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('Confirm new password', 'أكد كلمة المرور الجديدة')}
                  />
                </div>

                <Button 
                  onClick={handleChangePassword} 
                  disabled={isChangingPassword}
                  className="w-full"
                >
                  <Lock className="w-4 h-4 me-2" />
                  {isChangingPassword ? t('Changing...', 'جاري التغيير...') : t('Change Password', 'تغيير كلمة المر��ر')}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
