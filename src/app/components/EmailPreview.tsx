// Email Template Preview Component - For Testing Only
// This component allows admins to preview invitation emails before sending

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Mail } from 'lucide-react';

export function EmailPreview() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const sampleData = {
    employeeName: 'Ahmed Mohammed',
    employeeNameAr: 'أحمد محمد',
    employeeId: '12345',
    email: 'ahmed.mohammed@yahala.co',
    temporaryPassword: 'ABC456xyz',
    company: 'Ya Hala for Travel & Tours',
    companyAr: 'يا هلا للسفر والسياحة',
    position: 'Sales Manager',
    positionAr: 'مدير مبيعات',
    portalUrl: window.location.origin
  };

  const generateEnglishHTML = (data: typeof sampleData) => `
    <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
          <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 80px; height: 80px; background-color: #7AC143; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 40px;">👋</span>
          </div>
        </div>
        
        <h2 style="color: #7AC143; text-align: center; margin-bottom: 20px;">Welcome to the Team!</h2>
        
        <p>Dear <strong>${data.employeeName}</strong>,</p>
        
        <p>Your employee account has been created in the Ya Hala Group E-Portal. You can now access all HR services including leave requests, advance requests, and entry permissions.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border: 2px solid #7AC143;">
          <h3 style="color: #333; margin-top: 0;">Your Login Credentials:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Username (Email):</strong></td>
              <td style="padding: 8px 0; font-family: 'Courier New', monospace; font-size: 14px;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Temporary Password:</strong></td>
              <td style="padding: 8px 0; font-family: 'Courier New', monospace; font-size: 16px; color: #7AC143;"><strong>${data.temporaryPassword}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #FFF3CD; padding: 15px; border-radius: 6px; border-left: 4px solid #FFA500; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>🔒 Important - First Login Requirements:</strong></p>
          <ul style="margin: 10px 0 0 20px; color: #856404;">
            <li>You will be required to change your password</li>
            <li>Complete your personal profile (phone, emergency contact, photo)</li>
            <li>Choose your preferred language</li>
            <li>This temporary password will expire after first use</li>
          </ul>
        </div>
        
        <div style="background-color: #E8F5E9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="color: #2E7D32; margin-top: 0;">Your Account Details:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Employee ID:</strong></td>
              <td style="padding: 5px 0;">${data.employeeId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Company:</strong></td>
              <td style="padding: 5px 0;">${data.company}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>Position:</strong></td>
              <td style="padding: 5px 0;">${data.position}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Login to Portal</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message from Ya Hala Group HR System.<br>
          If you have any questions, please contact your HR department.<br>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const generateArabicHTML = (data: typeof sampleData) => `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
          <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية الإلكترونية</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 80px; height: 80px; background-color: #7AC143; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 40px;">👋</span>
          </div>
        </div>
        
        <h2 style="color: #7AC143; text-align: center; margin-bottom: 20px;">مرحباً بك في الفريق!</h2>
        
        <p>عزيزي/عزيزتي <strong>${data.employeeNameAr || data.employeeName}</strong>،</p>
        
        <p>تم إنشاء حساب الموظف الخاص بك في بوابة مجموعة يا هلا الإلكترونية. يمكنك الآن الوصول إلى جميع خدمات الموارد البشرية بما في ذلك طلبات الإجازات وطلبات السلف وتصاريح الدخول.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border: 2px solid #7AC143;">
          <h3 style="color: #333; margin-top: 0;">بيانات تسجيل الدخول الخاصة بك:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>اسم المستخدم (البريد الإلكتروني):</strong></td>
              <td style="padding: 8px 0; font-family: 'Courier New', monospace; font-size: 14px;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>كلمة المرور المؤقتة:</strong></td>
              <td style="padding: 8px 0; font-family: 'Courier New', monospace; font-size: 16px; color: #7AC143;"><strong>${data.temporaryPassword}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #FFF3CD; padding: 15px; border-radius: 6px; border-right: 4px solid #FFA500; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>🔒 مهم - متطلبات تسجيل الدخول الأول:</strong></p>
          <ul style="margin: 10px 0 0 20px; color: #856404;">
            <li>سيُطلب منك تغيير كلمة المرور الخاصة بك</li>
            <li>إكمال ملفك الشخصي (الهاتف، جهة اتصال الطوارئ، الصورة)</li>
            <li>اختيار اللغة المفضلة لديك</li>
            <li>ستنتهي صلاحية كلمة المرور المؤقتة بعد أول استخدام</li>
          </ul>
        </div>
        
        <div style="background-color: #E8F5E9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="color: #2E7D32; margin-top: 0;">تفاصيل حسابك:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>رقم الموظف:</strong></td>
              <td style="padding: 5px 0;">${data.employeeId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>الشركة:</strong></td>
              <td style="padding: 5px 0;">${data.companyAr || data.company}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;"><strong>المنصب:</strong></td>
              <td style="padding: 5px 0;">${data.positionAr || data.position}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">تسجيل الدخول إلى البوابة</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
          إذا كان لديك أي أسئلة، يرجى الاتصال بقسم الموارد البشرية.<br>
          الرجاء عدم الرد على هذا البريد الإلكتروني.
        </p>
      </div>
    </div>
  `;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Employee Invitation Email Preview
        </CardTitle>
        <CardDescription>
          Preview how the invitation email will look to new employees
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ar')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="en">English 🇬🇧</TabsTrigger>
            <TabsTrigger value="ar">Arabic 🇧🇭</TabsTrigger>
          </TabsList>

          <TabsContent value="en">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div 
                dangerouslySetInnerHTML={{ __html: generateEnglishHTML(sampleData) }}
              />
            </div>
          </TabsContent>

          <TabsContent value="ar">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div 
                dangerouslySetInnerHTML={{ __html: generateArabicHTML(sampleData) }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Note:</strong> This is a preview only. Actual emails are sent automatically when admins create new employees with email addresses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
