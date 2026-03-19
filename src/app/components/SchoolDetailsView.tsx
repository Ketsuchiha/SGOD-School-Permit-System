import { useState } from 'react';
import { School, getStatusColor, getStatusLabel } from '../data/mockData';
import { X, MapPin, FileText, Building2, BookOpen, AlertCircle } from 'lucide-react';
import { PDFViewer } from './PDFViewer';

interface SchoolDetailsViewProps {
  school: School;
  onClose: () => void;
}

const STRAND_LABELS: Record<string, string> = {
  STEM: 'STEM',
  ABM: 'ABM',
  HUMSS: 'HUMSS',
  GAS: 'GAS',
  'TVL-ICT': 'TVL-ICT',
  'TVL-HE': 'TVL-HE',
  'TVL-IA': 'TVL-IA',
  'ARTS-DESIGN': 'Arts & Design',
  SPORTS: 'Sports',
};

export function SchoolDetailsView({ school, onClose }: SchoolDetailsViewProps) {
  const hasPdf = Boolean(school.permitUrl);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const permits = (() => {
    const normalized = (school.governmentPermits ?? []).map((permit) => ({
      permitNumber: permit.permitNumber || '',
      schoolYear: permit.schoolYear || '',
      issueDate: permit.issueDate || school.issueDate || '',
      permitLevels: {
        kindergarten: Boolean(permit.permitLevels?.kindergarten),
        elementary: Boolean(permit.permitLevels?.elementary),
        highSchool: Boolean(permit.permitLevels?.highSchool),
        seniorHighSchool: Boolean(permit.permitLevels?.seniorHighSchool),
      },
      shsStrands: permit.shsStrands ?? [],
    }));

    const fallbackPermit = {
      permitNumber: school.permitNumber || '',
      schoolYear: school.schoolYear || '',
      issueDate: school.issueDate || '',
      permitLevels: {
        kindergarten: Boolean(school.permitLevels?.kindergarten),
        elementary: Boolean(school.permitLevels?.elementary),
        highSchool: Boolean(school.permitLevels?.highSchool),
        seniorHighSchool: Boolean(school.permitLevels?.seniorHighSchool),
      },
      shsStrands: school.shsStrands ?? [],
    };

    const hasFallbackData = Boolean(
      fallbackPermit.permitNumber ||
      fallbackPermit.schoolYear ||
      fallbackPermit.permitLevels.kindergarten ||
      fallbackPermit.permitLevels.elementary ||
      fallbackPermit.permitLevels.highSchool ||
      fallbackPermit.permitLevels.seniorHighSchool
    );

    const isDuplicateOfExisting = normalized.some((permit) => (
      (permit.permitNumber || '').trim().toLowerCase() === (fallbackPermit.permitNumber || '').trim().toLowerCase()
      && (permit.schoolYear || '').trim() === (fallbackPermit.schoolYear || '').trim()
    ));

    const merged = [...normalized];
    if (hasFallbackData && !isDuplicateOfExisting) {
      merged.push(fallbackPermit);
    }

    const yearStart = (value: string) => {
      const match = value.match(/(20\d{2})/);
      return match ? Number(match[1]) : -1;
    };

    return merged.sort((a, b) => yearStart(b.schoolYear) - yearStart(a.schoolYear));
  })();
  const currentPermit = permits[0] ?? null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <div className="w-full h-full max-w-[99vw] max-h-[99vh] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#0C4DA2] to-blue-600 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-3xl font-bold text-white truncate">{school.name}</h2>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(school.status)}`}>
                  {getStatusLabel(school.status)}
                </span>
                {school.branchLabel && (
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/30 border border-amber-400/50 text-amber-200">
                    {school.branchLabel}
                  </span>
                )}
                <span className="text-sm text-blue-100 font-mono">{school.permitNumber || '—'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-8">
            {/* Left Column: School Info */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  School Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">School Name</label>
                    <div className="text-white font-medium">{school.name}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">School Type</label>
                    <div className="text-white">{school.schoolType === 'homeschool' ? 'Home School' : 'Regular School'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(school.status)}`}>
                      {getStatusLabel(school.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Complete Address</label>
                    <div className="text-white">{school.address || '—'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Barangay</label>
                    <div className="text-white">{school.barangay || '—'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">District</label>
                    <div className="text-white">{school.district || '—'}</div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <label className="text-xs text-slate-400 mb-1 block">Coordinates</label>
                    <div className="text-white font-mono text-sm">{school.lat.toFixed(6)}, {school.lng.toFixed(6)}</div>
                  </div>
                </div>
              </div>

              {/* Homeschool Info */}
              {school.schoolType === 'homeschool' && (
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">Homeschool Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Provider</label>
                      <div className="text-white">{school.homeschoolProvider || '—'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Year Level</label>
                      <div className="text-white">{school.homeschoolYearLevel || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Permits & Document */}
            <div className="space-y-6">
              {/* Current Permit */}
              {currentPermit && (
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Current Permit
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Permit Number</label>
                      <div className="text-white font-mono">{currentPermit.permitNumber || '—'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">School Year</label>
                      <div className="text-white">{currentPermit.schoolYear || '—'}</div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Issue Date</label>
                      <div className="text-white">{currentPermit.issueDate || school.issueDate || '—'}</div>
                    </div>

                    {/* Permitted Levels */}
                    <div className="pt-4 border-t border-white/10">
                      <label className="text-xs text-slate-400 mb-3 block">Permitted Levels</label>
                      <div className="flex flex-wrap gap-2">
                        {currentPermit.permitLevels.kindergarten && (
                          <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">K – Kindergarten</span>
                        )}
                        {currentPermit.permitLevels.elementary && (
                          <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">E – Elementary</span>
                        )}
                        {currentPermit.permitLevels.highSchool && (
                          <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">JHS – Junior HS</span>
                        )}
                        {currentPermit.permitLevels.seniorHighSchool && (
                          <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">SHS – Senior HS</span>
                        )}
                        {!currentPermit.permitLevels.kindergarten && !currentPermit.permitLevels.elementary &&
                          !currentPermit.permitLevels.highSchool && !currentPermit.permitLevels.seniorHighSchool && (
                          <span className="text-slate-500 text-xs">None recorded</span>
                        )}
                      </div>
                    </div>

                    {/* SHS Strands */}
                    {currentPermit.permitLevels.seniorHighSchool && (currentPermit.shsStrands ?? []).length > 0 && (
                      <div className="pt-4 border-t border-white/10">
                        <label className="text-xs text-slate-400 mb-3 block">SHS Strands</label>
                        <div className="flex flex-wrap gap-2">
                          {(currentPermit.shsStrands ?? []).map((strand) => (
                            <span key={strand} className="px-3 py-1 rounded-lg bg-[#0C4DA2]/20 border border-[#0C4DA2]/40 text-blue-200 text-xs">
                              {STRAND_LABELS[strand] ?? strand}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Permit Document */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Permit Document
                </h3>
                {hasPdf ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">Open the permit file when needed.</p>
                    <button
                      type="button"
                      onClick={() => setShowPdfViewer(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Permit PDF
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-slate-300">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm">No Permit Document</p>
                      <p className="text-xs text-slate-500">PDF file not currently available for this school</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Permit History */}
              {permits.length > 1 && (
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Permit History ({permits.length})
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {permits.map((permit, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${idx === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'}`}
                      >
                        <div>
                          <div className="text-white text-sm font-mono">{permit.permitNumber || '(no number)'}</div>
                          <div className="text-xs text-slate-400">{permit.schoolYear}</div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1">
                          {permit.permitLevels.kindergarten && <span className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">K</span>}
                          {permit.permitLevels.elementary && <span className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">E</span>}
                          {permit.permitLevels.highSchool && <span className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">JHS</span>}
                          {permit.permitLevels.seniorHighSchool && <span className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">SHS</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 py-4 border-t border-white/10 bg-slate-900/95 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {showPdfViewer && hasPdf && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[88vh] bg-slate-900/95 border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-white text-lg font-semibold truncate">Permit PDF Viewer</h3>
                <p className="text-xs text-slate-400 truncate">{currentPermit?.permitNumber || school.permitNumber || 'Permit Document'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfViewer(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close Permit PDF Viewer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-slate-950/50">
              <PDFViewer
                permitUrl={school.permitUrl}
                permitNumber={currentPermit?.permitNumber || school.permitNumber || 'Permit'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
