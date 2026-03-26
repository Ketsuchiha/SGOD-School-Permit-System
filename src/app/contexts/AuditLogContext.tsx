
import React, { createContext, useState, useContext, useCallback } from 'react';

export type AuditLogAction = 'create' | 'update' | 'delete' | 'restore' | 'permanent_delete' | 'permit_upload';

export interface AuditLogEntry {
  id: number;
  timestamp: Date;
  action: AuditLogAction;
  details: string;
}

interface AuditLogContextType {
  logs: AuditLogEntry[];
  addLog: (action: AuditLogAction, details: string) => void;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(undefined);

export function AuditLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const addLog = useCallback((action: AuditLogAction, details: string) => {
    const newLogEntry = {
      id: Date.now(),
      timestamp: new Date(),
      action,
      details,
    };
    setLogs((prev) => [newLogEntry, ...prev]);
  }, []);

  return (
    <AuditLogContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditLogContext.Provider>
  );
}

export function useAuditLog() {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLog must be used within an AuditLogProvider');
  }
  return context;
}
