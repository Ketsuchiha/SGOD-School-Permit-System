import { useMemo, useState } from 'react';
import { School } from '../data/mockData';
import { useSchools } from '../contexts/SchoolContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuditLog } from '../contexts/AuditLogContext';
import { MetricCard } from './MetricCard';
import { SchoolCards } from './SchoolCards';
import { MapWidget } from './MapWidget';
import { SplitViewEditor } from './SplitViewEditor';
import { CreateSchoolForm } from './CreateSchoolForm';
import { ActionBar } from './ActionBar';
import { Sidebar } from './Sidebar';
import { Building2, Baby, BookOpen, GraduationCap, School as SchoolIcon, Search, Newspaper } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function DashboardView() {
  const { schools, setSchools, activeSchools } = useSchools();
  const { addNotification } = useNotifications();
  const { logs, addLog } = useAuditLog();
  const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000';
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [reportSchoolYear, setReportSchoolYear] = useState('');
  const [reportStatus, setReportStatus] = useState<'all' | 'operational' | 'renewal' | 'not-operational'>('all');
  const [reportPermitLevel, setReportPermitLevel] = useState<'all' | 'kindergarten' | 'elementary' | 'highSchool' | 'seniorHighSchool'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [schoolSearchInput, setSchoolSearchInput] = useState('');

  const schoolHasPermitLevel = (school: School, level: keyof School['permitLevels']) => {
    const permitHistory = school.governmentPermits || [];
    if (permitHistory.length > 0) {
      return permitHistory.some((permit) => Boolean(permit?.permitLevels?.[level]));
    }
    return Boolean(school.permitLevels?.[level]);
  };

  const totalSchools = activeSchools.length;
  const kindergartenPermits = activeSchools.filter((school: School) => schoolHasPermitLevel(school, 'kindergarten')).length;
  const elementaryPermits = activeSchools.filter((school: School) => schoolHasPermitLevel(school, 'elementary')).length;
  const highSchoolPermits = activeSchools.filter((school: School) => schoolHasPermitLevel(school, 'highSchool')).length;
  const seniorHighSchoolPermits = activeSchools.filter((school: School) => schoolHasPermitLevel(school, 'seniorHighSchool')).length;

  const availableSchoolYears = useMemo(() => {
    const years = new Set<string>();

    activeSchools.forEach((school: School) => {
      if (school.schoolYear) {
        years.add(school.schoolYear);
      }

      (school.governmentPermits ?? []).forEach((permit) => {
        if (permit.schoolYear) {
          years.add(permit.schoolYear);
        }
      });
    });

    return Array.from(years).sort();
  }, [activeSchools]);

  const filteredSchools = useMemo(() => {
    const q = schoolSearchInput.trim().toLowerCase();
    if (!q) {
      return activeSchools;
    }

    return activeSchools.filter((school: School) => {
      const permitNumbers = (school.governmentPermits || []).map((permit) => (permit.permitNumber || '').toLowerCase());
      return (
        school.name.toLowerCase().includes(q)
        || (school.address || '').toLowerCase().includes(q)
        || (school.permitNumber || '').toLowerCase().includes(q)
        || permitNumbers.some((permitNo) => permitNo.includes(q))
      );
    });
  }, [activeSchools, schoolSearchInput]);

  const recentSchoolNews = useMemo(() => {
    return logs
      .filter((log) => log.action === 'create' || log.action === 'permit_upload')
      .slice(0, 6);
  }, [logs]);

  const formatTimeAgo = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const handleUpdateSchool = (updatedSchool: School) => {
    setSchools((prevSchools) =>
      prevSchools.map((s: School) => (s.id === updatedSchool.id ? updatedSchool : s))
    );
    setSelectedSchool(updatedSchool);
    addNotification('School Updated', `${updatedSchool.name} was updated successfully.`);
    addLog('update', `School "${updatedSchool.name}" updated.`);
  };

  const handleDeleteSchool = (id: string) => {
    setSchools((prevSchools) =>
      prevSchools.map((school) =>
                  school.id === id ? { ...school, deletedAt: new Date() } : school
      )
      );
      addNotification('School Moved to Trash', `The school has been moved to the trash.`);
      addLog('delete', `School "${schools.find(s => s.id === id)?.name}" moved to trash.`);
      setShowEditor(false);
  };

  const handleAddSchool = (newSchool: School) => {
    setSchools((prevSchools) => [...prevSchools, newSchool]);
    addNotification('School Created', `${newSchool.name} was created successfully.`);
    addLog('create', `School "${newSchool.name}" created.`);
    setShowCreateForm(false);
  };


  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setShowEditor(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    addNotification('Preparing Export', 'Generating Excel report...');
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/reports/permits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolYear: reportSchoolYear || null,
          status: reportStatus,
          permitLevel: reportPermitLevel,
          schools: activeSchools,
        }),
      });

      if (!response.ok) {
        addNotification('Export Failed', 'Unable to generate Excel report.');
        setIsExporting(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const levelSuffix = reportPermitLevel === 'all' ? 'all-levels' : reportPermitLevel;
      link.download = reportSchoolYear
        ? `school-permit-report-${reportSchoolYear}-${levelSuffix}.xlsx`
        : `school-permit-report-all-years-${levelSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      addNotification('Export Complete', `Excel report downloaded successfully with selected filters.`);
    } catch (error) {
      addNotification('Export Error', 'Failed to download Excel report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 pb-24 ml-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">

            <div>
              <h1 className="text-3xl font-bold text-white">SDO Cabuyao: School Permit Registry</h1>
              <p className="text-slate-400">Schools Division Office - Cabuyao City, Laguna</p>
            </div>
          </div>
        </div>

        {/* Status Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Total Schools"
            value={totalSchools}
            icon={Building2}
            trend={[45, 52, 48, 58, 62, 70, 75, 72, 78]}
            color="#0C4DA2"
            animationIndex={0}
          />
          <MetricCard
            title="Kindergarten Permits"
            value={kindergartenPermits}
            icon={Baby}
            trend={[35, 38, 40, 42, 45, 48, 50, 52, 54]}
            color="#10b981"
            animationIndex={1}
          />
          <MetricCard
            title="Elementary Permits"
            value={elementaryPermits}
            icon={BookOpen}
            trend={[40, 42, 44, 46, 48, 50, 52, 54, 56]}
            color="#f59e0b"
            animationIndex={2}
          />
          <MetricCard
            title="High School Permits"
            value={highSchoolPermits}
            icon={GraduationCap}
            trend={[20, 22, 24, 26, 28, 30, 32, 34, 36]}
            color="#8b5cf6"
            animationIndex={3}
          />
          <MetricCard
            title="Senior High School"
            value={seniorHighSchoolPermits}
            icon={SchoolIcon}
            trend={[15, 17, 19, 21, 23, 25, 27, 29, 31]}
            color="#ec4899"
            animationIndex={4}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="reportSchoolYear" className="text-xs text-slate-400 mb-2 block">Report School Year</label>
            <Select
              value={reportSchoolYear || 'all-years'}
              onValueChange={(value) => setReportSchoolYear(value === 'all-years' ? '' : value)}
            >
              <SelectTrigger id="reportSchoolYear" aria-label="Report School Year" className="w-full">
                <SelectValue placeholder="All School Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-years">All School Years</SelectItem>
                {availableSchoolYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="reportStatus" className="text-xs text-slate-400 mb-2 block">Report Status</label>
            <Select value={reportStatus} onValueChange={(value) => setReportStatus(value as typeof reportStatus)}>
              <SelectTrigger id="reportStatus" aria-label="Report Status" className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="renewal">For Renewal</SelectItem>
                <SelectItem value="not-operational">Not Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="reportPermitLevel" className="text-xs text-slate-400 mb-2 block">Permit Level</label>
            <Select value={reportPermitLevel} onValueChange={(value) => setReportPermitLevel(value as typeof reportPermitLevel)}>
              <SelectTrigger id="reportPermitLevel" aria-label="Report Permit Level" className="w-full">
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
          </div>
          <div className="flex items-end">
            <div className="text-xs text-slate-400">
              Export uses the selected filters to generate a formatted Excel report.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* School Cards Sidebar - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Schools</h3>
                <p className="text-sm text-slate-400">Click to view & edit permits</p>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="text"
                  value={schoolSearchInput}
                  onChange={(e) => setSchoolSearchInput(e.target.value)}
                  placeholder="Search school or permit"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                />
                <button
                  type="button"
                  onClick={() => setSchoolSearchInput((prev) => prev.trim())}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0C4DA2]/25 hover:bg-[#0C4DA2]/35 border border-[#0C4DA2]/40 text-blue-200 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
              <div className="mb-3 text-xs text-slate-300">
                Showing {filteredSchools.length} of {activeSchools.length} schools
              </div>
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <SchoolCards
                  schools={filteredSchools}
                  onSelectSchool={handleSelectSchool}
                  selectedSchoolId={selectedSchool?.id}
                />
              </div>
            </div>
          </div>

          {/* Map Widget - Takes 2 columns */}
          <div className="lg:col-span-2">
            <MapWidget
              schools={activeSchools}
              selectedSchool={selectedSchool || undefined}
              onSelectSchool={handleSelectSchool}
            />
            <div className="mt-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="w-4 h-4 text-sky-300" />
                <h4 className="text-sm font-semibold text-white">Latest School News</h4>
              </div>
              {recentSchoolNews.length === 0 ? (
                <div className="text-sm text-slate-400">No recent school additions or permit uploads yet.</div>
              ) : (
                <div className="space-y-2">
                  {recentSchoolNews.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      <div className="text-sm text-slate-200">{item.details}</div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">{formatTimeAgo(item.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Split View Editor */}
        {showEditor && selectedSchool && (
          <SplitViewEditor
            school={selectedSchool}
            onClose={() => setShowEditor(false)}
            onSave={handleUpdateSchool}
            onDelete={handleDeleteSchool}
          />
        )}

        {/* Create School Form */}
        {showCreateForm && (
          <CreateSchoolForm
            onClose={() => setShowCreateForm(false)}
            onSave={handleAddSchool}
          />
        )}

        {/* Floating Action Bar */}
        <ActionBar 
          onExport={handleExport}
          onCreateSchool={() => setShowCreateForm(true)}
          isExporting={isExporting}
        />
      </div>
    </div>
  );
}
