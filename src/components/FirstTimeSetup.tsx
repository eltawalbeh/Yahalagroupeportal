import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';
import { Eye, EyeOff, Upload, Check, UserCircle, Phone, Users, Languages, Camera, SkipForward } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface FirstTimeSetupProps {
  employee: any;
  onComplete: () => void;
  onSkip?: () => void;
}

export function FirstTimeSetup({ employee, onComplete, onSkip }: FirstTimeSetupProps) {
  const { t, language, setLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  
  // Step 1: Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Personal Information
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  
  // Step 3: Profile Photo
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Step 4: Language Preference
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ar'>(language);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('Please fill all password fields', 'يرجى ملء جميع حقول كلمة المرور'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('Passwords do not match', 'كلمات المرور غير متطابقة'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t(
        'Password must be at least 8 characters',
        'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل'
      ));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee/change-password-first-time`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            employee_id: employee.id,
            current_password: currentPassword,
            new_password: newPassword
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success(t('Password changed successfully', 'تم تغيير كلمة المرور بنجاح'));
        setStep(2);
      } else {
        toast.error(t(data.message || 'Failed to change password', data.messageAr || 'فشل تغيير كلمة المرور'));
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(t('An error occurred', 'حدث خطأ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonalInfoSubmit = () => {
    if (!phone || !emergencyContactName || !emergencyContactPhone) {
      toast.error(t(
        'Please fill all required fields',
        'يرجى ملء جميع الحقول المطلوبة'
      ));
      return;
    }

    // Validate phone numbers
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      toast.error(t('Invalid phone number format', 'تنسيق رقم الهاتف غير صحيح'));
      return;
    }

    if (!phoneRegex.test(emergencyContactPhone.replace(/[\s-]/g, ''))) {
      toast.error(t('Invalid emergency contact phone format', 'تنسيق رقم هاتف جهة الاتصال في حالات الطوارئ غير صحيح'));
      return;
    }

    setStep(3);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('Photo size must be less than 5MB', 'يجب أن يكون حجم الصورة أقل من 5 ميجابايت'));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('Please upload an image file', 'يرجى تحميل ملف صورة'));
        return;
      }

      setProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSubmit = () => {
    if (!profilePhoto) {
      toast.error(t('Please upload a profile photo', 'يرجى تحميل صورة شخصية'));
      return;
    }
    setStep(4);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Upload profile photo first
      const formData = new FormData();
      if (profilePhoto) {
        formData.append('file', profilePhoto);
        formData.append('employee_id', employee.id);
      }

      const photoResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee/upload-profile-photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData
        }
      );

      const photoData = await photoResponse.json();
      
      if (!photoData.success) {
        throw new Error('Failed to upload photo');
      }

      // Update employee profile with all information
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/employee/complete-first-time-setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            employee_id: employee.id,
            phone,
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
            preferred_language: preferredLanguage,
            profile_photo_url: photoData.photo_url
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setLanguage(preferredLanguage);
        toast.success(t('Setup completed successfully!', 'تم إكمال الإعداد بنجاح!'));
        setTimeout(() => {
          onComplete();
        }, 1000);
      } else {
        toast.error(t(data.message || 'Setup failed', data.messageAr || 'فشل الإعداد'));
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error(t('An error occurred during setup', 'حدث خطأ أثناء الإعداد'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setIsSkipping(true);
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-turquoise/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <UserCircle className="w-6 h-6 text-primary" />
            {t('Welcome! Complete Your Profile Setup', 'مرحباً! أكمل إعداد ملفك الشخصي')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('Please complete the following steps to access your account', 'يرجى إكمال الخطوات التالية للوصول إلى حسابك')}
          </CardDescription>
          
          {/* Progress Steps */}
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          {/* Skip Setup Button - always visible */}
          {onSkip && (
            <div className="flex justify-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={isSubmitting || isSkipping}
                className="text-muted-foreground hover:text-foreground gap-1.5 text-sm"
              >
                <SkipForward className="w-4 h-4" />
                {isSkipping
                  ? t('Skipping...', 'جاري التخطي...')
                  : t('Skip Setup for Now', 'تخطي الإعداد الآن')
                }
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Password Change */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  🔒 {t(
                    'For security reasons, you must change your temporary password',
                    'لأسباب أمنية، يجب عليك تغيير كلمة المرور المؤقتة'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-password">
                  {t('Current (Temporary) Password', 'كلمة المرور الحالية (المؤقتة)')} *
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('Enter temporary password', 'أدخل كلمة المرور المؤقتة')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">
                  {t('New Password', 'كلمة المرور الجديدة')} *
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('At least 8 characters', 'على الأقل 8 أحرف')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  {t('Confirm New Password', 'تأكيد كلمة المرور الجديدة')} *
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('Re-enter new password', 'أعد إدخال كلمة المرور الجديدة')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={handlePasswordChange} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('Changing Password...', 'جاري تغيير كلمة المرور...') : t('Change Password & Continue', 'تغيير كلمة المرور والمتابعة')}
              </Button>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{t('Personal Contact Information', 'معلومات الاتصال الشخصية')}</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t('Personal Phone Number', 'رقم الهاتف الشخصي')} *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('e.g., +973 1234 5678', 'مثال: ٠٠٩٧٣ ١٢٣٤ ٥٦٧٨')}
                />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{t('Emergency Contact', 'جهة الاتصال في حالات الطوارئ')}</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-name">
                  {t('Emergency Contact Name', 'اسم جهة الاتصال في حالات الطوارئ')} *
                </Label>
                <Input
                  id="emergency-name"
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder={t('Full name', 'الاسم الكامل')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-phone">
                  {t('Emergency Contact Phone', 'هاتف جهة الاتصال في حالات الطوارئ')} *
                </Label>
                <Input
                  id="emergency-phone"
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder={t('e.g., +973 1234 5678', 'مثال: ٠٠٩٧٣ ١٢٣٤ ٥٦٧٨')}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  {t('Back', 'السابق')}
                </Button>
                <Button onClick={handlePersonalInfoSubmit} className="flex-1">
                  {t('Continue', 'المتابعة')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Profile Photo */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{t('Profile Photo', 'الصورة الشخصية')}</h3>
              </div>

              <div className="flex flex-col items-center gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Profile preview" 
                      className="w-40 h-40 rounded-full object-cover border-4 border-primary"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={() => {
                        setProfilePhoto(null);
                        setPhotoPreview(null);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-muted-foreground/25">
                    <UserCircle className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}

                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Upload className="w-4 h-4" />
                    {photoPreview ? t('Change Photo', 'تغيير الصورة') : t('Upload Photo', 'تحميل صورة')}
                  </div>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </Label>

                <p className="text-sm text-muted-foreground text-center">
                  {t('Maximum file size: 5MB', 'الحد الأقصى لحجم الملف: 5 ميجابايت')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  {t('Back', 'السابق')}
                </Button>
                <Button onClick={handlePhotoSubmit} className="flex-1">
                  {t('Continue', 'المتابعة')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Language Preference */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{t('Language Preference', 'تفضيل اللغة')}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPreferredLanguage('en')}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    preferredLanguage === 'en'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="text-4xl mb-2">🇬🇧</div>
                  <div className="font-semibold">English</div>
                </button>

                <button
                  onClick={() => setPreferredLanguage('ar')}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    preferredLanguage === 'ar'
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="text-4xl mb-2">🇧🇭</div>
                  <div className="font-semibold">العربية</div>
                </button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ {t(
                    'You can change your language preference anytime in settings',
                    'يمكنك تغيير تفضيل اللغة في أي وقت من الإعدادات'
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  {t('Back', 'السابق')}
                </Button>
                <Button onClick={handleFinalSubmit} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                  {isSubmitting ? t('Completing Setup...', 'جاري إكمال الإعداد...') : t('Complete Setup', 'إكمال الإعداد')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}