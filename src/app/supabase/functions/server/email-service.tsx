// Email Service for Ya Hala Group E-Portal
// Handles all email notifications using Resend API

import { BRAND_COLORS } from './brand-colors.tsx';

interface EmailTemplate {
  subject: string;
  subjectAr: string;
  html: string;
  htmlAr: string;
}

// Email Templates
export const emailTemplates = {
  requestSubmitted: {
    subject: 'Request Submitted Successfully',
    subjectAr: 'تم تقديم الطلب بنجاح',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #7AC143; padding-bottom: 10px;">Request Submitted</h2>
          
          <p>Dear <strong>${data.employeeName}</strong>,</p>
          
          <p>Your ${data.requestType} request has been successfully submitted.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Request ID:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Type:</strong></td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
                <td style="padding: 8px 0;"><span style="background-color: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">Pending</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Submitted:</strong></td>
                <td style="padding: 8px 0;">${data.submittedAt}</td>
              </tr>
            </table>
          </div>
          
          <p>Your request is now pending approval from your manager. You will receive another notification once it has been reviewed.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Request</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is an automated message from Ya Hala Group HR System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية</p>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #7AC143; padding-bottom: 10px;">تم تقديم الطلب</h2>
          
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>تم تقديم طلب ${data.requestType} الخاص بك بنجاح.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل الطلب:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>النوع:</strong></td>
                <td style="padding: 8px 0;">${data.requestTypeAr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>الحالة:</strong></td>
                <td style="padding: 8px 0;"><span style="background-color: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">قيد الانتظار</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>تاريخ التقديم:</strong></td>
                <td style="padding: 8px 0;">${data.submittedAt}</td>
              </tr>
            </table>
          </div>
          
          <p>طلبك الآن قيد الموافقة من قبل مديرك المباشر. سوف تتلقى إشعاراً آخر بمجرد مراجعته.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">عرض الطلب</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
            الرجاء عدم الرد على هذا البريد الإلكتروني.
          </p>
        </div>
      </div>
    `
  },

  requestApproved: {
    subject: 'Request Approved',
    subjectAr: 'تمت الموافقة على الطلب',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 80px; height: 80px; background-color: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 40px;">✓</span>
            </div>
          </div>
          
          <h2 style="color: #10B981; text-align: center; margin-bottom: 20px;">Request Approved!</h2>
          
          <p>Dear <strong>${data.employeeName}</strong>,</p>
          
          <p>Great news! Your ${data.requestType} request has been <strong style="color: #10B981;">approved</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Request ID:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Type:</strong></td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Approved by:</strong></td>
                <td style="padding: 8px 0;">${data.approverName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Approved on:</strong></td>
                <td style="padding: 8px 0;">${data.approvedAt}</td>
              </tr>
            </table>
            ${data.comments ? `<p style="margin-top: 15px;"><strong>Comments:</strong><br>${data.comments}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Request</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is an automated message from Ya Hala Group HR System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 80px; height: 80px; background-color: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 40px;">✓</span>
            </div>
          </div>
          
          <h2 style="color: #10B981; text-align: center; margin-bottom: 20px;">تمت الموافقة على الطلب!</h2>
          
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>أخبار سارة! تمت <strong style="color: #10B981;">الموافقة</strong> على طلب ${data.requestTypeAr} الخاص بك.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل الطلب:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>النوع:</strong></td>
                <td style="padding: 8px 0;">${data.requestTypeAr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>تمت الموافقة من قبل:</strong></td>
                <td style="padding: 8px 0;">${data.approverName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>تاريخ الموافقة:</strong></td>
                <td style="padding: 8px 0;">${data.approvedAt}</td>
              </tr>
            </table>
            ${data.comments ? `<p style="margin-top: 15px;"><strong>التعليقات:</strong><br>${data.comments}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">عرض الطلب</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
            الرجاء عدم الرد على هذا البريد الإلكتروني.
          </p>
        </div>
      </div>
    `
  },

  requestRejected: {
    subject: 'Request Rejected',
    subjectAr: 'تم رفض الطلب',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
          </div>
          
          <h2 style="color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">Request Rejected</h2>
          
          <p>Dear <strong>${data.employeeName}</strong>,</p>
          
          <p>We regret to inform you that your ${data.requestType} request has been <strong style="color: #DC2626;">rejected</strong>.</p>
          
          <div style="background-color: #FEF2F2; padding: 20px; border-radius: 6px; border-left: 4px solid #DC2626; margin: 20px 0;">
            <h3 style="color: #DC2626; margin-top: 0;">Reason for Rejection:</h3>
            <p style="margin: 0;">${data.reason || 'No specific reason provided'}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Request ID:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Type:</strong></td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Rejected by:</strong></td>
                <td style="padding: 8px 0;">${data.rejectedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Rejected on:</strong></td>
                <td style="padding: 8px 0;">${data.rejectedAt}</td>
              </tr>
            </table>
          </div>
          
          <p>If you have any questions or would like to discuss this decision, please contact your manager or HR department.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Request</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is an automated message from Ya Hala Group HR System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية</p>
          </div>
          
          <h2 style="color: #DC2626; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">تم رفض الطلب</h2>
          
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>نأسف لإبلاغك بأنه تم <strong style="color: #DC2626;">رفض</strong> طلب ${data.requestTypeAr} الخاص بك.</p>
          
          <div style="background-color: #FEF2F2; padding: 20px; border-radius: 6px; border-right: 4px solid #DC2626; margin: 20px 0;">
            <h3 style="color: #DC2626; margin-top: 0;">سبب الرفض:</h3>
            <p style="margin: 0;">${data.reason || 'لم يتم تقديم سبب محدد'}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل الطلب:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>النوع:</strong></td>
                <td style="padding: 8px 0;">${data.requestTypeAr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>رفض من قبل:</strong></td>
                <td style="padding: 8px 0;">${data.rejectedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>تاريخ الرفض:</strong></td>
                <td style="padding: 8px 0;">${data.rejectedAt}</td>
              </tr>
            </table>
          </div>
          
          <p>إذا كان لديك أي أسئلة أو ترغب في مناقشة هذا القرار، يرجى الاتصال بمديرك أو قسم الموارد البشرية.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">عرض الطلب</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
            الرجاء عدم الرد على هذا البريد الإلكتروني.
          </p>
        </div>
      </div>
    `
  },

  approvalNeeded: {
    subject: 'New Request Awaiting Your Approval',
    subjectAr: 'طلب جديد في انتظار موافقتك',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
          </div>
          
          <div style="background-color: #FFA500; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">⏰ Action Required</h2>
          </div>
          
          <p>Dear <strong>${data.managerName}</strong>,</p>
          
          <p>A new ${data.requestType} request from <strong>${data.employeeName}</strong> requires your approval.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Request Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Employee:</strong></td>
                <td style="padding: 8px 0;">${data.employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Request Type:</strong></td>
                <td style="padding: 8px 0;">${data.requestType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Request ID:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Submitted:</strong></td>
                <td style="padding: 8px 0;">${data.submittedAt}</td>
              </tr>
              ${data.details ? `<tr><td colspan="2" style="padding: 8px 0;"><strong>Details:</strong><br>${data.details}</td></tr>` : ''}
            </table>
          </div>
          
          <p>Please review and process this request at your earliest convenience.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Request</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is an automated message from Ya Hala Group HR System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية</p>
          </div>
          
          <div style="background-color: #FFA500; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">⏰ مطلوب اتخاذ إجراء</h2>
          </div>
          
          <p>عزيزي/عزيزتي <strong>${data.managerName}</strong>،</p>
          
          <p>طلب ${data.requestTypeAr} جديد من <strong>${data.employeeName}</strong> يتطلب موافقتك.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل الطلب:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>الموظف:</strong></td>
                <td style="padding: 8px 0;">${data.employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>نوع الطلب:</strong></td>
                <td style="padding: 8px 0;">${data.requestTypeAr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${data.requestId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>تاريخ التقديم:</strong></td>
                <td style="padding: 8px 0;">${data.submittedAt}</td>
              </tr>
              ${data.details ? `<tr><td colspan="2" style="padding: 8px 0;"><strong>التفاصيل:</strong><br>${data.details}</td></tr>` : ''}
            </table>
          </div>
          
          <p>يرجى مراجعة ومعالجة هذا الطلب في أقرب وقت ممكن.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">مراجعة الطلب</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
            الرجاء عدم الرد على هذا البريد الإلكتروني.
          </p>
        </div>
      </div>
    `
  },

  passwordReset: {
    subject: 'Security Update: New Password',
    subjectAr: 'تحديث أمني: كلمة مرور جديدة',
    html: (data: any) => `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>Password Update Notification</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f4f5; font-family: Arial, sans-serif; color: #333333; line-height: 1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f4f5">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td height="6" style="background-color: #006B7D;"></td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="margin-bottom: 10px;">
                                <h1 style="font-size: 24px; margin-bottom: 20px; color: #1f2937;">Password Updated</h1>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563;">Hello <strong>${data.full_name}</strong>,</p>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563;">Your employee portal password has been successfully reset by the administrator. Please use the credential below to log in.</p>
                            </div>

                            <div style="background-color: #f3f4f6; border: 2px dashed #006B7D; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                                <div style="font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px;">New Password</div>
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: 1px;">${data.new_password}</div>
                            </div>

                            <div style="direction: rtl; text-align: right;" lang="ar">
                                <h1 style="font-size: 24px; margin-bottom: 20px; color: #1f2937; font-family: Tahoma, Arial, sans-serif;">تم تحديث كلمة المرور</h1>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563; font-family: Tahoma, Arial, sans-serif;">مرحباً <strong>${data.full_name_ar || data.full_name}</strong>،</p>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563; font-family: Tahoma, Arial, sans-serif;">قام المسؤول بإعادة تعيين كلمة المرور الخاصة بك في بوابة الموظفين. يرجى استخدام كلمة المرور الموضحة أعلاه لتسجيل الدخول.</p>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://portal.yahala.co/login" style="display: inline-block; padding: 12px 24px; background-color: #006B7D; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Login to Portal / تسجيل الدخول</a>
                            </div>

                            <div style="text-align: center; margin-top: 25px; font-size: 13px; color: #ef4444;">
                                <strong>Security Note:</strong> We recommend changing this password after your first login.<br>
                                <strong>تنبيه أمني:</strong> نوصي بتغيير كلمة المرور هذه بعد تسجيل الدخول الأول.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                            <p style="margin: 0;">&copy; 2026 Ya Hala Group. All rights reserved.</p>
                            <p style="margin: 5px 0 0;">This is an automated message, please do not reply.<br>هذه رسالة آلية، الرجاء عدم الرد.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `,
    htmlAr: (data: any) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <title>إشعار تحديث كلمة ال��رور</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f4f5; font-family: Arial, sans-serif; color: #333333; line-height: 1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f4f5">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td height="6" style="background-color: #006B7D;"></td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div style="margin-bottom: 10px; text-align: right;">
                                <h1 style="font-size: 24px; margin-bottom: 20px; color: #1f2937; font-family: Tahoma, Arial, sans-serif;">تم تحديث كلمة المرور</h1>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563; font-family: Tahoma, Arial, sans-serif;">مرحباً <strong>${data.full_name_ar || data.full_name}</strong>،</p>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563; font-family: Tahoma, Arial, sans-serif;">قام المسؤول بإعادة تعيين كلمة المرور الخاصة بك في بوابة الموظفين. يرجى استخدام كلمة المرور الموضحة أدناه لتسجيل الدخول.</p>
                            </div>

                            <div style="background-color: #f3f4f6; border: 2px dashed #006B7D; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                                <div style="font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px;">كلمة المرور الجديدة</div>
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: 1px;">${data.new_password}</div>
                            </div>

                            <div style="text-align: left; direction: ltr;">
                                <h1 style="font-size: 24px; margin-bottom: 20px; color: #1f2937;">Password Updated</h1>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563;">Hello <strong>${data.full_name}</strong>,</p>
                                <p style="margin-bottom: 15px; font-size: 16px; color: #4b5563;">Your employee portal password has been successfully reset by the administrator.</p>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://portal.yahala.co/login" style="display: inline-block; padding: 12px 24px; background-color: #006B7D; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">تسجيل الدخول / Login</a>
                            </div>

                            <div style="text-align: center; margin-top: 25px; font-size: 13px; color: #ef4444;">
                                <strong>تنبيه أمني:</strong> نوصي بتغيير كلمة المرور هذه بعد تسجيل الدخول الأول.<br>
                                <strong>Security Note:</strong> We recommend changing this password after your first login.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                            <p style="margin: 0;">&copy; 2026 Ya Hala Group. All rights reserved.</p>
                            <p style="margin: 5px 0 0;">هذه رسالة آلية، الرجاء عدم الرد.<br>This is an automated message, please do not reply.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `
  },

  employeeInvitation: {
    subject: 'Welcome to Ya Hala Group E-Portal',
    subjectAr: 'مرحباً بك في بوابة مجموعة يا هلا الإلكترونية',
    html: (data: any) => `
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
                <td style="padding: 5px 0;">${data.position || 'Employee'}</td>
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
    `,
    htmlAr: (data: any) => `
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
                <td style="padding: 5px 0;">${data.positionAr || data.position || 'موظف'}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">تسجيل الدخول إلى البوابة</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
            إذا كان لديك أي أس��لة، يرجى الاتصال بقسم الموارد البشرية.<br>
            الرجاء عدم الرد على هذا البريد الإلكتروني.
          </p>
        </div>
      </div>
    `
  },

  announcement: {
    subject: 'New Announcement',
    subjectAr: 'إعلان جديد',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
          </div>
          
          <div style="background-color: #7AC143; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">📢 ${data.title}</h2>
          </div>
          
          ${data.imageUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${data.imageUrl}" alt="Announcement" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
          ` : ''}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; line-height: 1.6;">
            ${data.content.split('\n').map((line: string) => `<p style="margin: 10px 0;">${line}</p>`).join('')}
          </div>
          
          <div style="background-color: #E8F5E9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #2E7D32; font-size: 14px;">
              <strong>📅 Posted:</strong> ${data.postedDate}<br>
              <strong>👤 Posted by:</strong> ${data.postedBy}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View in Portal</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is an automated message from Ya Hala Group HR System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية الإلكترونية</p>
          </div>
          
          <div style="background-color: #7AC143; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">📢 ${data.titleAr || data.title}</h2>
          </div>
          
          ${data.imageUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${data.imageUrl}" alt="إعلان" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
          ` : ''}
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; line-height: 1.8;">
            ${(data.contentAr || data.content).split('\n').map((line: string) => `<p style="margin: 10px 0;">${line}</p>`).join('')}
          </div>
          
          <div style="background-color: #E8F5E9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #2E7D32; font-size: 14px;">
              <strong>📅 تاريخ النشر:</strong> ${data.postedDate}<br>
              <strong>👤 نشر بواسطة:</strong> ${data.postedByAr || data.postedBy}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">عرض في البوابة</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            هذه رسالة تلقائية من نظام الموارد البشرية لمجموعة يا هلا.<br>
            الرجاء عدم الرد على هذا البريد الإلكتروني.
          </p>
        </div>
      </div>
    `
  },

  // ── Annual Leave → Accountants (advance payment prep) ────────────────────
  annualLeaveAccountant: {
    subject: 'Annual Leave Approved — Advance Payment Required',
    subjectAr: 'إجازة سنوية معتمدة — مطلوب صرف مقدمة راتب',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal — Finance Notice</p>
          </div>
          <div style="background-color: #006B7D; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">💰 Advance Payment Required</h2>
          </div>
          <p>Dear <strong>${data.accountantName || 'Accountant'}</strong>,</p>
          <p>An <strong>Annual Leave</strong> has been approved. Please prepare the advance salary payment as per company policy.</p>
          <div style="background-color: #f0f9f0; padding: 20px; border-radius: 6px; border-left: 4px solid #7AC143; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Leave & Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;"><strong>Employee:</strong></td><td>${data.employeeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Leave From:</strong></td><td>${data.startDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Leave To:</strong></td><td>${data.endDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Total Days:</strong></td><td><strong>${data.days} days</strong></td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Request ID:</strong></td><td>${data.requestId}</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #006B7D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Open Portal</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">Automated message from Ya Hala Group HR System. Do not reply.</p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية — إشعار مالي</p>
          </div>
          <div style="background-color: #006B7D; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">💰 مطلوب صرف مقدمة راتب</h2>
          </div>
          <p>عزيزي/عزيزتي <strong>${data.accountantName || 'المحاسب'}</strong>،</p>
          <p>تمت الموافقة على <strong>إجازة سنوية</strong>. يُرجى إعداد مقدمة الراتب وفق سياسة الشركة.</p>
          <div style="background-color: #f0f9f0; padding: 20px; border-radius: 6px; border-right: 4px solid #7AC143; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل الإجازة والصرف</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;"><strong>الموظف:</strong></td><td>${data.employeeNameAr || data.employeeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>من تاريخ:</strong></td><td>${data.startDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>إلى تاريخ:</strong></td><td>${data.endDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>عدد الأيام:</strong></td><td><strong>${data.days} يوم</strong></td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>رقم الطلب:</strong></td><td>${data.requestId}</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #006B7D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">فتح البوابة</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">رسالة آلية من نظام موارد بشرية مجموعة يا هلا. لا ترد على هذا البريد.</p>
        </div>
      </div>
    `
  },

  // ── Annual Leave → Owner (exit permission) ────────────────────────────────
  annualLeaveOwner: {
    subject: 'Annual Leave Approved — Exit Permission Notice',
    subjectAr: 'إجازة سنوية معتمدة — إشعار تصريح الخروج',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal — Owner Notice</p>
          </div>
          <div style="background-color: #7AC143; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">🛫 Exit Permission — Annual Leave</h2>
          </div>
          <p>Dear <strong>${data.ownerName || 'Owner'}</strong>,</p>
          <p>The following employee's annual leave has been approved. An exit permission is required for this financial year.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #7AC143; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Leave Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;"><strong>Employee:</strong></td><td>${data.employeeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Leave Period:</strong></td><td>${data.startDate} → ${data.endDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Total Days:</strong></td><td><strong>${data.days} days</strong></td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Financial Year:</strong></td><td>${data.financialYear}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Request ID:</strong></td><td>${data.requestId}</td></tr>
            </table>
          </div>
          <p style="background-color: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <strong>Note:</strong> This is the <strong>first</strong> exit permission for this employee in financial year <strong>${data.financialYear}</strong>. Covered by the company.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View in Portal</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">Automated message from Ya Hala Group HR System. Do not reply.</p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية — إشعار المالك</p>
          </div>
          <div style="background-color: #7AC143; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">🛫 تصريح خروج — إجازة سنوية</h2>
          </div>
          <p>عزيزي/عزيزتي <strong>${data.ownerName || 'المالك'}</strong>،</p>
          <p>تمت الموافقة على الإجازة السنوية للموظف أدناه، ويستلزم ذلك إصدار تصريح خروج للسنة المالية الحالية.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-right: 4px solid #7AC143; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل الإجازة</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;"><strong>الموظف:</strong></td><td>${data.employeeNameAr || data.employeeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>فترة الإجازة:</strong></td><td>${data.startDate} ← ${data.endDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>عدد الأيام:</strong></td><td><strong>${data.days} يوم</strong></td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>السنة المالية:</strong></td><td>${data.financialYear}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>رقم الطلب:</strong></td><td>${data.requestId}</td></tr>
            </table>
          </div>
          <p style="background-color: #fff3cd; padding: 12px; border-radius: 6px; border-right: 4px solid #ffc107;">
            <strong>ملاحظة:</strong> هذا هو <strong>أول</strong> تصريح خروج لهذا الموظف في السنة المالية <strong>${data.financialYear}</strong>، مغطى من قِبَل الشركة.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">عرض في البوابة</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">رسالة آلية من نظام موارد بشرية مجموعة يا هلا. لا ترد على هذا البريد.</p>
        </div>
      </div>
    `
  },

  // ── Advance Approved → Accountants (with one-click disburse) ─────────────
  advanceApprovedAccountant: {
    subject: 'Advance Request Approved — Disbursement Required',
    subjectAr: 'تمت الموافقة على طلب السلفة — مطلوب الصرف',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal — Finance Action</p>
          </div>
          <div style="background-color: #006B7D; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">💳 Advance Disbursement Required</h2>
          </div>
          <p>Dear <strong>${data.accountantName || 'Accountant'}</strong>,</p>
          <p>An advance (salary loan) request has been approved. Please process the disbursement at your earliest convenience.</p>
          <div style="background-color: #f0f9f0; padding: 20px; border-radius: 6px; border-left: 4px solid #006B7D; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Advance Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;"><strong>Employee:</strong></td><td>${data.employeeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Amount:</strong></td><td style="font-size: 18px; font-weight: bold; color: #006B7D;">${data.amount} SAR</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Reason:</strong></td><td>${data.reason || '—'}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Request ID:</strong></td><td>${data.requestId}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>Approved by:</strong></td><td>${data.approverName}</td></tr>
            </table>
          </div>
          <p style="text-align: center; font-weight: bold; color: #333;">Once you have disbursed the amount, click the button below to confirm:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.disbursementUrl}" style="background-color: #10B981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">✅ Confirm Disbursement</a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">One-click confirmation. No login required. Employee will be notified automatically.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">Automated message from Ya Hala Group HR System. Do not reply.</p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية — إجراء مالي</p>
          </div>
          <div style="background-color: #006B7D; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">💳 مطلوب صرف السلفة</h2>
          </div>
          <p>عزيزي/عزيزتي <strong>${data.accountantName || 'المحاسب'}</strong>،</p>
          <p>تمت الموافقة على طلب سلفة. يُرجى معالجة الصرف في أقرب وقت ممكن.</p>
          <div style="background-color: #f0f9f0; padding: 20px; border-radius: 6px; border-right: 4px solid #006B7D; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">تفاصيل السلفة</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;"><strong>الموظف:</strong></td><td>${data.employeeNameAr || data.employeeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>المبلغ:</strong></td><td style="font-size: 18px; font-weight: bold; color: #006B7D;">${data.amount} ر.س</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>السبب:</strong></td><td>${data.reason || '—'}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>رقم الطلب:</strong></td><td>${data.requestId}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;"><strong>اعتمد من قِبَل:</strong></td><td>${data.approverName}</td></tr>
            </table>
          </div>
          <p style="text-align: center; font-weight: bold; color: #333;">بعد صرف المبلغ، اضغط الزر أدناه للتأكيد:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.disbursementUrl}" style="background-color: #10B981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">✅ تأكيد الصرف</a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">تأكيد بنقرة واحدة، لا يتطلب تسجيل دخول. سيتم إشعار الموظف تلقائياً.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">رسالة آلية من نظام موارد بشرية مجموعة يا هلا. لا ترد على هذا البريد.</p>
        </div>
      </div>
    `
  },

  // ── Advance Disbursed → Employee ──────────────────────────────────────────
  advanceDisbursed: {
    subject: 'Your Advance Has Been Disbursed',
    subjectAr: 'تم صرف سلفتك',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal</p>
          </div>
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 80px; height: 80px; background-color: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 40px;">✓</span>
            </div>
          </div>
          <h2 style="color: #10B981; text-align: center;">Advance Disbursed!</h2>
          <p>Dear <strong>${data.employeeName}</strong>,</p>
          <p>Your advance request has been <strong style="color: #10B981;">disbursed</strong> by the finance team.</p>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #10B981; margin: 20px 0; text-align: center;">
            <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Amount Disbursed</p>
            <p style="font-size: 28px; font-weight: bold; color: #10B981; margin: 0;">${data.amount} SAR</p>
            <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">Request ID: ${data.requestId}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View in Portal</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">Automated message from Ya Hala Group HR System. Do not reply.</p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية</p>
          </div>
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 80px; height: 80px; background-color: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 40px;">✓</span>
            </div>
          </div>
          <h2 style="color: #10B981; text-align: center;">تم صرف السلفة!</h2>
          <p>عزيزي/عزيزتي <strong>${data.employeeNameAr || data.employeeName}</strong>،</p>
          <p>تم <strong style="color: #10B981;">صرف</strong> سلفتك من قِبَل الفريق المالي.</p>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-right: 4px solid #10B981; margin: 20px 0; text-align: center;">
            <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">المبلغ المصروف</p>
            <p style="font-size: 28px; font-weight: bold; color: #10B981; margin: 0;">${data.amount} ر.س</p>
            <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">رقم الطلب: ${data.requestId}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #7AC143; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">عرض في البوابة</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">رسالة آلية من نظام موارد بشرية مجموعة يا هلا. لا ترد على هذا البريد.</p>
        </div>
      </div>
    `
  },

  // ── Contract Expiry → Employee (rights-based, informative tone) ───────────
  contractExpiryEmployee: {
    subject: 'Information About Your Contract End Date',
    subjectAr: 'معلومات حول تاريخ انتهاء عقدك',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal — Your Rights</p>
          </div>
          <div style="background-color: #EFF6FF; color: #1E40AF; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; border: 1px solid #BFDBFE;">
            <h2 style="margin: 0;">📋 Contract Information</h2>
          </div>
          <p>Dear <strong>${data.employeeName}</strong>,</p>
          <p>This is a friendly reminder that your employment contract is approaching its end date. We want to make sure you are fully aware of your rights and options.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 45%;"><strong>Contract End Date:</strong></td><td style="font-weight: bold;">${data.contractEndDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>Days Remaining:</strong></td><td style="font-weight: bold; color: #1E40AF;">${data.daysRemaining} days</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>Notice Deadline (60 days):</strong></td><td style="font-weight: bold;">${data.noticeDeadline}</td></tr>
            </table>
          </div>
          <div style="background-color: #EFF6FF; padding: 20px; border-radius: 6px; border-left: 4px solid #3B82F6; margin: 20px 0;">
            <h3 style="color: #1E40AF; margin-top: 0;">Your Rights</h3>
            <p style="margin: 0; line-height: 1.8;">As per your employment terms, you have the <strong>right to express your intention</strong> regarding renewal or non-renewal. The standard notice period is <strong>60 days</strong> before the contract end date — which falls on <strong>${data.noticeDeadline}</strong>.</p>
            <p style="margin: 15px 0 0 0; line-height: 1.8; color: #374151;"><strong>No action is required</strong> if you are not planning any changes — this is simply an informational notice to help you plan ahead.</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #006B7D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Open Portal</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">Automated message from Ya Hala Group HR System. Do not reply.</p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية — حقوقك</p>
          </div>
          <div style="background-color: #EFF6FF; color: #1E40AF; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; border: 1px solid #BFDBFE;">
            <h2 style="margin: 0;">📋 معلومات العقد</h2>
          </div>
          <p>عزيزي/عزيزتي <strong>${data.employeeNameAr || data.employeeName}</strong>،</p>
          <p>نودّ إعلامك بأن تاريخ انتهاء عقد عملك يقترب. نحرص على أن تكون على علم تام بحقوقك وخياراتك.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 45%;"><strong>تاريخ انتهاء العقد:</strong></td><td style="font-weight: bold;">${data.contractEndDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>الأيام المتبقية:</strong></td><td style="font-weight: bold; color: #1E40AF;">${data.daysRemaining} يوم</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>الموعد النهائي للإشعار (60 يوماً):</strong></td><td style="font-weight: bold;">${data.noticeDeadline}</td></tr>
            </table>
          </div>
          <div style="background-color: #EFF6FF; padding: 20px; border-radius: 6px; border-right: 4px solid #3B82F6; margin: 20px 0;">
            <h3 style="color: #1E40AF; margin-top: 0;">حقوقك</h3>
            <p style="margin: 0; line-height: 2;">وفقاً لشروط عملك، لك <strong>الحق في التعبير عن نيتك</strong> بشأن تجديد العقد أو عدم تجديده. فترة الإشعار القياسية هي <strong>60 يوماً</strong> قبل تاريخ انتهاء العقد — أي بحلول <strong>${data.noticeDeadline}</strong>.</p>
            <p style="margin: 15px 0 0 0; line-height: 2; color: #374151;"><strong>لا يلزمك اتخاذ أي إجراء</strong> إن لم تكن تخطط لأي تغييرات — هذا مجرد إشعار معلوماتي لمساعدتك في التخطيط المسبق.</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #006B7D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">فتح البوابة</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">رسالة آلية من نظام موارد بشرية مجموعة يا هلا. لا ترد على هذا البريد.</p>
        </div>
      </div>
    `
  },

  // ── Contract Expiry → Manager / HR (administrative notice) ───────────────
  contractExpiryHRManager: {
    subject: 'Contract Expiry Notice — Administrative Update',
    subjectAr: 'إشعار انتهاء عقد — تحديث إداري',
    html: (data: any) => `
      <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">Ya Hala Group</h1>
            <p style="color: #666; margin: 5px 0;">HR E-Portal — Administrative Notice</p>
          </div>
          <div style="background-color: #F3F4F6; color: #374151; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; border: 1px solid #D1D5DB;">
            <h2 style="margin: 0;">📁 Contract Expiry — Routine Notice</h2>
          </div>
          <p>Dear <strong>${data.recipientName}</strong>,</p>
          <p>This is a routine administrative notice. The following employee's contract is approaching its expiry date.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 45%;"><strong>Employee:</strong></td><td style="font-weight: bold;">${data.employeeName}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>Contract End Date:</strong></td><td style="font-weight: bold;">${data.contractEndDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>Days Remaining:</strong></td><td style="font-weight: bold;">${data.daysRemaining} days</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>Notice Deadline (60-day):</strong></td><td style="font-weight: bold;">${data.noticeDeadline}</td></tr>
            </table>
          </div>
          <p style="background-color: #F9FAFB; padding: 12px; border-radius: 6px; border-left: 4px solid #9CA3AF; color: #6B7280;">The employee has been informed of their rights. This notice is for your records and planning purposes only.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #006B7D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View in Portal</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">Automated message from Ya Hala Group HR System. Do not reply.</p>
        </div>
      </div>
    `,
    htmlAr: (data: any) => `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #7AC143; margin: 0;">مجموعة يا هلا</h1>
            <p style="color: #666; margin: 5px 0;">بوابة الموارد البشرية — إشعار إداري</p>
          </div>
          <div style="background-color: #F3F4F6; color: #374151; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; border: 1px solid #D1D5DB;">
            <h2 style="margin: 0;">📁 انتهاء عقد — إشعار دوري</h2>
          </div>
          <p>عزيزي/عزيزتي <strong>${data.recipientName}</strong>،</p>
          <p>هذا إشعار إداري دوري. يقترب تاريخ انتهاء عقد الموظف التالي.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 45%;"><strong>الموظف:</strong></td><td style="font-weight: bold;">${data.employeeNameAr || data.employeeName}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>تاريخ انتهاء العقد:</strong></td><td style="font-weight: bold;">${data.contractEndDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>الأيام المتبقية:</strong></td><td style="font-weight: bold;">${data.daysRemaining} يوم</td></tr>
              <tr><td style="padding: 8px 0; color: #666;"><strong>الموعد النهائي للإشعار (60 يوماً):</strong></td><td style="font-weight: bold;">${data.noticeDeadline}</td></tr>
            </table>
          </div>
          <p style="background-color: #F9FAFB; padding: 12px; border-radius: 6px; border-right: 4px solid #9CA3AF; color: #6B7280;">تم إبلاغ الموظف بحقوقه. هذا الإشعار للسجلات والتخطيط الإداري فحسب.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.portalUrl}" style="background-color: #006B7D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">عرض في البوابة</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">رسالة آلية من نظام موارد بشرية مجموعة يا هلا. لا ترد على هذا البريد.</p>
        </div>
      </div>
    `
  }
};

// Send email function using Resend API
export async function sendEmail(
  to: string,
  templateName: keyof typeof emailTemplates,
  data: any,
  language: 'en' | 'ar' = 'en'
): Promise<boolean> {
  try {
    const template = emailTemplates[templateName];
    const subject = language === 'ar' ? template.subjectAr : template.subject;
    const html = language === 'ar' ? template.htmlAr(data) : template.html(data);

    console.log('');
    console.log('════════════════════════════════════════');
    console.log('📧 RESEND EMAIL SERVICE');
    console.log('════════════════════════════════════════');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Language:', language);
    console.log('Template:', templateName);

    // Get Resend API Key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.log('');
      console.log('❌ ERROR: RESEND_API_KEY not configured');
      console.log('════════════════════════════════════════');
      console.log('📋 SETUP INSTRUCTIONS:');
      console.log('1. Go to https://resend.com and sign up');
      console.log('2. Create an API key in the dashboard');
      console.log('3. Add it to RESEND_API_KEY in Supabase environment variables');
      console.log('4. The email system will work automatically after that');
      console.log('════════════════════════════════════════');
      console.log('');
      return false;
    }

    console.log('✓ API Key found');
    console.log('✓ Sending request to Resend API...');

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ya Hala Group HR <noreply@yahala.co>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log('');
      console.log('❌ RESEND API ERROR');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(result, null, 2));
      console.log('════════════════════════════════════════');
      console.log('⚠️  COMMON ISSUES:');
      console.log('1. Invalid API key - Check your RESEND_API_KEY');
      console.log('2. Domain not verified - Use onboarding@resend.dev for testing');
      console.log('3. Rate limit exceeded - Wait a moment and try again');
      console.log('════════════════════════════════════════');
      console.log('');
      return false;
    }

    console.log('');
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('Email ID:', result.id);
    console.log('════════════════════════════════════════');
    console.log('');
    return true;
  } catch (error) {
    console.log('');
    console.log('❌ EMAIL SERVICE ERROR');
    console.log('════════════════════════════════════════');
    console.log('Error:', error);
    console.log('Recipient:', to);
    console.log('Template:', templateName);
    console.log('════════════════════════════════════════');
    console.log('');
    
    // Return false to indicate failure
    return false;
  }
}

// ── Send email with CC support (for advance notifications) ───────────────────
export async function sendEmailWithCC(
  to: string,
  cc: string[],
  templateName: keyof typeof emailTemplates,
  data: any,
  language: 'en' | 'ar' = 'en'
): Promise<boolean> {
  try {
    const template = emailTemplates[templateName];
    const subject = language === 'ar' ? template.subjectAr : template.subject;
    const html = language === 'ar' ? template.htmlAr(data) : template.html(data);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('❌ RESEND_API_KEY not configured (sendEmailWithCC)');
      return false;
    }

    const payload: any = {
      from: 'Ya Hala Group HR <noreply@yahala.co>',
      to: [to],
      subject,
      html,
    };
    if (cc && cc.length > 0) payload.cc = cc;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('sendEmailWithCC error:', result);
      return false;
    }
    console.log(`✅ Email (with CC) sent to ${to}, CC: ${cc.join(', ')}`);
    return true;
  } catch (e) {
    console.error('sendEmailWithCC exception:', e);
    return false;
  }
}

// Helper function to get employee email
export async function getEmployeeEmail(employeeId: string): Promise<string | null> {
  try {
    // This would be imported from your KV store
    // For now, return a placeholder
    return `employee${employeeId}@yahala.co`;
  } catch (error) {
    console.error('Error getting employee email:', error);
    return null;
  }
}