

import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import { Bell, BellOff } from 'lucide-react';

interface NotificationSettingsProps {
  compact?: boolean;
}

export function NotificationSettings({ compact = false }: NotificationSettingsProps) {
  const { notificationsEnabled, setNotificationsEnabled } = useNotificationSettings();

  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <button
          id="notifications-enabled"
          aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          className={`p-2.5 rounded-xl transition-colors ${notificationsEnabled ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
          {notificationsEnabled ? <Bell className="w-5 h-5 text-white" /> : <BellOff className="w-5 h-5 text-slate-200" />}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
      <div className="flex items-center justify-between">
        <label htmlFor="notifications-enabled" className="text-slate-300">Enable Notifications</label>
        <button
          id="notifications-enabled"
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
          {notificationsEnabled ? <Bell className="w-5 h-5 text-white" /> : <BellOff className="w-5 h-5 text-slate-400" />}
        </button>
      </div>
    </div>
  );
}
