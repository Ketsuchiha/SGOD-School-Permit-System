import React, { useEffect, useRef, useState } from 'react';
import { School, SchoolType, SHSStrand, OCRPermitResult, GovernmentPermit, PermitLevel, OCRDiagnostics } from '../data/mockData';
import { X, Save, MapPin, Building2, FileText, Home, Upload, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PDFViewer } from './PDFViewer';
import { useSchools } from '../contexts/SchoolContext';
import { useNotifications } from '../contexts/NotificationContext';
import { LocationPickerModal } from './LocationPickerModal';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';

interface CreateSchoolFormProps {
  onClose: () => void;
  onSave: (school: School) => void;
}

const createEmptyPermitLevels = (): PermitLevel => ({
  kindergarten: false,
  elementary: false,
  highSchool: false,
  seniorHighSchool: false,
});

const createEmptyPermit = (): GovernmentPermit => ({
  permitNumber: '',
  schoolYear: '2024-2025',
  issueDate: new Date().toISOString().split('T')[0],
  permitUrl: '',
  permitLevels: createEmptyPermitLevels(),
  shsStrands: [],
});

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);

const hasAnyPermitLevel = (levels?: PermitLevel) => {
  if (!levels) return false;
  return levels.kindergarten || levels.elementary || levels.highSchool || levels.seniorHighSchool;
};

