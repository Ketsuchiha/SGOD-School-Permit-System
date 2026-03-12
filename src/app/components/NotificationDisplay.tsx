
import { useEffect } from 'react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { showNotification } from '../notifications/notificationManager';
import { X } from 'lucide-react';

export function NotificationDisplay() {
  const { notifications, removeNotification } = useNotifications();

  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[notifications.length - 1];
      showNotification(latestNotification.title, { body: latestNotification.message });
    }
  }, [notifications]);

  return (
    <div className="fixed top-8 right-8 z-50 space-y-4">
      {notifications.map((notification: Notification) => (
        <div
          key={notification.id}
          className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-4 max-w-sm w-full animate-fade-in-right"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{notification.title}</h3>
              <p className="text-slate-300 text-sm">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
