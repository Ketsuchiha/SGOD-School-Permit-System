
import React, { createContext, useState, useContext } from 'react';

interface NotificationSettingsContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(undefined);

export function NotificationSettingsProvider({ children }: { children: React.ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <NotificationSettingsContext.Provider value={{ notificationsEnabled, setNotificationsEnabled }}>
      {children}
    </NotificationSettingsContext.Provider>
  );
}

export function useNotificationSettings() {
  const context = useContext(NotificationSettingsContext);
  if (!context) {
    throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
  }
  return context;
}
