import React, { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Toaster, toast } from 'sonner@2.0.3';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { registerServiceWorker, setupOnlineOfflineListeners } from '../utils/pwa';

/**
 * Root layout rendered for every route.
 * Houses the Toaster, PWA install prompt, and dynamic meta tags.
 */
export function RootLayout() {
  // Initialize PWA features
  useEffect(() => {
    registerServiceWorker();

    setupOnlineOfflineListeners(
      () => toast.success('You are back online!', { duration: 3000 }),
      () => toast.error('You are offline. Some features may be limited.', { duration: 5000 }),
    );

    // Add PWA meta tags dynamically
    const ensure = (selector: string, tag: string, attrs: Record<string, string>) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      return el;
    };

    const viewport = ensure('meta[name="viewport"]', 'meta', { name: 'viewport' });
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');

    const themeColor = ensure('meta[name="theme-color"]', 'meta', { name: 'theme-color' });
    themeColor.setAttribute('content', '#7AC143');

    ensure('meta[name="apple-mobile-web-app-capable"]', 'meta', { name: 'apple-mobile-web-app-capable' }).setAttribute('content', 'yes');
    ensure('meta[name="mobile-web-app-capable"]', 'meta', { name: 'mobile-web-app-capable' }).setAttribute('content', 'yes');
    ensure('meta[name="apple-mobile-web-app-status-bar-style"]', 'meta', { name: 'apple-mobile-web-app-status-bar-style' }).setAttribute('content', 'black-translucent');
    ensure('link[rel="manifest"]', 'link', { rel: 'manifest' }).setAttribute('href', '/manifest.json');
  }, []);

  return (
    <div className="app">
      <Outlet />
      <Toaster position="top-center" richColors />
      <PWAInstallPrompt />
    </div>
  );
}
