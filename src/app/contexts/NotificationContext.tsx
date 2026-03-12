
import React, { createContext, useState, useContext, useCallback } from 'react';
import { useNotificationSettings } from './NotificationSettingsContext';

interface Notification {
  id: number;
  title: string;
  message: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (title: string, message: string) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { notificationsEnabled } = useNotificationSettings();

  const addNotification = useCallback((title: string, message: string) => {
    if (!notificationsEnabled) return;
    const newNotification = {
      id: Date.now(),
      title,
      message,
    };
    setNotifications((prev) => [...prev, newNotification]);
  }, [notificationsEnabled]);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
