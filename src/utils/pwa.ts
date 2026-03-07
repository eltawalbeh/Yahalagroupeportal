// PWA Service Worker Registration and Utilities

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Service Worker unregistration failed:', error);
      });
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Show browser notification
export function showNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          ...options
        });
      });
    } else {
      new Notification(title, {
        icon: '/icon-192.png',
        ...options
      });
    }
  }
}

// Check if app is installed (running in standalone mode)
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true; // iOS Safari
}

// Get installation instructions based on browser/platform
export function getInstallInstructions(): { platform: string; instructions: string } {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return {
      platform: 'iOS',
      instructions: 'Tap the Share button, then tap "Add to Home Screen"'
    };
  } else if (/android/.test(userAgent)) {
    return {
      platform: 'Android',
      instructions: 'Tap the menu button, then tap "Add to Home screen" or "Install app"'
    };
  } else if (/chrome/.test(userAgent)) {
    return {
      platform: 'Chrome',
      instructions: 'Click the install icon in the address bar or menu'
    };
  } else if (/edge/.test(userAgent)) {
    return {
      platform: 'Edge',
      instructions: 'Click the app icon in the address bar or menu'
    };
  } else {
    return {
      platform: 'Desktop',
      instructions: 'Look for an install button in your browser'
    };
  }
}

// Check for service worker updates
export function checkForUpdates(callback?: () => void) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update().then(() => {
        if (registration.waiting) {
          console.log('New version available! Please refresh.');
          if (callback) callback();
        }
      });
    });
  }
}

// Update service worker
export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    });
  }
}

// Subscribe to push notifications (requires backend setup)
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Note: You'll need to add your VAPID public key here
    // This is just a placeholder
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // Replace with actual key
    });

    console.log('Push subscription successful:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

// Check if device is online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function setupOnlineOfflineListeners(
  onOnline?: () => void,
  onOffline?: () => void
) {
  window.addEventListener('online', () => {
    console.log('App is online');
    if (onOnline) onOnline();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
    if (onOffline) onOffline();
  });
}