const inferPermitLevelsFromPermitNumber = (permitNumber?: string): PermitLevel => {
  const normalized = (permitNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  const levels = createEmptyPermitLevels();

  if (!normalized) {
    return levels;
  }

  const code = normalized.match(/^([A-Z]+)/)?.[1] || '';

  if (code.startsWith('SHS')) {
    levels.seniorHighSchool = true;
  } else if (code.startsWith('K')) {
    levels.kindergarten = true;
  } else if (code.startsWith('E')) {
    levels.elementary = true;
  } else if (code.startsWith('J') || code.startsWith('S') || normalized.includes('JHS')) {
    levels.highSchool = true;
  }

  return levels;
};

const inferSchoolYearFromPermitNumber = (permitNumber?: string) => {
  if (!permitNumber) return '';
  const match = permitNumber.match(/\b(20\d{2})\b/);
  if (!match) return '';
  const start = Number(match[1]);
  return `${start}-${start + 1}`;
};

const pickText = (incoming: string | undefined, fallback: string) => {
  return hasText(incoming) ? incoming!.trim() : fallback;
};

const inferNameFromFileName = (fileName: string) => {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  if (!base) return '';
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getOcrEngineMeta = (engine: string) => {
  const normalized = (engine || 'none').toLowerCase();
  if (normalized === 'image-ocr') {
    return {
      label: 'Image OCR',
      badgeClass: 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100',
      description: 'Scanned image mode. Best for scanner-generated PDFs and photos.',
    };
  }
  if (normalized === 'pdf-text') {
    return {
      label: 'PDF Text',
      badgeClass: 'bg-blue-500/20 border border-blue-400/40 text-blue-100',
      description: 'Selectable text mode. Best for digital PDFs with embedded text.',
    };
  }
  if (normalized === 'pdf-recovery') {
    return {
      label: 'PDF Recovery',
      badgeClass: 'bg-amber-500/20 border border-amber-400/40 text-amber-100',
      description: 'Recovery mode. Partial extraction from difficult PDF content.',
    };
  }
  return {
    label: 'No OCR',
    badgeClass: 'bg-rose-500/20 border border-rose-400/40 text-rose-100',
    description: 'No usable OCR output detected for this upload.',
  };
};

export function CreateSchoolForm({ onClose, onSave }: CreateSchoolFormProps) {
  const apiBaseUrl = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000');
  const { activeSchools } = useSchools();
  const { addNotification } = useNotifications();
  const fallbackLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGBgAAAABQABDQottAAAAABJRU5ErkJggg==';
  const [schoolType, setSchoolType] = useState<SchoolType>('regular');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ocrEngine, setOcrEngine] = useState<string>('none');
  const [ocrDiagnostics, setOcrDiagnostics] = useState<OCRDiagnostics | null>(null);
  const [targetPageInput, setTargetPageInput] = useState<string>('');
  const [logoSrc, setLogoSrc] = useState<string>(import.meta.env?.VITE_DEPED_LOGO_URL ?? '/Deped_Logo.png');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const storedFileRef = useRef<File | null>(null);
  
  const [newSchool, setNewSchool] = useState<School>({
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
    permitLevels: createEmptyPermitLevels(),
    shsStrands: [],
    governmentPermits: [createEmptyPermit()],
    lat: 14.2722,
    lng: 121.1239,
    homeschoolProvider: '',
    homeschoolYearLevel: '',
  });

  const requestOcr = async (file: File, page?: number): Promise<OCRPermitResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (page && page > 0) {
      formData.append('targetPage', String(page));
    }

    const response = await fetch(`${apiBaseUrl}/api/ocr/permit`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('OCR request failed');
    }

    return response.json();
  };

  const requestPermitUpload = async (file: File, schoolYear: string = ""): Promise<{ url: string; storage: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    // Pass the school year so files are organized by year in the uploads folder
    const params = new URLSearchParams();
    if (schoolYear.trim()) {
      params.append('schoolYear', schoolYear.trim());
    }

    const response = await fetch(`${apiBaseUrl}/api/uploads/permit${params.toString() ? '?' + params.toString() : ''}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let detail = 'File upload failed';
      try {
        const payload = await response.json();
        if (payload?.detail) {
          detail = String(payload.detail);
        }
      } catch {
        // Keep default detail when response body isn't JSON.
      }
      throw new Error(detail);
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

  const requestReverseGeocode = async (lat: number, lng: number) => {
    const response = await fetch(`${apiBaseUrl}/api/reverse-geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<{ address: string; lat: number; lng: number }>;
  };

  const parseTargetPage = (): number | undefined => {
    const parsed = Number(targetPageInput);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  };

  const applyOcr = async (file: File, page?: number) => {
    setIsProcessing(true);
    setOcrComplete(false);
    setUploadError(null);
    setOcrEngine('none');
    setOcrDiagnostics(null);

    let permitUrl = '';
    try {
      // Pass the school year so the file is organized in the year's folder
      const uploadResult = await requestPermitUpload(file, newSchool.schoolYear);
      permitUrl = uploadResult.url;
      setNewSchool((prev) => ({ ...prev, permitUrl }));
    } catch (error) {
      setIsProcessing(false);
      setUploadError(error instanceof Error ? error.message : 'File upload failed. Please check backend and try again.');
      return;
    }

    try {
      const ocrResult = await requestOcr(file, page);
      setOcrEngine(ocrResult.ocrEngine || 'unknown');
      setOcrDiagnostics(ocrResult.ocrDiagnostics || null);
      const inferredName = inferNameFromFileName(file.name);

      const fallbackPermit: GovernmentPermit = {
        permitNumber: ocrResult.permitNumber ?? '',
        schoolYear: ocrResult.schoolYear ?? '',
        issueDate: new Date().toISOString().split('T')[0],
        permitUrl,
        permitLevels: ocrResult.permitLevels ?? createEmptyPermitLevels(),
        shsStrands: ocrResult.shsStrands ?? [],
      };

      const detectedPermits = (ocrResult.permits && ocrResult.permits.length > 0)
        ? ocrResult.permits
        : [fallbackPermit];

      const normalizedPermits = detectedPermits.map((permit) => ({
        permitNumber: permit.permitNumber || fallbackPermit.permitNumber || '',
        schoolYear:
          permit.schoolYear
          || fallbackPermit.schoolYear
          || inferSchoolYearFromPermitNumber(permit.permitNumber || fallbackPermit.permitNumber)
          || '2024-2025',
        issueDate: permit.issueDate ?? new Date().toISOString().split('T')[0],
        permitUrl: permit.permitUrl || fallbackPermit.permitUrl,
        permitLevels: (() => {
          const inferredLevels = inferPermitLevelsFromPermitNumber(permit.permitNumber || fallbackPermit.permitNumber);
          if (hasAnyPermitLevel(inferredLevels)) {
            return inferredLevels;
          }
          return hasAnyPermitLevel(permit.permitLevels) ? permit.permitLevels : fallbackPermit.permitLevels;
        })(),
        shsStrands: (permit.shsStrands && permit.shsStrands.length > 0) ? permit.shsStrands : fallbackPermit.shsStrands,
      }));

      const primaryPermit = normalizedPermits[0];
      const meaningfulOcr =
        hasText(ocrResult.name)
        || hasText(ocrResult.address)
        || hasText(primaryPermit?.permitNumber || ocrResult.permitNumber)
        || hasText(primaryPermit?.schoolYear || ocrResult.schoolYear)
        || Boolean(primaryPermit?.permitLevels?.kindergarten || primaryPermit?.permitLevels?.elementary || primaryPermit?.permitLevels?.highSchool || primaryPermit?.permitLevels?.seniorHighSchool)
        || Boolean((primaryPermit?.shsStrands || []).length > 0);

      setNewSchool((prev: School) => ({
        ...prev,
        name: pickText(ocrResult.name, prev.name || inferredName),
        address: pickText(ocrResult.address, prev.address),
        permitNumber: primaryPermit.permitNumber || ocrResult.permitNumber || prev.permitNumber,
        schoolYear: primaryPermit.schoolYear || ocrResult.schoolYear || prev.schoolYear,
        issueDate: primaryPermit.issueDate || prev.issueDate,
        permitLevels: primaryPermit.permitLevels,
        shsStrands: primaryPermit.shsStrands,
        governmentPermits: normalizedPermits,
        logicType: 'ocr',
        permitUrl,
      }));

      setIsProcessing(false);
      setOcrComplete(meaningfulOcr);
      if (!meaningfulOcr) {
        setUploadError('OCR could not reliably detect fields from this scan. Please review the preview and fill the form manually.');
      }
    } catch (error) {
      setIsProcessing(false);
      setOcrComplete(false);
      setOcrEngine('none');
      setOcrDiagnostics(null);
      setUploadError('OCR failed. File preview is kept; please fill missing fields manually.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    storedFileRef.current = file;
    setUploadedFileName(file.name);
    await applyOcr(file, parseTargetPage());
  };

  const handleRerunOcr = async () => {
    if (!storedFileRef.current) return;
    await applyOcr(storedFileRef.current, parseTargetPage());
  };

  const toggleStrand = (strand: SHSStrand) => {
    const currentStrands = (newSchool.governmentPermits?.[0]?.shsStrands || []);
    const hasStrand = currentStrands.includes(strand);
    
    setNewSchool((prev) => {
      const currentPermits = prev.governmentPermits && prev.governmentPermits.length > 0
        ? [...prev.governmentPermits]
        : [createEmptyPermit()];
      currentPermits[0] = {
        ...currentPermits[0],
        shsStrands: hasStrand
          ? currentStrands.filter((s: SHSStrand) => s !== strand)
          : [...currentStrands, strand],
      };
      return {
        ...prev,
        shsStrands: currentPermits[0].shsStrands,
        governmentPermits: currentPermits,
      };
    });
  };

  const toggleStrandByPermitIndex = (permitIndex: number, strand: SHSStrand) => {
    setNewSchool((prev) => {
      const currentPermits = prev.governmentPermits && prev.governmentPermits.length > 0
        ? [...prev.governmentPermits]
        : [createEmptyPermit()];
      const permit = currentPermits[permitIndex] ?? createEmptyPermit();
      const strands = permit.shsStrands || [];
      const hasStrand = strands.includes(strand);
      const updatedPermit = {
        ...permit,
        shsStrands: hasStrand ? strands.filter((s: SHSStrand) => s !== strand) : [...strands, strand],
      };
      currentPermits[permitIndex] = updatedPermit;
      return {
        ...prev,
        governmentPermits: currentPermits,
        permitLevels: permitIndex === 0 ? updatedPermit.permitLevels : prev.permitLevels,
        shsStrands: permitIndex === 0 ? updatedPermit.shsStrands : prev.shsStrands,
      };
    });
  };

  const handleSave = () => {
    if (schoolType === 'homeschool') {
      const schoolName = pickText(newSchool.homeschoolProvider, newSchool.name);
      onSave({
        ...newSchool,
        schoolType,
        name: schoolName,
        address: pickText(newSchool.address, ''),
        permitNumber: '',
        schoolYear: pickText(newSchool.homeschoolYearLevel, newSchool.schoolYear),
        issueDate: new Date().toISOString().split('T')[0],
        permitLevels: createEmptyPermitLevels(),
        shsStrands: [],
        governmentPermits: [],
        logicType: 'manual',
      });
      addNotification('Saving School', `Registering ${schoolName}...`);
      onClose();
      return;
    }

    const permits = (newSchool.governmentPermits && newSchool.governmentPermits.length > 0)
      ? newSchool.governmentPermits
      : [createEmptyPermit()];
    const primaryPermit = permits[0];

    const schoolData = {
      ...newSchool,
      schoolType: schoolType,
      permitNumber: primaryPermit.permitNumber,
      schoolYear: primaryPermit.schoolYear,
      issueDate: primaryPermit.issueDate || newSchool.issueDate,
      permitLevels: primaryPermit.permitLevels,
      shsStrands: primaryPermit.shsStrands || [],
      governmentPermits: permits,
    };

    addNotification('Saving School', `Registering ${schoolData.name}...`);
    onSave(schoolData);
    onClose();
  };

  const handleGeocode = async () => {
    if (!newSchool.address.trim()) return;
    const result = await requestGeocode(newSchool.name.trim(), newSchool.address.trim());
    if (!result) return;
    setManualCoordinates(false);
    setNewSchool((prev: School) => ({ ...prev, lat: result.lat, lng: result.lng }));
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) return;

    setManualCoordinates(true);
    setNewSchool((prev: School) => ({
      ...prev,
      [field]: parsed,
    }));
  };

  useEffect(() => {
    if (manualCoordinates) return;
    if (!newSchool.address.trim()) return;
    const timeout = setTimeout(() => {
      requestGeocode(newSchool.name.trim(), newSchool.address.trim()).then((result) => {
        if (!result) return;
        setNewSchool((prev: School) => ({ ...prev, lat: result.lat, lng: result.lng }));
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [newSchool.address, newSchool.name, manualCoordinates]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[96vw] h-[92vh] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#0C4DA2] to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="DepEd Cabuyao"
              onError={() => setLogoSrc(fallbackLogo)}
              className="w-10 h-10"
            />
            <div>
              <h2 className="text-xl font-bold text-white">Create New School</h2>
              <p className="text-sm text-blue-100">Upload permit or manually register a new school</p>
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

        {/* Body: PDF viewer side-panel + right form column */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* LEFT: PDF viewer — full height side panel */}
          {schoolType === 'regular' && (
            <div className="w-[44%] shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
              <PDFViewer
                permitUrl={newSchool.permitUrl}
                permitNumber={newSchool.governmentPermits?.[0]?.permitNumber || newSchool.permitNumber || 'Unassigned Permit'}
              />
            </div>
          )}

          {/* RIGHT: upload strip + scrollable form */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {/* Upload section — compact strip at top of right column */}
            {schoolType === 'regular' && (
              <div className="shrink-0 px-5 py-3 border-b border-white/10 bg-[#0C4DA2]/10">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex-1 min-w-0 cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                      className="hidden"
                    />
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all text-sm ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}>
                      {isProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin shrink-0" /><span className="text-slate-300 truncate">Processing OCR...</span></>
                      ) : uploadedFileName ? (
                        <><FileText className="w-4 h-4 text-emerald-400 shrink-0" /><span className="text-white truncate">{uploadedFileName}</span><span className="text-xs text-slate-400 shrink-0">(click to replace)</span></>
                      ) : (
                        <><Upload className="w-4 h-4 shrink-0" /><span className="text-slate-300">Upload permit (PDF / JPG / PNG)</span></>
                      )}
                    </div>
                  </label>

                  <div className="flex items-end gap-2 shrink-0">
                    <div>
                      <label htmlFor="targetPage" className="block text-xs text-slate-400 mb-0.5">Page</label>
                      <input
                        id="targetPage"
                        type="number"
                        min={1}
                        value={targetPageInput}
                        placeholder="Auto"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-16 bg-white/5 border border-white/20 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRerunOcr}
                      disabled={!storedFileRef.current || isProcessing}
                      title="Re-run OCR with current page number"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-run OCR
                    </button>
                    {ocrComplete && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Done</span>
                      </div>
                    )}
                  </div>
                </div>
                {uploadError && <p className="mt-1.5 text-xs text-rose-300">{uploadError}</p>}
                {ocrDiagnostics && (
                  <div className="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-cyan-50">OCR Mode</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getOcrEngineMeta(ocrEngine).badgeClass}`}>
                        {getOcrEngineMeta(ocrEngine).label}
                      </span>
                    </div>
                    <div className="text-cyan-100/90">{getOcrEngineMeta(ocrEngine).description}</div>
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
              </div>
            )}

            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto p-5">
          <Tabs value={schoolType} onValueChange={(value) => setSchoolType(value as SchoolType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="regular" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Regular School
              </TabsTrigger>
              <TabsTrigger value="homeschool" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Home-Schooling
              </TabsTrigger>
            </TabsList>

            {/* Regular School Tab */}
            <TabsContent value="regular" className="space-y-5">
              {/* School Information */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  School Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="schoolName" className="text-xs text-slate-400 mb-2 block">School Name *</label>
                    <input
                      id="schoolName"
                      type="text"
                      value={newSchool.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSchool({ ...newSchool, name: e.target.value })}
                      placeholder="Enter school name"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                    />
                    {newSchool.name.trim().length > 0 && activeSchools.some((s: School) => s.name.toLowerCase() === newSchool.name.trim().toLowerCase()) && (
                      <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                        A school with this name already exists. Add a branch/campus label below to differentiate it.
                      </div>
                    )}
                  </div>

                  {newSchool.name.trim().length > 0 && activeSchools.some((s: School) => s.name.toLowerCase() === newSchool.name.trim().toLowerCase()) && (
                    <div>
                      <label htmlFor="branchLabel" className="text-xs text-slate-400 mb-2 block">Branch / Campus Label</label>
                      <input
                        id="branchLabel"
                        type="text"
                        value={newSchool.branchLabel ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSchool({ ...newSchool, branchLabel: e.target.value })}
                        placeholder="e.g. Main Campus, Branch 1, Annex"
                        className="w-full bg-white/5 border border-amber-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">School Address *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSchool.address}
                        onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
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
                    <div className="mt-2 text-xs text-slate-300">Coordinates: {newSchool.lat.toFixed(6)}, {newSchool.lng.toFixed(6)}</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={newSchool.lat}
                        onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                        placeholder="Latitude"
                        aria-label="Latitude"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                      />
                      <input
                        type="number"
                        step="any"
                        value={newSchool.lng}
                        onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                        placeholder="Longitude"
                        aria-label="Longitude"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Government Permits */}
              <div className="space-y-4">
                {(newSchool.governmentPermits && newSchool.governmentPermits.length > 0 ? newSchool.governmentPermits : [createEmptyPermit()]).map((permit, permitIndex) => (
                  <div key={`permit-${permitIndex}`} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Government Permit #{permitIndex + 1}
                      </h3>
                      {permitIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewSchool((prev) => {
                              const permits = (prev.governmentPermits || []).filter((_, idx) => idx !== permitIndex);
                              const finalPermits = permits.length > 0 ? permits : [createEmptyPermit()];
                              const primary = finalPermits[0];
                              return {
                                ...prev,
                                governmentPermits: finalPermits,
                                permitNumber: primary.permitNumber,
                                schoolYear: primary.schoolYear,
                                issueDate: primary.issueDate || prev.issueDate,
                                permitLevels: primary.permitLevels,
                                shsStrands: primary.shsStrands || [],
                              };
                            });
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30"
                        >
                          Remove Permit
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-2 block">Permit Number *</label>
                        <input
                          type="text"
                          value={permit.permitNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewSchool((prev) => {
                              const permits = prev.governmentPermits ? [...prev.governmentPermits] : [createEmptyPermit()];
                              const target = permits[permitIndex] || createEmptyPermit();
                              const inferredLevels = inferPermitLevelsFromPermitNumber(value);
                              permits[permitIndex] = {
                                ...target,
                                permitNumber: value,
                                permitLevels: inferredLevels,
                                shsStrands: inferredLevels.seniorHighSchool ? (target.shsStrands || []) : [],
                              };
                              return {
                                ...prev,
                                governmentPermits: permits,
                                permitNumber: permitIndex === 0 ? value : prev.permitNumber,
                                permitLevels: permitIndex === 0 ? inferredLevels : prev.permitLevels,
                                shsStrands: permitIndex === 0 && inferredLevels.seniorHighSchool ? (target.shsStrands || []) : (permitIndex === 0 ? [] : prev.shsStrands),
                              };
                            });
                          }}
                          placeholder="SDO-CAB-YYYY-XXX"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 mb-2 block">School Year *</label>
                        <input
                          type="text"
                          value={permit.schoolYear}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewSchool((prev) => {
                              const permits = prev.governmentPermits ? [...prev.governmentPermits] : [createEmptyPermit()];
                              const target = permits[permitIndex] || createEmptyPermit();
                              permits[permitIndex] = { ...target, schoolYear: value };
                              return {
                                ...prev,
                                governmentPermits: permits,
                                schoolYear: permitIndex === 0 ? value : prev.schoolYear,
                              };
                            });
                          }}
                          placeholder="2024-2025"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 mb-3 block">Government Permit (Check applicable levels) *</label>
                        <div className="space-y-3">
                          {[
                            { key: 'kindergarten', title: 'K - Kindergarten', desc: 'Pre-elementary education' },
                            { key: 'elementary', title: 'E - Elementary', desc: 'Grades 1-6' },
                            { key: 'highSchool', title: 'J - High School (Junior)', desc: 'Grades 7-10' },
                            { key: 'seniorHighSchool', title: 'SHS - Senior High School', desc: 'Grades 11-12' },
                          ].map((level) => (
                            <label key={level.key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                              <input
                                type="checkbox"
                                checked={permit.permitLevels[level.key as keyof PermitLevel]}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const checked = e.target.checked;
                                  setNewSchool((prev) => {
                                    const permits = prev.governmentPermits ? [...prev.governmentPermits] : [createEmptyPermit()];
                                    const target = permits[permitIndex] || createEmptyPermit();
                                    const updatedPermit = {
                                      ...target,
                                      permitLevels: {
                                        ...target.permitLevels,
                                        [level.key]: checked,
                                      },
                                    };
                                    permits[permitIndex] = updatedPermit;
                                    return {
                                      ...prev,
                                      governmentPermits: permits,
                                      permitLevels: permitIndex === 0 ? updatedPermit.permitLevels : prev.permitLevels,
                                    };
                                  });
                                }}
                                className="w-5 h-5 rounded border-white/20 text-[#0C4DA2] focus:ring-2 focus:ring-[#0C4DA2] bg-white/5"
                              />
                              <div className="flex-1">
                                <div className="text-white font-medium">{level.title}</div>
                                <div className="text-xs text-slate-400">{level.desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {permit.permitLevels.seniorHighSchool && (
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
                                  ${(permit.shsStrands || []).includes(strand.value as SHSStrand)
                                    ? 'bg-[#0C4DA2]/20 border-[#0C4DA2]/60 text-white'
                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                  }
                                `}
                              >
                                <input
                                  type="checkbox"
                                  checked={(permit.shsStrands || []).includes(strand.value as SHSStrand)}
                                  aria-label={strand.label}
                                  onChange={() => {
                                    if (permitIndex === 0) {
                                      toggleStrand(strand.value as SHSStrand);
                                      return;
                                    }
                                    toggleStrandByPermitIndex(permitIndex, strand.value as SHSStrand);
                                  }}
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
                ))}

                <button
                  type="button"
                  onClick={() => setNewSchool((prev) => ({
                    ...prev,
                    governmentPermits: [...(prev.governmentPermits || []), createEmptyPermit()],
                  }))}
                  className="w-full px-4 py-3 rounded-lg border border-dashed border-[#0C4DA2]/50 text-blue-200 hover:bg-[#0C4DA2]/15 transition-colors"
                >
                  Add Another Government Permit
                </button>
              </div>
            </TabsContent>

            <TabsContent value="homeschool" className="space-y-6">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Homeschooling Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Provider *</label>
                    <input
                      type="text"
                      value={newSchool.homeschoolProvider || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSchool({ ...newSchool, homeschoolProvider: e.target.value, name: e.target.value })}
                      placeholder="Enter homeschooling provider"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Year Level *</label>
                    <input
                      type="text"
                      value={newSchool.homeschoolYearLevel || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSchool({ ...newSchool, homeschoolYearLevel: e.target.value })}
                      placeholder="e.g. Grade 3 / Grade 7 / K-12"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0C4DA2]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Address *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSchool.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSchool({ ...newSchool, address: e.target.value })}
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
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          </div>{/* end scrollable */}

          {/* Action Buttons — fixed outside scroll, always at bottom */}
          <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-white/10 bg-slate-900/95">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-[#0C4DA2] to-[#B8860B] text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Create School
            </button>
          </div>
          </div>{/* end right column */}
        </div>{/* end body */}
      </div>
      {showLocationPicker && (
        <LocationPickerModal
          initialLat={newSchool.lat}
          initialLng={newSchool.lng}
          onClose={() => setShowLocationPicker(false)}
          onConfirm={async ({ lat, lng }) => {
            setManualCoordinates(true);
            const reverse = await requestReverseGeocode(lat, lng);
            setNewSchool((prev: School) => ({
              ...prev,
              lat,
              lng,
              address: (reverse?.address && reverse.address.trim()) ? reverse.address : prev.address,
            }));
            setShowLocationPicker(false);
          }}
        />
      )}
    </div>
  );
}
