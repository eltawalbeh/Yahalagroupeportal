import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, XCircle, Zap, ExternalLink, Book } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface EmailTemplate {
  name: string;
  subjectEn: string;
  subjectAr: string;
}

export function EmailTester() {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('requestApproved');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/email-templates`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const sendTestEmail = async () => {
    if (!email) {
      toast.error(t('Please enter an email address', 'الرجاء إدخال عنوان بريد إلكتروني'));
      return;
    }

    setLoading(true);
    setLastResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/test-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            template: selectedTemplate,
            language: selectedLanguage
          })
        }
      );

      const data = await response.json();
      setLastResult(data);

      if (data.success) {
        toast.success(t('Test email sent!', 'تم إرسال البريد التجريبي!'));
      } else {
        toast.error(t('Failed to send email', 'فشل إرسال البريد'));
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(t('Error sending test email', 'خطأ في إرسال البريد التجريبي'));
      setLastResult({
        success: false,
        message: t('Network error or server unavailable', 'خطأ في الشبكة أو الخادم غير متاح')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          {t('Email System Tester', 'اختبار نظام البريد الإلكتروني')}
        </CardTitle>
        <CardDescription>
          {t('Send test emails to verify Resend API configuration', 'إرسال رسائل تجريبية للتحقق من إعدادات Resend API')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Setup Guide Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Book className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {t('📚 Quick Setup Guide', '📚 دليل الإعداد السريع')}
              </h4>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-decimal list-inside">
                <li>
                  {t('Sign up at ', 'سجل في ')}<a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">resend.com</a>
                </li>
                <li>{t('Create an API key in the Resend dashboard', 'أنشئ مفتاح API في لوحة تحكم Resend')}</li>
                <li>{t('Add your API key to RESEND_API_KEY environment variable (already created)', 'أضف مفتاح API إلى متغير البيئة RESEND_API_KEY (تم إنشاؤه بالفعل)')}</li>
                <li>{t('Test below to verify emails are sending', 'اختبر أدناه للتحقق من إرسال الرسائل')}</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <a 
                  href="https://github.com/your-repo/EMAIL_SETUP.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('View Complete Setup Guide (EMAIL_SETUP.md)', 'عرض دليل الإعداد الكامل (EMAIL_SETUP.md)')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-primary mb-1">
                {t('Resend API Configured', 'تم تكوين Resend API')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('Email system is now using Resend API for reliable email delivery. Make sure RESEND_API_KEY is set.', 
                   'نظام البريد الإلكتروني يستخدم الآن Resend API لإرسال موثوق. تأكد من إعداد RESEND_API_KEY.')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">{t('Recipient Email Address', 'عنوان البريد الإلكتروني للمستلم')}</Label>
            <Input
              id="test-email"
              type="email"
              placeholder={language === 'ar' ? 'example@yahala.co' : 'example@yahala.co'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('Enter your email address to receive the test message', 
                 'أدخل عنوان بريدك الإلكتروني لتلقي الرسالة التجريبية')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Email Template', 'قالب البريد الإلكتروني')}</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {language === 'ar' ? template.subjectAr : template.subjectEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Email Language', 'لغة البريد الإلكتروني')}</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={sendTestEmail} 
            disabled={loading || !email}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4 me-2" />
            {loading ? t('Sending...', 'جاري الإرسال...') : t('Send Test Email', 'إرسال بريد تجريبي')}
          </Button>
        </div>

        {lastResult && (
          <div className={`p-4 rounded-lg border ${
            lastResult.success 
              ? 'bg-success/10 border-success/20' 
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium mb-1 ${
                  lastResult.success ? 'text-success' : 'text-destructive'
                }`}>
                  {lastResult.success 
                    ? t('Email Sent Successfully!', 'تم إرسال البريد بنجاح!') 
                    : t('Email Send Failed', 'فشل إرسال البريد')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {lastResult.message}
                </p>
                {lastResult.success && (
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">
                      {t('Template:', 'القالب:')} {selectedTemplate}
                    </Badge>
                    <Badge variant="outline">
                      {t('Language:', 'اللغة:')} {selectedLanguage === 'ar' ? 'Arabic' : 'English'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-medium text-sm">{t('Available Templates:', 'القوالب المتاحة:')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((template) => (
              <div key={template.name} className="text-xs p-2 bg-background rounded border">
                <div className="font-medium">{language === 'ar' ? template.subjectAr : template.subjectEn}</div>
                <div className="text-muted-foreground">{template.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
          <p className="text-sm">
            <strong>ℹ️ {t('Setup:', 'الإعداد:')}</strong>{' '}
            {t('This system uses Resend API. Get your API key from resend.com and add it to the RESEND_API_KEY environment variable.',
               'يستخدم هذا النظام Resend API. احصل على مفتاح API من resend.com وأضفه إلى متغير البيئة RESEND_API_KEY.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}