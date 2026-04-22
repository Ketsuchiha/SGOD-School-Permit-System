import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';

interface BackupInfo {
  timestamp?: string;
  school_count: number;
  file_count: number;
}

interface RestoreResult {
  ok: boolean;
  schools_restored: number;
  files_restored: number;
  files_skipped: number;
  timestamp?: string;
}

export function BackupRestoreModal() {
  const apiBaseUrl = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadBackup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/backup`);
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sgod-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Backup downloaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetBackupInfo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setBackupInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBaseUrl}/api/backup/info`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to read backup file');
      }

      const info = await response.json();
      setBackupInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read backup info');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestoreBackup = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a backup file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRestoreResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBaseUrl}/api/backup/restore`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }

      const result = await response.json();
      setRestoreResult(result);
      setSuccess('Backup restored successfully! Please refresh the page to see changes.');
      
      // Refresh after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="group relative bg-white/10 backdrop-blur-xl border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-all shadow-lg flex items-center gap-2">
          <Download className="w-4 h-4" />
          Backup
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Backup & restore your data
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Backup & Restore</DialogTitle>
          <DialogDescription>
            Create and manage backups of all schools and permit files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Backup */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Download Backup</h3>
            <p className="text-sm text-slate-500 mb-3">
              Create a backup containing all schools and permit files
            </p>
            <Button
              onClick={handleDownloadBackup}
              disabled={isLoading}
              className="w-full"
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Backup
                </>
              )}
            </Button>
          </div>

          <div className="border-t" />

          {/* Restore from Backup */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Restore from Backup</h3>
            <p className="text-sm text-slate-500 mb-3">
              Upload a previously downloaded backup file
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleGetBackupInfo}
              className="hidden"
              title="Select backup file"
            />

            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </Button>
              <Button
                onClick={handleRestoreBackup}
                disabled={isLoading || !backupInfo}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Restore
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Backup Info */}
          {backupInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm space-y-1">
                  {backupInfo.timestamp && (
                    <p>
                      <strong>Backup Date:</strong> {new Date(backupInfo.timestamp).toLocaleString()}
                    </p>
                  )}
                  <p>
                    <strong>Schools:</strong> {backupInfo.school_count}
                  </p>
                  <p>
                    <strong>Files:</strong> {backupInfo.file_count}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Restore Result */}
          {restoreResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="text-sm space-y-1 text-green-900">
                  <p>
                    <strong>Schools:</strong> {restoreResult.schools_restored} restored
                  </p>
                  <p>
                    <strong>Files:</strong> {restoreResult.files_restored} restored, {restoreResult.files_skipped} skipped
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900">
                {success}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
