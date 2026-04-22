import { useSchools } from '../contexts/SchoolContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Trash2, RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';


export function TrashBin() {
  const navigate = useNavigate();
  const { setSchools, deletedSchools } = useSchools();
  const { addNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);

  const apiBaseUrl = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000');

  const handleRestore = (id: string) => {
    setSchools((prevSchools) =>
      prevSchools.map((school) =>
        school.id === id ? { ...school, deletedAt: null } : school
      )
    );
    addNotification('School Restored', `The school has been successfully restored.`);
  };

  const openConfirmationModal = (id: string) => {
    setSchoolToDelete(id);
    setIsModalOpen(true);
  };

  const closeConfirmationModal = () => {
    setSchoolToDelete(null);
    setIsModalOpen(false);
  };

  const handlePermanentDelete = async () => {
    if (schoolToDelete) {
      try {
        // Call backend to delete permit files
        const deleteResponse = await fetch(`${apiBaseUrl}/api/schools/${schoolToDelete}/permits`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          console.warn('Failed to delete permit files, proceeding with school deletion');
        }

        // Delete school from local state
        setSchools((prevSchools) => prevSchools.filter((school) => school.id !== schoolToDelete));
        addNotification('School Permanently Deleted', 'The school and its permit files have been permanently deleted.');
      } catch (error) {
        console.error('Error deleting permit files:', error);
        // Still delete the school even if file deletion fails
        setSchools((prevSchools) => prevSchools.filter((school) => school.id !== schoolToDelete));
        addNotification('School Deleted', 'The school has been deleted (some files may remain).', 'warning');
      }
      closeConfirmationModal();
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">Trash Bin</h1>
        <p className="text-slate-400">Deleted school records (auto-purged after 30 days)</p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-amber-300 font-medium">Temporary Storage</div>
          <div className="text-amber-200/70 text-sm">Records in trash will be permanently deleted after 30 days. Restore important records before then.</div>
        </div>
      </div>

      {/* Deleted Schools List */}
      {deletedSchools.length > 0 ? (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-white/5 border-b border-white/10 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">Deleted Records ({deletedSchools.length})</h3>
          </div>

          <div className="divide-y divide-white/10">
            {deletedSchools.map((school) => (
              <div key={school.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-rose-300" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{school.name}</h4>
                        <p className="text-sm text-slate-400 font-mono">{school.permitNumber}</p>
                      </div>
                    </div>

                    <div className="ml-13 space-y-1">
                      <div className="text-xs text-slate-400">
                        Deleted on {school.deletedAt ? new Date(school.deletedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(school.id)}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </button>
                    <button
                      onClick={() => openConfirmationModal(school.id)}
                      className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-12 text-center">
          <Trash2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Trash is Empty</h3>
          <p className="text-slate-400">No deleted school records</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeConfirmationModal}
        onConfirm={handlePermanentDelete}
        title="Confirm Permanent Deletion"
        message="Are you sure you want to permanently delete this record? This action cannot be undone."
      />
    </div>
  );
}
