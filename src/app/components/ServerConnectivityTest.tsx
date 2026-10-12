import React, { useState } from 'react';
import { adminFetch } from '../utils/adminApi';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function ServerConnectivityTest() {
  const { t } = useLanguage();
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [isTestingPasswordResets, setIsTestingPasswordResets] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordResetsStatus, setPasswordResetsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [healthMessage, setHealthMessage] = useState('');
  const [passwordResetsMessage, setPasswordResetsMessage] = useState('');

  const testHealthEndpoint = async () => {
    setIsTestingHealth(true);
    setHealthStatus('idle');
    setHealthMessage('');

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-fdcde35a/health`;
      console.log('Testing health endpoint:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      console.log('Health check response status:', response.status);
      const data = await response.json();
      console.log('Health check response data:', data);

      if (data.success && data.status === 'healthy') {
        setHealthStatus('success');
        setHealthMessage(`Server is healthy! Timestamp: ${data.timestamp}`);
      } else {
        setHealthStatus('error');
        setHealthMessage('Server responded but status is not healthy');
      }
    } catch (error) {
      console.error('Health check error:', error);
      setHealthStatus('error');
      setHealthMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTestingHealth(false);
    }
  };

  const testPasswordResetsEndpoint = async () => {
    setIsTestingPasswordResets(true);
    setPasswordResetsStatus('idle');
    setPasswordResetsMessage('');

    try {
      const url = `/admin/password-reset-requests`;
      console.log('Testing password resets endpoint:', url);
      
      const response = await adminFetch(url);

      console.log('Password resets response status:', response.status);
      const data = await response.json();
      console.log('Password resets response data:', data);

      if (data.success) {
        setPasswordResetsStatus('success');
        setPasswordResetsMessage(`Success! Found ${data.requests?.length || 0} password reset requests`);
      } else {
        setPasswordResetsStatus('error');
        setPasswordResetsMessage(data.message || 'Server returned success=false');
      }
    } catch (error) {
      console.error('Password resets test error:', error);
      setPasswordResetsStatus('error');
      setPasswordResetsMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTestingPasswordResets(false);
    }
  };

  const getStatusBadge = (status: 'idle' | 'success' | 'error') => {
    if (status === 'success') {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-4 h-4 mr-1" /> Success</Badge>;
    }
    if (status === 'error') {
      return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" /> Error</Badge>;
    }
    return <Badge variant="outline">Not tested</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {t('Server Connectivity Test', 'اختبار اتصال الخادم')}
        </CardTitle>
        <CardDescription>
          {t(
            'Test server endpoints to diagnose connection issues',
            'اختبار نقاط نهاية الخادم لتشخيص مشاكل الاتصال'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server Info */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
          <div><strong>Project ID:</strong> {projectId}</div>
          <div><strong>Base URL:</strong> https://{projectId}.supabase.co/functions/v1/make-server-fdcde35a</div>
        </div>

        {/* Health Endpoint Test */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">/health endpoint</h4>
              <p className="text-sm text-muted-foreground">Basic server health check</p>
            </div>
            {getStatusBadge(healthStatus)}
          </div>
          <Button 
            onClick={testHealthEndpoint} 
            disabled={isTestingHealth}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isTestingHealth ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('Testing...', 'جاري الاختبار...')}
              </>
            ) : (
              t('Test Health Endpoint', 'اختبار نقطة الصحة')
            )}
          </Button>
          {healthMessage && (
            <div className={`p-2 rounded text-sm ${
              healthStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {healthMessage}
            </div>
          )}
        </div>

        {/* Password Resets Endpoint Test */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">/admin/password-reset-requests endpoint</h4>
              <p className="text-sm text-muted-foreground">Password reset requests API</p>
            </div>
            {getStatusBadge(passwordResetsStatus)}
          </div>
          <Button 
            onClick={testPasswordResetsEndpoint} 
            disabled={isTestingPasswordResets}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isTestingPasswordResets ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('Testing...', 'جاري الاختبار...')}
              </>
            ) : (
              t('Test Password Resets Endpoint', 'اختبار نقطة طلبات كلمة المرور')
            )}
          </Button>
          {passwordResetsMessage && (
            <div className={`p-2 rounded text-sm ${
              passwordResetsStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {passwordResetsMessage}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <strong>{t('Troubleshooting:', 'استكشاف الأخطاء:')}</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>{t('If health check fails, the Supabase Edge Function may not be deployed', 'إذا فشل فحص الصحة، قد لا يتم نشر وظيفة Supabase Edge')}</li>
            <li>{t('Check the browser console for detailed error messages', 'تحقق من وحدة تحكم المتصفح للحصول على رسائل خطأ مفصلة')}</li>
            <li>{t('Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct', 'تحقق من صحة SUPABASE_URL و SUPABASE_ANON_KEY')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}