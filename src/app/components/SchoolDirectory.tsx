import { useState } from 'react';
import { School, getStatusColor, getStatusLabel } from '../data/mockData';
import { Search, Grid, List, Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSchools } from '../contexts/SchoolContext';
import { SchoolDetailsView } from './SchoolDetailsView';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type PermitLevelFilter = 'all' | 'kindergarten' | 'elementary' | 'highSchool' | 'seniorHighSchool';
type PermitEntry = {
  permitNumber: string;
  schoolYear: string;
  permitLevels: {
    kindergarten: boolean;
    elementary: boolean;
    highSchool: boolean;
    seniorHighSchool: boolean;
  };
};

const inferPermitLevelFromNumber = (permitNumber?: string): Partial<Record<PermitLevelFilter, boolean>> => {
  const raw = (permitNumber || '').trim().toUpperCase();
  if (!raw) {
    return {};
  }

  // Use the leading alphabetic code in permit numbers (e.g., K-123, E-456, S-789, SHS-001).
  const sanitized = raw.replace(/\s+/g, '');
  const match = sanitized.match(/^([A-Z]+)/);
  const code = match?.[1] || '';

  if (code.startsWith('SHS')) {
    return { seniorHighSchool: true };
  }
  if (code.startsWith('K')) {
    return { kindergarten: true };
  }
  if (code.startsWith('E')) {
    return { elementary: true };
  }
  if (code.startsWith('S') || sanitized.includes('JHS')) {
    return { highSchool: true };
  }

  return {};
};

const getPermitEntries = (school: School): PermitEntry[] => {
  const history = (school.governmentPermits ?? []).map((permit) => ({
    permitNumber: (permit.permitNumber || '').trim(),
    schoolYear: (permit.schoolYear || '').trim(),
    permitLevels: {
      kindergarten: Boolean(permit.permitLevels?.kindergarten),
      elementary: Boolean(permit.permitLevels?.elementary),
      highSchool: Boolean(permit.permitLevels?.highSchool),
      seniorHighSchool: Boolean(permit.permitLevels?.seniorHighSchool),
    },
  }));

  const fallback: PermitEntry = {
    permitNumber: (school.permitNumber || '').trim(),
    schoolYear: (school.schoolYear || '').trim(),
    permitLevels: {
      kindergarten: Boolean(school.permitLevels?.kindergarten),
      elementary: Boolean(school.permitLevels?.elementary),
      highSchool: Boolean(school.permitLevels?.highSchool),
      seniorHighSchool: Boolean(school.permitLevels?.seniorHighSchool),
    },
  };

  const hasFallbackData = Boolean(
    fallback.permitNumber
    || fallback.schoolYear
    || fallback.permitLevels.kindergarten
    || fallback.permitLevels.elementary
    || fallback.permitLevels.highSchool
    || fallback.permitLevels.seniorHighSchool
  );

  const dedupeKey = (entry: PermitEntry) => `${entry.permitNumber.toLowerCase()}::${entry.schoolYear}`;
  const keys = new Set(history.map(dedupeKey));

  if (hasFallbackData && !keys.has(dedupeKey(fallback))) {
    history.push(fallback);
  }

  return history;
};

const permitMatchesLevel = (permit: PermitEntry, level: PermitLevelFilter) => {
  if (level === 'all') {
    return true;
  }

  const inferred = inferPermitLevelFromNumber(permit.permitNumber);
  return Boolean(permit.permitLevels[level]) || Boolean(inferred[level]);
};

const schoolHasPermitLevel = (school: School, level: PermitLevelFilter) => {
  return getPermitEntries(school).some((permit) => permitMatchesLevel(permit, level));
};

const schoolMatchesYear = (school: School, year: string) => {
  if (!year) {
    return true;
  }

  return getPermitEntries(school).some((permit) => permit.schoolYear === year);
};

const getDisplayPermit = (school: School, level: PermitLevelFilter, year: string): PermitEntry => {
  const permits = getPermitEntries(school);

  const exact = permits.find((permit) => {
    const levelMatch = permitMatchesLevel(permit, level);
    const yearMatch = !year || permit.schoolYear === year;
    return levelMatch && yearMatch;
  });

  if (exact) {
    return exact;
  }

  const levelOnly = permits.find((permit) => permitMatchesLevel(permit, level));
  if (levelOnly) {
    return levelOnly;
  }

  return permits[0] ?? {
    permitNumber: school.permitNumber || '',
    schoolYear: school.schoolYear || '',
    permitLevels: {
      kindergarten: false,
      elementary: false,
      highSchool: false,
      seniorHighSchool: false,
    },
  };
};

const getPermitLevelLabel = (level: PermitLevelFilter) => {
  switch (level) {
    case 'kindergarten':
      return 'Kindergarten';
    case 'elementary':
      return 'Elementary';
    case 'highSchool':
      return 'Junior High';
    case 'seniorHighSchool':
      return 'Senior High';
    default:
      return 'Permit';
  }
};

