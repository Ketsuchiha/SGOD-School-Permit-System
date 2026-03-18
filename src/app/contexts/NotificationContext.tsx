
import React, { createContext, useState, useContext, useCallback } from 'react';
import { useNotificationSettings } from './NotificationSettingsContext';
import { showNotification, areNotificationsSupported } from '../notifications/notificationManager';

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
    
    // Show system notification if supported
    if (areNotificationsSupported()) {
      showNotification(title, { body: message });
    }
    
    // Also add to UI notifications
    const newNotification = {
      id: Date.now(),
      title,
      message,
    };
    setNotifications((prev) => [...prev, newNotification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
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
