import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackupRestoreModal } from './BackupRestoreModal';
import { NotificationSettings } from './NotificationSettings';

export function SettingsView() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage system preferences, backup, and restore</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-blue-200" />
            <h2 className="text-xl font-semibold text-white">Data Management</h2>
          </div>
          <p className="text-sm text-slate-400 mb-5">
            Download a full backup of schools and permit files, or restore from a previous backup package.
          </p>
          <div className="inline-flex">
            <BackupRestoreModal />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl">
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
}
