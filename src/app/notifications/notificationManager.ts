
// This file will manage browser notification logic.

/**
 * Checks if the Notification API is available in the browser.
 * @returns {boolean} True if notifications are supported, false otherwise.
 */
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Requests permission from the user to show notifications.
 * @returns {Promise<NotificationPermission>} A promise that resolves with the permission status.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    console.warn('Notifications are not supported in this browser.');
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Shows a notification to the user.
 * @param {string} title The title of the notification.
 * @param {NotificationOptions} options The options for the notification.
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!areNotificationsSupported()) {
    console.warn('Notification API not supported.');
    return;
  }

  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  } else if (Notification.permission !== 'denied') {
    requestNotificationPermission().then(permission => {
      if (permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      }
    });
  }
}
