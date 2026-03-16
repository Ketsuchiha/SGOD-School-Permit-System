import { FileText, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface PDFViewerProps {
  permitUrl?: string;
  permitNumber: string;
}

export function PDFViewer({ permitUrl, permitNumber }: PDFViewerProps) {
  const [renderUrl, setRenderUrl] = useState<string | undefined>(permitUrl);

  const previewType = useMemo(() => {
    if (!permitUrl) return 'none';
    const lower = permitUrl.toLowerCase();
    if (lower.startsWith('data:image/') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
      return 'image';
    }
    if (lower.startsWith('data:application/pdf') || lower.endsWith('.pdf')) {
      return 'pdf';
    }
    return 'generic';
  }, [permitUrl]);

  useEffect(() => {
    if (!permitUrl) {
      setRenderUrl(undefined);
      return;
    }

    if (!permitUrl.startsWith('data:application/pdf')) {
      setRenderUrl(permitUrl);
      return;
    }

    try {
      const [meta, base64] = permitUrl.split(',', 2);
      if (!meta || !base64) {
        setRenderUrl(permitUrl);
        return;
      }

      const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
      const mimeType = mimeMatch?.[1] || 'application/pdf';
      const byteChars = atob(base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) {
        bytes[i] = byteChars.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      setRenderUrl(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } catch {
      setRenderUrl(permitUrl);
      return;
    }
  }, [permitUrl]);

  const handleDownload = () => {
    if (!renderUrl) return;
    const link = document.createElement('a');
    link.href = renderUrl;
    link.download = `${permitNumber || 'permit-document'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

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
            onClick={handleDownload}
            disabled={!permitUrl}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {permitUrl ? (
          previewType === 'image' ? (
            <img
              src={renderUrl}
              alt={`Permit ${permitNumber}`}
              className="w-full h-full object-contain"
            />
          ) : previewType === 'pdf' ? (
            <object
              data={renderUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <iframe
                src={renderUrl}
                title={`Permit ${permitNumber}`}
                className="w-full h-full"
              />
            </object>
          ) : (
            <iframe
              src={renderUrl}
              title={`Permit ${permitNumber}`}
              className="w-full h-full"
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Upload a permit document to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}
