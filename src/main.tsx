import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { SchoolProvider } from './app/contexts/SchoolContext';
import { NotificationProvider } from './app/contexts/NotificationContext';
import { NotificationSettingsProvider } from './app/contexts/NotificationSettingsContext';
import { AuditLogProvider } from './app/contexts/AuditLogContext';
import "leaflet/dist/leaflet.css";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SchoolProvider>
      <NotificationSettingsProvider>
        <NotificationProvider>
          <AuditLogProvider>
            <App />
          </AuditLogProvider>
        </NotificationProvider>
      </NotificationSettingsProvider>
    </SchoolProvider>
  </StrictMode>
);