const getPermitLevelBadgeClass = (level: PermitLevelFilter) => {
  switch (level) {
    case 'kindergarten':
      return 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200';
    case 'elementary':
      return 'bg-amber-500/15 border-amber-400/40 text-amber-200';
    case 'highSchool':
      return 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200';
    case 'seniorHighSchool':
      return 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-200';
    default:
      return 'bg-slate-500/15 border-slate-400/40 text-slate-200';
  }
};

export function SchoolDirectory() {
  const navigate = useNavigate();
  const { activeSchools } = useSchools();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolYearFilter, setSchoolYearFilter] = useState('');
  const [permitLevelFilter, setPermitLevelFilter] = useState<PermitLevelFilter>('all');

  const availableSchoolYears = Array.from(
    new Set(
      activeSchools.flatMap((school: School) => {
        const years = [school.schoolYear].filter(Boolean) as string[];
        (school.governmentPermits || []).forEach((permit) => {
          if (permit.schoolYear) {
            years.push(permit.schoolYear);
          }
        });
        return years;
      })
    )
  ).sort();

  const filteredSchools = activeSchools.filter((school: School) =>
    (
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.permitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school.governmentPermits || []).some((permit) =>
        (permit.permitNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    && schoolMatchesYear(school, schoolYearFilter)
    && schoolHasPermitLevel(school, permitLevelFilter)
  );

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
        <h1 className="text-3xl font-bold text-white mb-2">School Directory</h1>
        <p className="text-slate-400">Browse and search all registered schools</p>
      </div>

      {/* Controls */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
          />
        </div>

        <Select
          value={schoolYearFilter || 'all-years'}
          onValueChange={(value) => setSchoolYearFilter(value === 'all-years' ? '' : value)}
        >
          <SelectTrigger aria-label="School Year Filter" className="w-full">
            <SelectValue placeholder="All School Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-years">All School Years</SelectItem>
            {availableSchoolYears.map((year) => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={permitLevelFilter}
          onValueChange={(value) => setPermitLevelFilter(value as PermitLevelFilter)}
        >
          <SelectTrigger aria-label="Permit Level Filter" className="w-full">
            <SelectValue placeholder="All Permit Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Permit Levels</SelectItem>
            <SelectItem value="kindergarten">Kindergarten</SelectItem>
            <SelectItem value="elementary">Elementary</SelectItem>
            <SelectItem value="highSchool">Junior High School</SelectItem>
            <SelectItem value="seniorHighSchool">Senior High School</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-1">
          <button
            type="button"
            aria-label="Grid View"
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-[#0C4DA2] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="List View"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#0C4DA2] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-slate-400 text-sm">
        Showing {filteredSchools.length} of {activeSchools.length} schools
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => {
            const displayPermit = getDisplayPermit(school, permitLevelFilter, schoolYearFilter);
            const showMatchBadge = permitLevelFilter !== 'all';
            const matchLabel = getPermitLevelLabel(permitLevelFilter);
            const matchBadgeClass = getPermitLevelBadgeClass(permitLevelFilter);

            return (
              <div
                key={school.id}
                onClick={() => setSelectedSchool(school)}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-[#0C4DA2]/20 to-blue-600/20 p-6 border-b border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#0C4DA2]" />
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(school.status)}`}>
                      {getStatusLabel(school.status)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{school.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-slate-400 font-mono">{displayPermit.permitNumber || school.permitNumber || '—'}</p>
                    {showMatchBadge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${matchBadgeClass}`}>
                        Matched by: {matchLabel} permit
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Address</label>
                    <div className="text-white text-sm line-clamp-2">{school.address || 'No address recorded'}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div>
                      <label className="text-xs text-slate-400">School Year</label>
                      <div className="text-white font-medium">{displayPermit.schoolYear || school.schoolYear || 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <label className="text-xs text-slate-400">Expiry</label>
                      <div className="text-white text-sm">{school.expiryDate ? new Date(school.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">School</th>
                <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">Permit Number</th>
                <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">Address</th>
                <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">School Year</th>
                <th className="text-left text-xs font-medium text-slate-400 px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((school) => {
                const displayPermit = getDisplayPermit(school, permitLevelFilter, schoolYearFilter);
                const showMatchBadge = permitLevelFilter !== 'all';
                const matchLabel = getPermitLevelLabel(permitLevelFilter);
                const matchBadgeClass = getPermitLevelBadgeClass(permitLevelFilter);

                return (
                  <tr
                    key={school.id}
                    onClick={() => setSelectedSchool(school)}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{school.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-slate-300 text-sm font-mono">{displayPermit.permitNumber || school.permitNumber || '—'}</div>
                        {showMatchBadge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${matchBadgeClass}`}>
                            {matchLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 text-sm">{school.address || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 text-sm">{displayPermit.schoolYear || school.schoolYear || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(school.status)}`}>
                        {getStatusLabel(school.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredSchools.length === 0 && (
        <div className="text-center py-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No schools found matching your search</p>
        </div>
      )}

      {selectedSchool && (
        <SchoolDetailsView
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </div>
  );
}