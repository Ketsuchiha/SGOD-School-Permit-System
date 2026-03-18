import { School, getStatusColor, getStatusLabel } from '../data/mockData';
import { X, MapPin, FileText, Building2, BookOpen } from 'lucide-react';
import { PDFViewer } from './PDFViewer';

interface SchoolDetailModalProps {
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

export function SchoolDetailModal({ school, onClose }: SchoolDetailModalProps) {
  const hasPdf = Boolean(school.permitUrl);
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#0C4DA2] to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <Building2 className="w-7 h-7 text-white shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{school.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {school.branchLabel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/50 text-amber-200">
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
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* Left: PDF preview */}
          {hasPdf && (
            <div className="w-[45%] shrink-0 border-r border-white/10 overflow-hidden">
              <PDFViewer
                permitUrl={school.permitUrl}
                permitNumber={school.permitNumber || 'Permit'}
              />
            </div>
          )}

          {/* Right: details */}
          <div className={`${hasPdf ? 'flex-1' : 'w-full'} overflow-y-auto p-6 space-y-5`}>

            {/* Status + school type */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(school.status)}`}>
                {getStatusLabel(school.status)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-slate-300">
                {school.schoolType === 'homeschool' ? 'Home School' : 'Regular School'}
              </span>
            </div>

            {/* Address */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <MapPin className="w-3.5 h-3.5" />
                Address
              </div>
              <div className="text-white text-sm">{school.address || '—'}</div>
            </div>

            {/* Homeschool info */}
            {school.schoolType === 'homeschool' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">Homeschool Info</div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Provider</div>
                  <div className="text-white text-sm">{school.homeschoolProvider || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Year Level</div>
                  <div className="text-white text-sm">{school.homeschoolYearLevel || '—'}</div>
                </div>
              </div>
            )}

            {/* Current permit details */}
            {currentPermit && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5" />
                  Current Permit
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Permit Number</div>
                    <div className="text-white text-sm font-mono">{currentPermit.permitNumber || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">School Year</div>
                    <div className="text-white text-sm">{currentPermit.schoolYear || '—'}</div>
                  </div>
                </div>

                {/* Permitted levels */}
                <div>
                  <div className="text-xs text-slate-400 mb-2">Permitted Levels</div>
                  <div className="flex flex-wrap gap-2">
                    {currentPermit.permitLevels.kindergarten && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">K – Kindergarten</span>
                    )}
                    {currentPermit.permitLevels.elementary && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">E – Elementary</span>
                    )}
                    {currentPermit.permitLevels.highSchool && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">J – Junior HS</span>
                    )}
                    {currentPermit.permitLevels.seniorHighSchool && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs">SHS – Senior HS</span>
                    )}
                    {!currentPermit.permitLevels.kindergarten && !currentPermit.permitLevels.elementary &&
                      !currentPermit.permitLevels.highSchool && !currentPermit.permitLevels.seniorHighSchool && (
                      <span className="text-slate-500 text-xs">None recorded</span>
                    )}
                  </div>
                </div>

                {/* SHS strands */}
                {currentPermit.permitLevels.seniorHighSchool && (currentPermit.shsStrands ?? []).length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2">SHS Strands</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentPermit.shsStrands ?? []).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-[#0C4DA2]/20 border border-[#0C4DA2]/40 text-blue-200 text-xs">
                          {STRAND_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Permit history */}
            {permits.length > 1 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">
                  <BookOpen className="w-3.5 h-3.5" />
                  Permit History ({permits.length})
                </div>
                <div className="space-y-2">
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
                        {permit.permitLevels.kindergarten && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">K</span>}
                        {permit.permitLevels.elementary && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">E</span>}
                        {permit.permitLevels.highSchool && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">JHS</span>}
                        {permit.permitLevels.seniorHighSchool && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">SHS</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-slate-900/95 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
