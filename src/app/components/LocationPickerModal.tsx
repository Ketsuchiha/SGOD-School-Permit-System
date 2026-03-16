import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { X, Check, MapPin } from 'lucide-react';

interface LocationPickerModalProps {
  initialLat: number;
  initialLng: number;
  onClose: () => void;
  onConfirm: (coords: { lat: number; lng: number }) => void;
}

function ClickHandler({ onPick }: { onPick: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (event) => {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export function LocationPickerModal({ initialLat, initialLng, onClose, onConfirm }: LocationPickerModalProps) {
  const [picked, setPicked] = useState({ lat: initialLat, lng: initialLng });

  const center = useMemo<[number, number]>(() => [picked.lat, picked.lng], [picked.lat, picked.lng]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900/95 border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-white text-lg font-semibold">Pin Exact School Location</h3>
            <p className="text-slate-300 text-sm">Click on the map to place the exact marker location.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close location picker"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="h-[460px]">
          <MapContainer center={center} zoom={16} className="h-full w-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <ClickHandler onPick={setPicked} />
            <CircleMarker
              center={[picked.lat, picked.lng]}
              radius={10}
              pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.9 }}
            />
          </MapContainer>
        </div>

        <div className="px-5 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <MapPin className="w-4 h-4 text-cyan-300" />
            <span>Lat: {picked.lat.toFixed(6)} | Lng: {picked.lng.toFixed(6)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(picked)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0C4DA2] to-blue-600 text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Use This Pin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
