import { useMemo } from 'react';
import { School } from '../data/mockData';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';

const CABUYAO_CENTER: [number, number] = [14.2722, 121.1239];

type PlottedSchool = {
  school: School;
  lat: number;
  lng: number;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isWithinPhilippinesBounds = (lat: number, lng: number) => {
  return lat >= 4 && lat <= 22 && lng >= 116 && lng <= 127;
};

const stableHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildPlottedSchools = (schools: School[]): PlottedSchool[] => {
  const base = schools.map((school) => {
    const lat = toFiniteNumber(school.lat);
    const lng = toFiniteNumber(school.lng);

    if (lat !== null && lng !== null && isWithinPhilippinesBounds(lat, lng)) {
      return { school, lat, lng };
    }

    const hash = stableHash(school.id || school.name || 'school');
    const offsetLat = ((hash % 13) - 6) * 0.00006;
    const offsetLng = (((Math.floor(hash / 13)) % 13) - 6) * 0.00006;

    return {
      school,
      lat: CABUYAO_CENTER[0] + offsetLat,
      lng: CABUYAO_CENTER[1] + offsetLng,
    };
  });

  const grouped = new Map<string, PlottedSchool[]>();
  base.forEach((entry) => {
    const key = `${entry.lat.toFixed(6)},${entry.lng.toFixed(6)}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(entry);
    grouped.set(key, bucket);
  });

  const spread: PlottedSchool[] = [];
  grouped.forEach((bucket) => {
    if (bucket.length === 1) {
      spread.push(bucket[0]);
      return;
    }

    const radius = 0.00014;
    bucket.forEach((entry, index) => {
      const angle = (index / bucket.length) * Math.PI * 2;
      spread.push({
        ...entry,
        lat: entry.lat + Math.sin(angle) * radius,
        lng: entry.lng + Math.cos(angle) * radius,
      });
    });
  });

  return spread;
};

function MapControls({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
      <button
        type="button"
        aria-label="Zoom In"
        onClick={() => map.zoomIn()}
        className="w-10 h-10 bg-slate-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
      >
        <ZoomIn className="w-4 h-4 text-white" />
      </button>
      <button
        type="button"
        aria-label="Zoom Out"
        onClick={() => map.zoomOut()}
        className="w-10 h-10 bg-slate-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
      >
        <ZoomOut className="w-4 h-4 text-white" />
      </button>
      <button
        type="button"
        aria-label="Reset Map"
        onClick={() => {
          if (bounds) {
            map.fitBounds(bounds, { padding: [30, 30] });
          } else {
            map.setView(CABUYAO_CENTER, 12);
          }
        }}
        className="w-10 h-10 bg-slate-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
      >
        <Maximize2 className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}

interface MapWidgetProps {
  schools: School[];
  selectedSchool?: School;
  onSelectSchool: (school: School) => void;
}

export function MapWidget({ schools, selectedSchool, onSelectSchool }: MapWidgetProps) {
  const plottedSchools = useMemo(() => buildPlottedSchools(schools), [schools]);
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (plottedSchools.length === 0) {
      return null;
    }
    return plottedSchools.map((entry) => [entry.lat, entry.lng] as [number, number]);
  }, [plottedSchools]);

  const statusColor = (status: School['status']) => {
    switch (status) {
      case 'operational':
        return '#10b981';
      case 'renewal':
        return '#f59e0b';
      case 'not-operational':
        return '#f43f5e';
    }
  };

  return (
    <div className="relative">
      {/* Glass Container */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
        {/* Map Header */}
        <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Cabuyao City School Locations</h3>
          <div className="text-xs text-slate-300">
            Pins shown: <span className="font-semibold text-white">{plottedSchools.length}</span> / {schools.length}
          </div>
        </div>

        <div className="relative h-96 overflow-hidden">
          <MapContainer center={CABUYAO_CENTER} zoom={12} className="h-96 w-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {plottedSchools.map((entry) => {
              const school = entry.school;
              const isSelected = selectedSchool?.id === school.id;
              const color = statusColor(school.status);

              return [
                <CircleMarker
                  key={`${school.id}-glow`}
                  center={[entry.lat, entry.lng]}
                  radius={isSelected ? 18 : 14}
                  pathOptions={{ color, fillColor: color, fillOpacity: isSelected ? 0.3 : 0.2, weight: 0 }}
                />,
                <CircleMarker
                  key={`${school.id}-pin`}
                  center={[entry.lat, entry.lng]}
                  radius={isSelected ? 9 : 7}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.95, weight: isSelected ? 3 : 2 }}
                  eventHandlers={{ click: () => onSelectSchool(school) }}
                >
                  <Popup>
                    <div className="text-sm font-semibold">{school.name}</div>
                    <div className="text-xs">{school.permitNumber}</div>
                    <div className="text-xs">{school.address}</div>
                  </Popup>
                </CircleMarker>,
              ];
            })}
            <MapControls bounds={bounds} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
