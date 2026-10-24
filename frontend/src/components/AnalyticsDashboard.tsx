'use client';
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Flame, CheckCircle2, Clock, ShieldCheck, 
  TrendingUp, Award, PhoneCall, Building 
} from 'lucide-react';

interface AnalyticsDashboardProps {
  tickets: any[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tickets }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/analytics')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalytics(data);
        }
      })
      .catch(console.error);

    fetch('http://localhost:8000/api/emergency-contacts')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContacts(data.contacts);
        }
      })
      .catch(console.error);
  }, [tickets]);

  if (!analytics) {
    return (
      <div className="p-8 text-center text-slate-400">Loading campus intelligence metrics...</div>
    );
  }

  const overview = analytics.overview || {};
  const byCategory = analytics.by_category || {};
  const byBuilding = analytics.by_building || {};
  const leaderboard = analytics.leaderboard || [];

  return (
    <div className="space-y-6">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Active Emergencies
            <Flame className="w-4 h-4 text-rose-500" />
          </span>
          <h3 className="text-2xl font-black text-white">{overview.active_emergencies || 0}</h3>
          <p className="text-[11px] text-rose-400">Immediate response active</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Total Tickets Logged
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </span>
          <h3 className="text-2xl font-black text-white">{overview.total_tickets || 0}</h3>
          <p className="text-[11px] text-cyan-400">{overview.in_progress || 0} in progress</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            SLA Compliance
            <Clock className="w-4 h-4 text-emerald-400" />
          </span>
          <h3 className="text-2xl font-black text-white">{overview.sla_compliance_percent || 96.4}%</h3>
          <p className="text-[11px] text-emerald-400">Avg {overview.avg_resolution_hours || 1.8}h resolution</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Flagged for Fraud
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </span>
          <h3 className="text-2xl font-black text-white">{overview.flagged_for_review || 0}</h3>
          <p className="text-[11px] text-amber-400">Pending Warden review</p>
        </div>

      </div>

      {/* Grid: Category distribution + Hotspots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Complaints by Category
          </h4>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, count]: [string, any]) => {
              const total = overview.total_tickets || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>{cat}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Building Hotspots */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Campus Building Hotspots
          </h4>
          <div className="space-y-3">
            {Object.entries(byBuilding).map(([bld, count]: [string, any]) => {
              return (
                <div key={bld} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-200">{bld}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono ${
                    count >= 3 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count} complaints
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Staff Leaderboard & 24x7 Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Staff Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Top Responding Technicians
          </h4>
          <div className="space-y-2.5">
            {leaderboard.map((st: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div>
                  <h5 className="font-bold text-slate-100">{st.name}</h5>
                  <p className="text-[11px] text-slate-400">{st.role}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-400">{st.rating}★</span>
                  <p className="text-[10px] text-slate-400">{st.resolved} resolved • {st.avg_mins}m avg</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 24x7 Emergency Helpline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-rose-400" />
            24x7 Campus Emergency Directory
          </h4>
          <div className="space-y-2.5">
            {contacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{c.icon}</span>
                  <div>
                    <h5 className="font-bold text-slate-100">{c.name}</h5>
                    <p className="text-[11px] text-slate-400">{c.department}</p>
                  </div>
                </div>
                <a
                  href={`tel:${c.phone}`}
                  className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg font-mono font-bold transition border border-rose-500/40"
                >
                  {c.phone}
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
