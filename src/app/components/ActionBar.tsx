import { FileSpreadsheet, Plus, Loader2 } from 'lucide-react';
import { BackupRestoreModal } from './BackupRestoreModal';

interface ActionBarProps {
  onExport: () => void;
  onCreateSchool: () => void;
  isExporting?: boolean;
}

export function ActionBar({ onExport, onCreateSchool, isExporting = false }: ActionBarProps) {
  return (
    <div className="fixed bottom-8 right-8 flex items-center gap-4 z-30">
      {/* Backup Button */}
      <BackupRestoreModal />

      {/* Export Button */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="group relative bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-5 h-5" />
            Export Excel
          </>
        )}
        
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {isExporting ? 'Generating report...' : 'Download registry as Excel'}
        </div>
      </button>

      {/* Create School Button */}
      <button
        onClick={onCreateSchool}
        className="group relative bg-gradient-to-r from-[#0C4DA2] to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/40 transition-all hover:-translate-y-1 flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create School
        
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0C4DA2] to-blue-600 blur-xl opacity-50 -z-10" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Register new school with permit upload
        </div>
      </button>
    </div>
  );
}