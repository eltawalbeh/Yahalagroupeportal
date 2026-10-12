import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Globe, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { saveRemember, saveEmployeeSession, clearRemember } from '../utils/authLocal';
import { setAdminToken } from '../utils/adminApi';
import { VERSION_STRING } from '../utils/version';
import YaHalaLogo from 'figma:asset/b01f20553d311abbd0b16a8d01aaebb3f2cd3586.png';

interface LoginProps {
  onLoginSuccess?: (isAdmin: boolean, companySlug?: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps = {}) {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { setAuth } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password dialog state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmployeeId, setResetEmployeeId] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !password) {
      toast.error(t(
        'Please fill in all fields',
        'يرجى ملء جميع الحقول'
      ));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            id: employeeId.trim(),          // trim whitespace
            password: password              // never trim passwords
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        // Check if this is first-time login or requires setup
        if (data.requiresSetup) {
          // Store employee data temporarily and redirect to first-time setup
          sessionStorage.setItem('firstTimeSetupEmployee', JSON.stringify(data.employee));
          toast.info(t(
            'Welcome! Please complete your profile setup.',
            'مرحباً! يرجى إكمال إعداد ملفك الشخصي.'
          ));
          navigate('/setup', { replace: true });
          return;
        }

        // Handle remember me functionality
        if (rememberMe) {
          saveRemember(employeeId, data.isAdmin);
          
          // Store employee session data for auto-login
          if (!data.isAdmin) {
            saveEmployeeSession(data.employee, data.company);
          }
        } else {
          // Clear any existing remember me data
          clearRemember();
        }

        if (data.isAdmin) {
          const adminInfo = data.adminInfo || { id: 'admin', name: 'Super Admin', name_ar: 'المسؤول الأعلى', role: 'super_admin' };
          // Store the session token so admin API calls are authenticated
          if (data.token) setAdminToken(data.token);
          setAuth(null, null, true, adminInfo);
          toast.success(t(
            `Welcome ${adminInfo.name}!`, 
            `مرحباً ${adminInfo.name_ar || adminInfo.name}!`
          ));
          navigate('/admin', { replace: true });
        } else {
          setAuth(data.employee, data.company, false);
          toast.success(t(
            `Welcome ${data.employee.full_name}!`,
            `مرحباً ${data.employee.full_name_ar || data.employee.full_name}!`
          ));
          // Elevated roles (manager / accountant / owner) → manager portal
          const elevatedRoles = ['manager', 'accountant', 'owner'];
          if (elevatedRoles.includes(data.employee?.role)) {
            navigate('/manager', { replace: true });
          } else {
            navigate('/employee', { replace: true });
          }
        }
      } else {
        toast.error(t(
          data.message || 'Invalid credentials',
          data.messageAr || 'بيانات الدخول غير صحيحة'
        ));
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t(
        'Connection error. Please try again.',
        'خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmployeeId) {
      toast.error(t(
        'Please enter your Employee ID',
        'يرجى إدخال رقم الموظف'
      ));
      return;
    }

    setIsSubmittingReset(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/auth/request-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            employee_id: resetEmployeeId
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(t(
          'Password reset request submitted. Admin will reset your password soon.',
          'تم تقديم طلب إعادة تعيين كلمة المرور. سيقوم المسؤول بإعادة تعيين كلمة المرور قريباً.'
        ));
        setShowForgotPassword(false);
        setResetEmployeeId('');
      } else {
        toast.error(t(
          data.message || 'Employee not found',
          data.messageAr || 'لم يتم العثور على الموظف'
        ));
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      toast.error(t(
        'Failed to submit request. Please try again.',
        'فشل تقديم الطلب. يرجى المحاولة مرة أخرى.'
      ));
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 sm:p-6 relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md lg:max-w-5xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
          {/* Header - Left Side on Desktop */}
          <div className="text-center lg:text-start lg:flex-1">
            <div className="inline-flex items-center justify-center w-32 h-32 lg:w-40 lg:h-40 mb-6 lg:mb-8 bg-white dark:bg-card rounded-2xl shadow-lg p-4 border dark:border-border">
              <img src={YaHalaLogo} alt="Ya Hala Group Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl lg:text-4xl mb-3">
              {t('Ya Hala Group E-Portal', 'بوابة مجموعة يا هلا الإلكترونية')}
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground mb-4">
              {t('Employee Login', 'تسجيل دخول الموظفين')}
            </p>
            <p className="text-sm text-muted-foreground/80 max-w-md mx-auto lg:mx-0">
              {t(
                'Access your employee portal to manage leaves, advances, and entry permissions.',
                'الوصول إلى بوابة الموظفين لإدارة الإجازا�� والسلف وتصاريح الدخول.'
              )}
            </p>
          </div>

          {/* Login Form - Right Side on Desktop */}
          <div className="lg:flex-1 lg:max-w-md">
            <div className="bg-card rounded-2xl shadow-xl p-6 sm:p-8 border border-border/50 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Employee ID */}
                <div className="space-y-2">
                  <Label htmlFor="employeeId">
                    {t('Employee ID', 'رقم الموظف')}
                  </Label>
                  <Input
                    id="employeeId"
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder={t('Enter your employee ID', 'أدخل رقم الموظف')}
                    className="h-11"
                    autoComplete="username"
                    maxLength={100}
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t('Password', 'كلمة المرور')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('Enter your password', 'أدخل كلمة المرور')}
                      className="h-11 pe-10"
                      autoComplete="current-password"
                      maxLength={256}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="rememberMe" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading}
                    />
                    <Label 
                      htmlFor="rememberMe" 
                      className="text-sm cursor-pointer"
                    >
                      {t('Remember me', 'تذكرني')}
                    </Label>
                  </div>

                  <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        disabled={isLoading}
                      >
                        {t('Forgot Password?', 'نسيت كلمة المرور؟')}
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {t('Reset Password Request', 'طلب إعادة تعيين كلمة المرور')}
                        </DialogTitle>
                        <DialogDescription>
                          {t(
                            'Enter your Employee ID to request a password reset. Admin will reset your password and notify you.',
                            'أدخل رقم الموظف لطلب إعادة تعيين كلمة المرور. سيقوم المسؤول بإعادة تعيين كلمة المرور وإخطارك.'
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="resetEmployeeId">
                            {t('Employee ID', 'رقم الموظف')}
                          </Label>
                          <Input
                            id="resetEmployeeId"
                            type="text"
                            value={resetEmployeeId}
                            onChange={(e) => setResetEmployeeId(e.target.value)}
                            placeholder={t('Enter your employee ID', 'أدخل رقم الموظف')}
                            className="h-11"
                            disabled={isSubmittingReset}
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowForgotPassword(false)}
                            disabled={isSubmittingReset}
                          >
                            {t('Cancel', 'إلغاء')}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={isSubmittingReset}
                          >
                            {isSubmittingReset 
                              ? t('Submitting...', 'جاري الإرسال...') 
                              : t('Submit Request', 'إرسال الطلب')
                            }
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 sm:h-11 text-base shadow-md hover:shadow-lg transition-shadow"
                  disabled={isLoading}
                >
                  {isLoading ? t('Logging in...', 'جاري تسجيل الدخول...') : t('Login', 'تسجيل الدخول')}
                </Button>
              </form>

              {/* Language Toggle */}
              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 sm:h-10"
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                >
                  <Globe className="w-4 h-4 me-2" />
                  {language === 'en' ? 'العربية' : 'English'}
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* Version Footer */}
        <div className="absolute bottom-4 start-1/2 -translate-x-1/2">
          <p className="text-xs text-muted-foreground/60 text-center">
            {VERSION_STRING}
          </p>
        </div>

      </div>
    </div>
  );
}