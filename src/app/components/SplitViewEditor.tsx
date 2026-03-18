import { School, SchoolStatus, SHSStrand, OCRPermitResult, GovernmentPermit, OCRDiagnostics } from '../data/mockData';
import { X, Save, Upload, MapPin, Building2, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import React from 'react';
import { PDFViewer } from './PDFViewer';
import { fileToDataUrl } from '../utils/fileDataUrl';
import { LocationPickerModal } from './LocationPickerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useNotifications } from '../contexts/NotificationContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SplitViewEditorProps {
  school: School | null;
  onClose: () => void;
  onSave: (school: School) => void;
  onDelete: (id: string) => void;
  isNewSchool?: boolean;
}

export function SplitViewEditor({ school, onClose, onSave, onDelete, isNewSchool = false }: SplitViewEditorProps) {
  const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000';
  const { addNotification } = useNotifications();
  const fallbackLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGBgAAAABQABDQottAAAAABJRU5ErkJggg==';
  const [logoSrc, setLogoSrc] = useState<string>(import.meta.env?.VITE_DEPED_LOGO_URL ?? '/Deped_Logo.png');
  const [editedSchool, setEditedSchool] = useState<School>(
    school || {
      id: Date.now().toString(),
      name: '',
      permitNumber: '',
      status: 'operational',
      logicType: 'manual',
      schoolType: 'regular',
      district: '',
      barangay: '',
      address: '',
      issueDate: new Date().toISOString().split('T')[0],
      schoolYear: '2024-2025',
      permitLevels: {
        kindergarten: false,
        elementary: false,
        highSchool: false,
        seniorHighSchool: false,
      },
      shsStrands: [],
      lat: 14.2722,
      lng: 121.1239,
    }
  );

  const [manualOverride, setManualOverride] = useState(editedSchool.logicType === 'manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ocrEngine, setOcrEngine] = useState<string>('none');
  const [ocrDiagnostics, setOcrDiagnostics] = useState<OCRDiagnostics | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Existing records should keep their saved coordinates unless user requests geocode.
  const [manualCoordinates, setManualCoordinates] = useState(Boolean(school));
  const [activePermitIndex, setActivePermitIndex] = useState(0);

  const hasAnyPermitLevel = (levels?: GovernmentPermit['permitLevels']) => {
    if (!levels) return false;
    return levels.kindergarten || levels.elementary || levels.highSchool || levels.seniorHighSchool;
  };

  const inferSchoolYearFromPermitNumber = (permitNumber?: string) => {
    if (!permitNumber) return '';
    const match = permitNumber.match(/\b(20\d{2})\b/);
    if (!match) return '';
    const start = Number(match[1]);
    return `${start}-${start + 1}`;
  };

  const createPermitFromSchool = (source: School): GovernmentPermit => ({
    permitNumber: source.permitNumber || '',
    schoolYear: source.schoolYear || inferSchoolYearFromPermitNumber(source.permitNumber),
    issueDate: source.issueDate,
    permitLevels: source.permitLevels || { kindergarten: false, elementary: false, highSchool: false, seniorHighSchool: false },
    shsStrands: source.shsStrands || [],
  });

  const getPermitList = (source: School): GovernmentPermit[] => {
    if (source.governmentPermits && source.governmentPermits.length > 0) {
      return source.governmentPermits;
    }
    return [createPermitFromSchool(source)];
  };

  const syncPrimaryPermit = (source: School, permits: GovernmentPermit[]): School => {
    const primaryPermit = permits[0] || createPermitFromSchool(source);
    return {
      ...source,
      governmentPermits: permits,
      permitNumber: primaryPermit.permitNumber || source.permitNumber,
      schoolYear: primaryPermit.schoolYear || source.schoolYear,
      issueDate: primaryPermit.issueDate || source.issueDate,
      permitLevels: primaryPermit.permitLevels || source.permitLevels,
      shsStrands: primaryPermit.shsStrands || source.shsStrands,
    };
  };

  const updatePermitAt = (index: number, updater: (permit: GovernmentPermit) => GovernmentPermit) => {
    setEditedSchool((prev: School) => {
      const permits = getPermitList(prev).map((permit) => ({
        ...permit,
        permitLevels: { ...permit.permitLevels },
        shsStrands: [...(permit.shsStrands || [])],
      }));

      const targetPermit = permits[index] || createPermitFromSchool(prev);
      permits[index] = updater(targetPermit);

      return syncPrimaryPermit(prev, permits);
    });
  };

  const removePermitAt = (index: number) => {
    setEditedSchool((prev: School) => {
      const nextPermits = getPermitList(prev).filter((_, permitIndex) => permitIndex !== index);
      const normalized = nextPermits.length > 0 ? nextPermits : [createPermitFromSchool(prev)];
      return syncPrimaryPermit(prev, normalized);
    });

    setActivePermitIndex((prev) => {
      if (prev > index) return prev - 1;
      if (prev === index) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const toggleStrand = (strand: SHSStrand) => {
    updatePermitAt(activePermitIndex, (permit) => {
      const currentStrands = permit.shsStrands || [];
      const hasStrand = currentStrands.includes(strand);

      return {
        ...permit,
        shsStrands: hasStrand
          ? currentStrands.filter((s: SHSStrand) => s !== strand)
          : [...currentStrands, strand],
      };
    });
  };

  const handleSave = () => {
    onSave({
      ...editedSchool,
      logicType: manualOverride ? 'manual' : 'ocr',
    });
    onClose();
  };

  useEffect(() => {
    setEditedSchool((prev: School) => {
      if (prev.governmentPermits && prev.governmentPermits.length > 0) {
        return prev;
      }

      return syncPrimaryPermit(prev, [createPermitFromSchool(prev)]);
    });
  }, []);

  const requestOcr = async (file: File): Promise<OCRPermitResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiBaseUrl}/api/ocr/permit`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('OCR request failed');
    }

    return response.json();
  };

  const requestGeocode = async (name: string, address: string) => {
    const response = await fetch(`${apiBaseUrl}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address }),
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<{ lat: number; lng: number }>;
  };

  const handleGeocode = async () => {
    if (!editedSchool.address.trim()) return;
    const result = await requestGeocode(editedSchool.name.trim(), editedSchool.address.trim());
    if (!result) return;
    setManualCoordinates(false);
    setEditedSchool((prev: School) => ({ ...prev, lat: result.lat, lng: result.lng }));
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) return;

    setManualCoordinates(true);
    setEditedSchool((prev: School) => ({
      ...prev,
      [field]: parsed,
    }));
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (school) {
      addNotification('School Record Deleted', `"${editedSchool.name}" has been moved to trash.`);
      setShowDeleteConfirm(false);
      onDelete(school.id);
      onClose();
    }
  };

  const storedFileRef = useRef<File | null>(null);

  const handleUploadPermit = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    storedFileRef.current = file;

    setIsProcessing(true);
    setUploadError(null);
    setOcrEngine('none');
    setOcrDiagnostics(null);

    const permitUrl = await fileToDataUrl(file);
    setEditedSchool((prev) => ({ ...prev, permitUrl }));

    try {
      const ocrResult = await requestOcr(file);
      setOcrEngine(ocrResult.ocrEngine || 'unknown');
      setOcrDiagnostics(ocrResult.ocrDiagnostics || null);

      const fallbackPermit: GovernmentPermit = {
        permitNumber: ocrResult.permitNumber ?? '',
        schoolYear: ocrResult.schoolYear ?? '',
        issueDate: new Date().toISOString().split('T')[0],
        permitLevels: ocrResult.permitLevels ?? { kindergarten: false, elementary: false, highSchool: false, seniorHighSchool: false },
        shsStrands: ocrResult.shsStrands ?? [],
      };

      const newPermit: GovernmentPermit = {
        permitNumber: fallbackPermit.permitNumber,
        schoolYear: fallbackPermit.schoolYear || inferSchoolYearFromPermitNumber(fallbackPermit.permitNumber),
        issueDate: new Date().toISOString().split('T')[0],
        permitLevels: hasAnyPermitLevel(fallbackPermit.permitLevels)
          ? fallbackPermit.permitLevels
          : { kindergarten: false, elementary: false, highSchool: false, seniorHighSchool: false },
        shsStrands: fallbackPermit.shsStrands ?? [],
      };

      setEditedSchool((prev: School) => {
        const existing = prev.governmentPermits ?? [];
        const deduped = newPermit.permitNumber
          ? [newPermit, ...existing.filter((p) => p.permitNumber !== newPermit.permitNumber)]
          : [newPermit, ...existing];
        return {
          ...prev,
          name: ocrResult.name ?? prev.name,
          address: ocrResult.address ?? prev.address,
          permitNumber: newPermit.permitNumber || prev.permitNumber,
          schoolYear: newPermit.schoolYear || prev.schoolYear,
          permitLevels: newPermit.permitLevels,
          shsStrands: newPermit.shsStrands ?? prev.shsStrands,
          logicType: 'ocr',
          permitUrl,
          governmentPermits: deduped,
        };
      });

      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);
      setOcrEngine('none');
      setOcrDiagnostics(null);
      setUploadError('OCR failed. File preview is kept; please fill missing fields manually.');
    }
  };

  useEffect(() => {
    if (manualCoordinates) return;
    if (!editedSchool.address.trim()) return;
    const timeout = setTimeout(() => {
      requestGeocode(editedSchool.name.trim(), editedSchool.address.trim()).then((result) => {
        if (!result) return;
        setEditedSchool((prev: School) => ({ ...prev, lat: result.lat, lng: result.lng }));
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [editedSchool.address, editedSchool.name, manualCoordinates]);

  const permitHistory = getPermitList(editedSchool);
  const selectedPermitIndex = Math.min(activePermitIndex, Math.max(permitHistory.length - 1, 0));
  const currentPermit = permitHistory[selectedPermitIndex] || createPermitFromSchool(editedSchool);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full h-full max-w-[99vw] max-h-[99vh] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0C4DA2] to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <img 
              src={logoSrc}
              alt="DepEd Cabuyao" 
              onError={() => setLogoSrc(fallbackLogo)}
              className="w-10 h-10"
            />
            <div>
              <h2 className="text-xl font-bold text-white">
                {isNewSchool ? 'New School Registration' : 'Permit Verification & Edit'}
              </h2>
              <p className="text-sm text-blue-100">
                {isNewSchool ? 'Register a new school' : editedSchool.permitNumber}
              </p>
            </div>
          </div>
          <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
        </div>

        {/* Split View Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: PDF Viewer (35%) */}
          <div className="w-[35%] p-4 overflow-hidden">
            <PDFViewer 
              permitUrl={editedSchool.permitUrl} 
              permitNumber={editedSchool.permitNumber || 'New Permit'}
            />
          </div>

          {/* Right: Editable Form (65%) */}
          <div className="w-[65%] p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* School Information */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  School Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">School Name *</label>
                    <input
                      type="text"
                      value={editedSchool.name}
                      onChange={(e) => setEditedSchool({ ...editedSchool, name: e.target.value })}
                      placeholder="Enter school name"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Complete Address *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedSchool.address}
                        onChange={(e) => setEditedSchool({ ...editedSchool, address: e.target.value })}
                        placeholder="Enter complete address"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                      />
                      <button
                          type="button"
                          onClick={handleGeocode}
                          className="px-4 py-3 bg-[#0C4DA2]/20 hover:bg-[#0C4DA2]/30 border border-[#0C4DA2]/40 text-blue-300 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                        <MapPin className="w-4 h-4" />
                        Geocode
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className="px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Pin Exact
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Coordinates: {editedSchool.lat.toFixed(6)}, {editedSchool.lng.toFixed(6)}</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={editedSchool.lat}
                        onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                        placeholder="Latitude"
                        aria-label="Latitude"
                      />
                      <input
                        type="number"
                        step="any"
                        value={editedSchool.lng}
                        onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                        placeholder="Longitude"
                        aria-label="Longitude"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Permit Details */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Permit Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Permit Number *</label>
                    <input
                      type="text"
                      value={currentPermit.permitNumber}
                      onChange={(e) => updatePermitAt(selectedPermitIndex, (permit) => ({ ...permit, permitNumber: e.target.value }))}
                      placeholder="SDO-CAB-YYYY-XXX"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">School Year *</label>
                    <input
                      type="text"
                      value={currentPermit.schoolYear}
                      onChange={(e) => updatePermitAt(selectedPermitIndex, (permit) => ({ ...permit, schoolYear: e.target.value }))}
                      placeholder="2024-2025"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                    />
                  </div>

                  {/* Government Permit Levels */}
                  <div>
                    <label className="text-xs text-slate-400 mb-3 block">Government Permit (Check applicable levels) *</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={currentPermit.permitLevels.kindergarten}
                          aria-label="Kindergarten Permit"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePermitAt(selectedPermitIndex, (permit) => ({
                            ...permit,
                            permitLevels: { ...permit.permitLevels, kindergarten: e.target.checked },
                          }))}
                          className="w-5 h-5 rounded border-white/20 text-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2] bg-white/5"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">K - Kindergarten</div>
                          <div className="text-xs text-slate-400">Pre-elementary education</div>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={currentPermit.permitLevels.elementary}
                          aria-label="Elementary Permit"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePermitAt(selectedPermitIndex, (permit) => ({
                            ...permit,
                            permitLevels: { ...permit.permitLevels, elementary: e.target.checked },
                          }))}
                          className="w-5 h-5 rounded border-white/20 text-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2] bg-white/5"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">E - Elementary</div>
                          <div className="text-xs text-slate-400">Grades 1-6</div>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={currentPermit.permitLevels.highSchool}
                          aria-label="High School Permit"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePermitAt(selectedPermitIndex, (permit) => ({
                            ...permit,
                            permitLevels: { ...permit.permitLevels, highSchool: e.target.checked },
                          }))}
                          className="w-5 h-5 rounded border-white/20 text-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2] bg-white/5"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">J - High School (Junior)</div>
                          <div className="text-xs text-slate-400">Grades 7-10</div>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={currentPermit.permitLevels.seniorHighSchool}
                          aria-label="Senior High School Permit"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePermitAt(selectedPermitIndex, (permit) => ({
                            ...permit,
                            permitLevels: { ...permit.permitLevels, seniorHighSchool: e.target.checked },
                          }))}
                          className="w-5 h-5 rounded border-white/20 text-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2] bg-white/5"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">SHS - Senior High School</div>
                          <div className="text-xs text-slate-400">Grades 11-12</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* SHS Strands */}
                  {currentPermit.permitLevels.seniorHighSchool && (
                    <div>
                      <label className="text-xs text-slate-400 mb-3 block">Senior High School Strands *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'STEM', label: 'STEM', desc: 'Science, Technology, Engineering & Mathematics' },
                          { value: 'ABM', label: 'ABM', desc: 'Accountancy, Business & Management' },
                          { value: 'HUMSS', label: 'HUMSS', desc: 'Humanities & Social Sciences' },
                          { value: 'GAS', label: 'GAS', desc: 'General Academic Strand' },
                          { value: 'TVL-ICT', label: 'TVL-ICT', desc: 'ICT Track' },
                          { value: 'TVL-HE', label: 'TVL-HE', desc: 'Home Economics' },
                          { value: 'TVL-IA', label: 'TVL-IA', desc: 'Industrial Arts' },
                          { value: 'ARTS-DESIGN', label: 'Arts & Design', desc: 'Arts & Design Track' },
                          { value: 'SPORTS', label: 'Sports', desc: 'Sports Track' },
                        ].map((strand) => (
                          <label 
                            key={strand.value}
                            className={`
                              flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                              ${(currentPermit.shsStrands || []).includes(strand.value as SHSStrand)
                                ? 'bg-[#0C4DA2]/20 border-[#0C4DA2]/60 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={(currentPermit.shsStrands || []).includes(strand.value as SHSStrand)}
                              aria-label={strand.label}
                              onChange={() => toggleStrand(strand.value as SHSStrand)}
                              className="w-4 h-4 rounded border-white/20 text-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2] bg-white/5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{strand.label}</div>
                              <div className="text-xs opacity-70 truncate">{strand.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Management */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Permit Status Management
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Current Status *</label>
                    <Select
                      value={editedSchool.status}
                      onValueChange={(value) => setEditedSchool({ ...editedSchool, status: value as SchoolStatus })}
                    >
                      <SelectTrigger aria-label="Current Status" className="w-full bg-white/5 border-white/10 rounded-lg">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="renewal">For Renewal</SelectItem>
                        <SelectItem value="not-operational">Not Operational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <div className="text-white text-sm font-medium">Manual Override</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {manualOverride 
                          ? 'Status set manually by administrator' 
                          : 'Status detected automatically via OCR'}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualOverride}
                        aria-label="Manual Override Status"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualOverride(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0C4DA2]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Permit History */}
              {permitHistory.length > 0 && (
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    Permit History ({permitHistory.length})
                  </h3>
                  <div className="space-y-2">
                    {permitHistory.map((permit, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${idx === selectedPermitIndex ? 'bg-indigo-500/15 border-indigo-400/40' : idx === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-white text-sm font-mono">{permit.permitNumber || '(no number)'}</div>
                            <div className="text-xs text-slate-400">{permit.schoolYear}</div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1 items-center">
                            {permit.permitLevels.kindergarten && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">K</span>}
                            {permit.permitLevels.elementary && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">E</span>}
                            {permit.permitLevels.highSchool && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">JHS</span>}
                            {permit.permitLevels.seniorHighSchool && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">SHS</span>}
                            <button
                              type="button"
                              onClick={() => setActivePermitIndex(idx)}
                              className={`ml-2 px-2 py-1 rounded text-xs border transition-colors ${idx === selectedPermitIndex ? 'bg-indigo-500/30 border-indigo-400/60 text-indigo-100' : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removePermitAt(idx)}
                              disabled={permitHistory.length === 1}
                              className="px-2 py-1 rounded text-xs border bg-rose-500/15 border-rose-500/40 text-rose-200 hover:bg-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {idx === selectedPermitIndex && <div className="mt-1 text-xs text-indigo-200">Editing this permit</div>}
                        {idx === 0 && <div className="mt-1 text-xs text-blue-300">● Current permit</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUploadPermit}
                  disabled={isProcessing}
                  className="hidden"
                />
                <div className={`
                  w-full bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-[#0C4DA2]/40 rounded-xl p-6 transition-all flex items-center justify-center gap-3 text-slate-300 hover:text-white
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}>
                  <Upload className="w-5 h-5" />
                  <span>{isProcessing ? 'Processing OCR...' : 'Upload Renewed Permit'}</span>
                </div>
              </label>
              {uploadError && (
                <div className="text-sm text-rose-300">{uploadError}</div>
              )}
              {ocrDiagnostics && (
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 space-y-1">
                  <div>
                    OCR engine: <span className="font-semibold">{ocrEngine}</span>
                    {Array.isArray(ocrDiagnostics.selectedPages) && ocrDiagnostics.selectedPages.length > 0 && (
                      <span> | candidate pages: <span className="font-semibold">{ocrDiagnostics.selectedPages.join(', ')}</span></span>
                    )}
                    {typeof ocrDiagnostics.confidence === 'number' && (
                      <span> | confidence: <span className="font-semibold">{Math.round(ocrDiagnostics.confidence * 100)}%</span></span>
                    )}
                  </div>
                  {Array.isArray(ocrDiagnostics.missingFields) && ocrDiagnostics.missingFields.length > 0 && (
                    <div>
                      Missing fields: <span className="font-semibold">{ocrDiagnostics.missingFields.join(', ')}</span>
                    </div>
                  )}
                  {Array.isArray(ocrDiagnostics.topPageScores) && ocrDiagnostics.topPageScores.length > 0 && (
                    <div>
                      Top page scores: <span className="font-semibold">{ocrDiagnostics.topPageScores.map((item) => `P${item.page}:${item.score}`).join(' | ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-0 bg-slate-900/95 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                {!isNewSchool && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 px-6 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-[#0C4DA2] to-[#B8860B] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {isNewSchool ? 'Create School' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showLocationPicker && (
        <LocationPickerModal
          initialLat={editedSchool.lat}
          initialLng={editedSchool.lng}
          onClose={() => setShowLocationPicker(false)}
          onConfirm={({ lat, lng }) => {
            setManualCoordinates(true);
            setEditedSchool((prev: School) => ({ ...prev, lat, lng }));
            setShowLocationPicker(false);
          }}
        />
      )}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete School Record"
        message={`Are you sure you want to move "${editedSchool.name}" to the trash? This action cannot be undone.`}
      />
    </div>
  );
}
