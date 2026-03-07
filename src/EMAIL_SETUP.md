# 📧 Email System Setup Guide

## Overview

The Ya Hala Group E-Portal uses **Resend API** for reliable email delivery. This guide will walk you through the complete setup process.

---

## ✅ Why Resend?

- **Reliable**: Built specifically for transactional emails
- **Simple**: Easy integration with just an API key
- **Fast**: Works perfectly in Deno edge functions
- **Free Tier**: 100 emails/day on free plan (3,000/month)
- **No SMTP Issues**: Avoids the SMTP library compatibility problems in Deno

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Your Resend API Key

1. Go to **[resend.com](https://resend.com)** and sign up
2. Verify your email address
3. In the Resend dashboard, go to **API Keys**
4. Click **"Create API Key"**
5. Give it a name (e.g., "Ya Hala E-Portal")
6. Copy the API key (starts with `re_...`)

### Step 2: Add API Key to Environment

The **RESEND_API_KEY** environment variable has already been created for you! 

Simply upload your API key using the modal that appeared.

### Step 3: Configure Domain (Optional but Recommended)

#### Option A: Use Resend's Test Domain (Quick Start)
- Resend provides `onboarding@resend.dev` for testing
- **No configuration needed**
- Limited to 100 emails/day
- May end up in spam folder

#### Option B: Use Your Own Domain (Production)
1. In Resend dashboard, go to **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yahala.co`)
4. Add the DNS records Resend provides to your domain's DNS settings
5. Wait for verification (usually 5-30 minutes)

### Step 4: Update "From" Email Address

If using your own domain, update the email service:

**File**: `/supabase/functions/server/email-service.tsx`

```typescript
// Change this line:
from: 'Ya Hala Group HR <eportal@yahala.co>',

// To your verified email:
from: 'Ya Hala Group HR <noreply@yourverifieddomain.com>',
```

### Step 5: Test the System

1. Go to **Admin Portal** → **Settings** → **Email Tester**
2. Enter your email address
3. Select a template and language
4. Click **"Send Test Email"**
5. Check your inbox (and spam folder)

---

## 📋 Email Templates Available

The system includes **5 professional bilingual templates**:

| Template | English Subject | Arabic Subject |
|----------|----------------|----------------|
| `requestSubmitted` | Request Submitted Successfully | تم تقديم الطلب بنجاح |
| `requestApproved` | Request Approved | تمت الموافقة على الطلب |
| `requestRejected` | Request Rejected | تم رفض الطلب |
| `approvalNeeded` | New Request Awaiting Your Approval | طلب جديد في انتظار موافقتك |
| `passwordReset` | Password Reset Request | طلب إعادة تعيين كلمة المرور |

Each template supports both **English** and **Arabic** with proper RTL/LTR formatting.

---

## 🔧 Troubleshooting

### Email Not Sending

**Check 1: API Key**
```bash
# Verify RESEND_API_KEY is set
# Check console logs for: "❌ RESEND_API_KEY not found"
```

**Check 2: Domain Verification**
- Go to Resend dashboard → Domains
- Ensure status is "Verified" (green checkmark)
- If pending, check DNS records

**Check 3: Rate Limits**
- Free tier: 100 emails/day
- Paid tier: Higher limits
- Check Resend dashboard for usage

**Check 4: Console Logs**
- Open browser console
- Send test email
- Look for error messages
- Common errors:
  - `domain_not_verified`: Domain needs verification
  - `invalid_from`: From email doesn't match verified domain
  - `rate_limit_exceeded`: Too many emails sent

### Emails Going to Spam

**Solutions**:
1. **Verify your domain** (don't use test domain)
2. **Add SPF, DKIM records** (Resend provides these)
3. **Use a professional from address** (e.g., noreply@yahala.co)
4. **Warm up your domain** (start with small volumes)
5. **Ask recipients to whitelist** your email address

---

## 📊 Email Notifications Triggers

The system automatically sends emails when:

| Event | Email Template | Recipients |
|-------|---------------|-----------|
| Employee submits request | `requestSubmitted` | Employee |
| Employee submits request | `approvalNeeded` | Manager/Admin |
| Admin approves request | `requestApproved` | Employee |
| Admin rejects request | `requestRejected` | Employee |
| Admin resets password | `passwordReset` | Employee |

---

## 💰 Pricing

### Resend Pricing Tiers

**Free Tier**
- ✅ 100 emails/day
- ✅ 3,000 emails/month
- ✅ Perfect for small teams
- ✅ All features included

**Paid Plans** (Starting at $20/month)
- ✅ 50,000 emails/month
- ✅ Higher daily limits
- ✅ Priority support
- ✅ Custom domains

For Ya Hala Group with ~50 employees:
- Estimated: 10-50 emails/day
- **Free tier is sufficient** for most use cases

---

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** (already configured)
3. **Rotate keys periodically** (every 3-6 months)
4. **Monitor usage** in Resend dashboard
5. **Set up alerts** for suspicious activity

---

## 📚 Additional Resources

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **Resend Node.js SDK**: [resend.com/docs/send-with-nodejs](https://resend.com/docs/send-with-nodejs)
- **DNS Setup Guide**: [resend.com/docs/dashboard/domains/introduction](https://resend.com/docs/dashboard/domains/introduction)
- **Email Best Practices**: [resend.com/blog/email-best-practices](https://resend.com/blog)

---

## ✨ Testing Checklist

Before going live, verify:

- [ ] RESEND_API_KEY is set
- [ ] Domain is verified (or using test domain)
- [ ] Test email sends successfully
- [ ] Email arrives in inbox (not spam)
- [ ] All 5 templates work in both languages
- [ ] Arabic emails display correctly (RTL)
- [ ] Email links work properly
- [ ] Unsubscribe link works (if added)

---

## 🎉 Success!

Once setup is complete, your email system will:

✅ Automatically notify employees when requests are submitted  
✅ Alert managers when approvals are needed  
✅ Confirm approvals/rejections to employees  
✅ Send password reset emails  
✅ Support both English and Arabic  
✅ Include beautiful, professional HTML templates  
✅ Track all email activity in logs  

---

## 🆘 Need Help?

If you encounter issues:

1. Check the **Email Tester** in Admin Settings
2. Review console logs for error messages
3. Verify Resend dashboard for delivery status
4. Check the troubleshooting section above
5. Review Resend documentation

---

**Last Updated**: November 6, 2025  
**Version**: 1.0.0  
**System**: Ya Hala Group E-Portal
