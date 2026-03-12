
import { useState, useEffect } from 'react';
import { areNotificationsSupported, requestNotificationPermission } from '../notifications/notificationManager';
import { Bell, BellOff } from 'lucide-react';

export function NotificationPermissionRequester() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (areNotificationsSupported()) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
  };

  if (!supported || permission === 'granted') {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 max-w-sm w-full z-50">
      <div className="flex items-start gap-4">
        <div className="bg-blue-500/20 p-3 rounded-full">
          {permission === 'denied' ? <BellOff className="w-6 h-6 text-blue-300" /> : <Bell className="w-6 h-6 text-blue-300" />}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">Enable Notifications</h3>
          {permission === 'denied' ? (
            <p className="text-slate-300 text-sm">
              You have blocked notifications. To enable them, please update your browser settings.
            </p>
          ) : (
            <p className="text-slate-300 text-sm">
              Stay updated with the latest information by enabling browser notifications.
            </p>
          )}
        </div>
      </div>
      {permission !== 'denied' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleRequestPermission}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Enable
          </button>
        </div>
      )}
    </div>
  );
}
