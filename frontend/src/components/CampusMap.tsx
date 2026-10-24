'use client';
import React from 'react';
import { Building2, AlertTriangle, Flame, CheckCircle2 } from 'lucide-react';

interface CampusMapProps {
  tickets: any[];
  campusConfig?: any;
  onSelectBuilding?: (buildingName: string) => void;
  selectedBuilding?: string | null;
}

export const CampusMap: React.FC<CampusMapProps> = ({ 
  tickets, 
  campusConfig,
  onSelectBuilding, 
  selectedBuilding 
}) => {
  const buildings: string[] = campusConfig?.buildings || [
    'Hostel Block A',
    'Hostel Block B',
    'Girls Hostel Block C',
    'Dining Hall & Mess',
    'Student Health Center',
    'Academic Block 1',
    'Central Library',
    'Sports Complex & Grounds',
    'Main Admin & Security Gate'
  ];

  const campusName = campusConfig?.campus_name || 'Campus Infrastructure Grid';

  const getTicketsForBuilding = (buildingName: string) => {
    return tickets.filter(t => {
      const b = (t.building || '').toLowerCase();
      const n = buildingName.toLowerCase();
      return b.includes(n) || n.includes(b);
    });
  };

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            {campusName} — Geofenced Sector Map
          </h3>
          <p className="text-xs text-slate-400">Click any sector to filter issues or view real-time GPS incidents</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-rose-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span> Active SOS
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Critical/High
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Normal
          </span>
        </div>
      </div>

      {/* Dynamic Grid Layout of Campus Buildings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {buildings.map((bName, idx) => {
          const bTickets = getTicketsForBuilding(bName);
          const hasEmergency = bTickets.some(t => t.type === 'emergency' && t.status !== 'closed' && t.status !== 'resolved');
          const hasHigh = bTickets.some(t => t.severity === 'critical' || t.severity === 'high');
          const isSelected = selectedBuilding?.toLowerCase() === bName.toLowerCase();

          return (
            <div
              key={idx}
              onClick={() => onSelectBuilding && onSelectBuilding(isSelected ? '' : bName)}
              className={`relative cursor-pointer transition-all duration-300 rounded-2xl p-4 border flex flex-col justify-between min-h-[110px] ${
                isSelected
                  ? 'bg-slate-800 border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.02] shadow-xl'
                  : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
              } ${hasEmergency ? 'ring-2 ring-rose-500 shadow-lg shadow-rose-950/60 bg-rose-950/20' : ''}`}
            >
              {hasEmergency && (
                <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 text-[10px] text-white font-bold items-center justify-center">
                    !
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{bName}</span>
                </span>
                {bTickets.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono shrink-0 ${
                    hasEmergency 
                      ? 'bg-rose-500 text-white' 
                      : hasHigh 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {bTickets.length}
                  </span>
                )}
              </div>

              <div className="pt-2 text-[10px] flex items-center justify-between text-slate-400 border-t border-slate-800/80 mt-2">
                {hasEmergency ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-rose-500" /> SOS ACTIVE
                  </span>
                ) : bTickets.length === 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All Clear
                  </span>
                ) : (
                  <span className="text-slate-300">{bTickets.length} active issues</span>
                )}
                <span className="text-slate-500 font-mono">SEC-{idx + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
