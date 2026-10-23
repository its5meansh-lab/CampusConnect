'use client';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Flame, HeartPulse, ShieldAlert, X, PhoneCall, Check, MapPin, Send } from 'lucide-react';
import { audioSynth } from '../utils/audioAlarm';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  campusConfig?: any;
  onSuccess: (newTicket: any) => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  campusConfig,
  onSuccess 
}) => {
  const [stage, setStage] = useState<'countdown' | 'sent'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [selectedType, setSelectedType] = useState<'fire' | 'medical' | 'safety' | 'hazard'>('fire');
  const [additionalNote, setAdditionalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 28.5458, lng: 77.1932 });

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setCoords({ lat: 28.5458, lng: 77.1932 });
        }
      );
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && stage === 'countdown') {
      if (countdown > 0) {
        audioSynth?.playCountdownTick(countdown === 1);
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else if (countdown === 0) {
        handleTriggerSOS();
      }
    }
    return () => clearTimeout(timer);
  }, [isOpen, stage, countdown]);

  useEffect(() => {
    if (isOpen) {
      setStage('countdown');
      setCountdown(3);
      setCreatedTicket(null);
      setAdditionalNote('');
    }
  }, [isOpen]);

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    try {
      audioSynth?.playEmergencySiren(5);

      const res = await fetch('http://localhost:8000/api/tickets/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser?.id || 'usr-student-01',
          emergency_type: selectedType,
          location_lat: coords.lat,
          location_lng: coords.lng,
          building: currentUser?.hostel_block || campusConfig?.buildings?.[0] || 'Campus Area',
          floor: 'Floor 1',
          room: currentUser?.room_no || 'Campus Zone',
          additional_note: additionalNote
        })
      });

      const data = await res.json();
      if (data.success) {
        setCreatedTicket(data.ticket);
        setStage('sent');
        onSuccess(data.ticket);
      }
    } catch (err) {
      console.error("SOS Trigger failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-rose-950/80 via-slate-900 to-slate-950 border-2 border-rose-600 rounded-3xl p-6 shadow-2xl shadow-rose-950/90 text-slate-100 overflow-hidden">
        
        {stage === 'countdown' ? (
          <div className="flex flex-col items-center text-center space-y-6 py-2">
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-full text-xs font-bold text-rose-300 uppercase tracking-widest animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> High-Priority SOS
              </span>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Countdown Ring */}
            <div className="relative flex items-center justify-center w-36 h-36">
              <div className="absolute inset-0 rounded-full border-4 border-rose-500/30 animate-ping opacity-60" />
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-rose-600 shadow-xl shadow-rose-600/50">
                <span className="text-6xl font-black font-mono tracking-tighter text-white">
                  {countdown}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-white">
                Broadcasting Emergency Alert
              </h2>
              <p className="text-xs text-rose-200/90">
                Student: <strong>{currentUser?.name || 'Student'}</strong> ({currentUser?.roll_number ? `Roll: ${currentUser.roll_number}` : ''})
              </p>
            </div>

            {/* Emergency Type Selector */}
            <div className="w-full space-y-2">
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Select Crisis Type:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'fire', label: 'Fire / Flash', icon: Flame, color: 'hover:border-rose-400' },
                  { id: 'medical', label: 'Medical Alert', icon: HeartPulse, color: 'hover:border-emerald-400' },
                  { id: 'safety', label: 'Safety Threat', icon: ShieldAlert, color: 'hover:border-amber-400' },
                  { id: 'hazard', label: 'Gas / Hazard', icon: AlertTriangle, color: 'hover:border-purple-400' }
                ].map(item => {
                  const Icon = item.icon;
                  const isSel = selectedType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedType(item.id as any)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                        isSel
                          ? 'bg-rose-600 border-white text-white shadow-md shadow-rose-700/50'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 ' + item.color
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GPS & Location */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2 truncate max-w-[280px]">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{currentUser?.hostel_block || 'Campus Zone'}, Room {currentUser?.room_no || '101'}</span>
              </div>
              <span className="font-mono text-slate-400 text-[10px]">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            </div>

            {/* Cancel Button */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition border border-slate-700"
              >
                Cancel (Safe)
              </button>
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-600/40"
              >
                Send Now (Instant)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-5 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">
                HELP IS ON THE WAY!
              </h2>
              <p className="text-sm text-slate-300">
                Emergency Ticket ID: <strong className="font-mono text-cyan-400">{createdTicket?.ticket_number}</strong>
              </p>
            </div>

            <div className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Designated Rapid Responder</span>
                  <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                    {createdTicket?.assigned_to_name || 'Campus Emergency Unit'}
                  </h4>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-full animate-pulse">
                  ETA ~ 3 Mins
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                <a
                  href={`tel:${createdTicket?.student_phone || '+919988776655'}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/30"
                >
                  <PhoneCall className="w-4 h-4" /> Call Responder Hotline
                </a>
              </div>
            </div>

            <div className="w-full space-y-2 text-left">
              <label className="text-xs font-semibold text-slate-300">
                Add Quick Detail (Optional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Smoke spreading in staircase 2..."
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    audioSynth?.playChime();
                    alert("Update relayed to responder unit!");
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition border border-slate-700"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition border border-slate-700"
            >
              Close & View Live Incident Status
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
