import { FileText, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface PDFViewerProps {
  permitUrl?: string;
  permitNumber: string;
}

export function PDFViewer({ permitUrl, permitNumber }: PDFViewerProps) {
  return (
    <div className="h-full flex flex-col bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden">
      {/* PDF Viewer Header */}
      <div className="bg-white/10 border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#0C4DA2]" />
          <div>
            <div className="text-white text-sm font-medium">Permit Document</div>
            <div className="text-xs text-slate-400">{permitNumber}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            aria-label="Zoom Out"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            type="button"
            aria-label="Zoom In"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-slate-400" />
          </button>
          <button 
            type="button"
            aria-label="Download PDF"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {permitUrl ? (
          <iframe
            src={permitUrl}
            title={`Permit ${permitNumber}`}
            className="w-full h-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Upload a permit document to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}
