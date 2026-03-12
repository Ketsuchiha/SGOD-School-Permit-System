import { School, getStatusColor, getStatusLabel } from '../data/mockData';
import { Building2, MapPin } from 'lucide-react';

interface SchoolCardsProps {
  schools: School[];
  onSelectSchool: (school: School) => void;
  selectedSchoolId?: string;
}

export function SchoolCards({ schools, onSelectSchool, selectedSchoolId }: SchoolCardsProps) {
  return (
    <div className="space-y-3">
      {schools.map((school) => {
        const isSelected = selectedSchoolId === school.id;
        
        return (
          <button
            key={school.id}
            onClick={() => onSelectSchool(school)}
            className={`
              w-full text-left bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4
              hover:bg-white/15 transition-all cursor-pointer group
              ${isSelected ? 'ring-2 ring-[#0C4DA2] bg-[#0C4DA2]/10' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${isSelected ? 'bg-[#0C4DA2]' : 'bg-white/10 group-hover:bg-white/20'}
                transition-colors
              `}>
                <Building2 className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-white font-medium line-clamp-1">{school.name}</h4>
                  {school.branchLabel && (
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200">
                      {school.branchLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{school.address || 'No address recorded'}</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(school.status)}`}>
                  {getStatusLabel(school.status)}
                </span>
                {school.governmentPermits && school.governmentPermits.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {school.governmentPermits.slice(0, 3).map((permit, idx) => (
                      <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${idx === 0 ? 'bg-blue-500/15 border-blue-500/30 text-blue-200' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        {permit.schoolYear}{permit.permitNumber ? ` · ${permit.permitNumber}` : ''}
                      </span>
                    ))}
                    {school.governmentPermits.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-slate-400">
                        +{school.governmentPermits.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
