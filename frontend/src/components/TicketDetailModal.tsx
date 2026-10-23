'use client';
import React, { useState } from 'react';
import { 
  X, AlertTriangle, Flame, ShieldAlert, CheckCircle2, Clock, 
  MapPin, User, Phone, MessageSquare, Star, ArrowUpRight, 
  Sparkles, Check, RotateCcw, AlertCircle, Volume2 
} from 'lucide-react';
import { audioSynth } from '../utils/audioAlarm';

interface TicketDetailModalProps {
  ticket: any;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onTicketUpdated: (updatedTicket: any) => void;
  onOpenChat: (ticket: any) => void;
}

const LIFECYCLE_STEPS = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'verified', label: 'Verified' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' }
];

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  currentUser,
  onTicketUpdated,
  onOpenChat
}) => {
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !ticket) return null;

  const getStepIndex = (status: string) => {
    const idx = LIFECYCLE_STEPS.findIndex(s => s.id === status);
    return idx === -1 ? 0 : idx;
  };

  const currentStepIdx = getStepIndex(ticket.status);

  // Status transitions
  const handleStatusChange = async (newStatus: string, note?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updated_by_name: currentUser?.name || 'Staff Member',
          note: note || `Updated status to ${newStatus}`
        })
      });
      const data = await res.json();
      if (data.success) {
        audioSynth?.playChime();
        onTicketUpdated(data.ticket);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Warden review approval/rejection
  const handleWardenReview = async (decision: 'approve' | 'reject_fake') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewer_name: currentUser?.name || 'Prof. Ramesh Patel (Warden)',
          reviewer_note: decision === 'approve' ? 'Verified genuine by physical check' : 'Confirmed false/spam report'
        })
      });
      const data = await res.json();
      if (data.success) {
        audioSynth?.playChime();
        onTicketUpdated(data.ticket);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Escalation
  const handleEscalate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id}/escalate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        audioSynth?.playEmergencySiren(2);
        onTicketUpdated(data.ticket);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Student Feedback & Closure
  const handleFeedbackSubmit = async (reopen = false) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: feedbackComment || (reopen ? 'Issue not resolved, reopening' : 'Great work!'),
          reopen
        })
      });
      const data = await res.json();
      if (data.success) {
        audioSynth?.playChime();
        setShowRatingModal(false);
        onTicketUpdated(data.ticket);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmergency = ticket.type === 'emergency';
  const role = currentUser?.role || 'student';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 my-8 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
              isEmergency ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-indigo-400 border border-slate-700'
            }`}>
              {ticket.ticket_number}
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {isEmergency && <Flame className="w-5 h-5 text-rose-500" />}
              {ticket.subcategory || ticket.category}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-mono">
              Priority: <strong className="text-amber-400">{ticket.priority_score}/100</strong>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 6-Stage Visual Progress Timeline */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Progress Lifecycle</span>
            <span className="font-mono text-cyan-400">
              SLA Target: {ticket.sla_hours < 1 ? `${Math.round(ticket.sla_hours * 60)} mins` : `${ticket.sla_hours} hours`}
            </span>
          </div>

          <div className="relative flex items-center justify-between w-full">
            {/* Connecting Bar */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${(currentStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100}%` }}
            />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isPast
                      ? 'bg-indigo-600 text-white'
                      : isCurrent
                        ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                    isCurrent ? 'text-cyan-300 font-bold' : isPast ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Details + AI & Staff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Left Column: Complaint Data */}
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Incident Details</h4>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>

              {/* Location Badge */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>{ticket.building}</strong>, {ticket.floor}, {ticket.room}
                </span>
              </div>

              {/* Audio Voice Note playback if exists */}
              {ticket.audio_url && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> Voice Note Attached:
                  </span>
                  <audio src={ticket.audio_url} controls className="w-full h-8" />
                </div>
              )}

              {/* Photo Proof if exists */}
              {ticket.image_url && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Photo Proof:</span>
                  <img src={ticket.image_url} alt="Proof" className="w-full max-h-48 object-cover rounded-xl border border-slate-800" />
                </div>
              )}
            </div>

            {/* Student Info Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-100">{ticket.student_name}</h5>
                  <p className="text-slate-400 text-[11px]">{ticket.student_phone} • {ticket.student_block}</p>
                </div>
              </div>
              <a
                href={`tel:${ticket.student_phone}`}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition border border-slate-700"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Column: AI Analysis & Staff Assignment */}
          <div className="space-y-4">
            
            {/* AI Insights Card */}
            <div className="bg-slate-950 border border-indigo-950/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> CampusConnect AI Engine
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  ticket.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  ticket.severity === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  Severity: {ticket.severity}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Department</span>
                  <p className="font-bold text-slate-200 truncate">{ticket.assigned_to_dept || 'General Facilities'}</p>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400">Fake/Spam Score</span>
                  <p className={`font-bold ${ticket.fake_score > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {ticket.fake_score || 0}% {ticket.fake_score > 30 ? '⚠️ High Risk' : '✓ Verified'}
                  </p>
                </div>
              </div>

              {/* If flagged for Warden */}
              {ticket.is_flagged && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Flagged for Warden Human Review
                  </div>
                  <p className="text-[11px] text-amber-200/80">{ticket.flag_reason || 'Anomalous submission flagged by safety rules.'}</p>
                </div>
              )}
            </div>

            {/* Assigned Staff Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">Assigned Technician</span>
                  <h5 className="text-sm font-bold text-slate-100">
                    {ticket.assigned_to_name || 'Unassigned (Awaiting Dispatch)'}
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChat(ticket)}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Live Chat
                </button>
              </div>

              {/* Escalation Level if > 0 */}
              {ticket.escalation_level > 0 && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                  <span>🚨 Escalation Tier {ticket.escalation_level} Active</span>
                  <span className="font-mono text-[10px]">Supervisor Notified</span>
                </div>
              )}
            </div>

            {/* Updates History */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-36 overflow-y-auto">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Timeline Updates</h5>
              <div className="space-y-2 text-xs">
                {(ticket.updates || []).map((upd: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300 border-l border-indigo-500/30 pl-2">
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">{upd.time}</span>
                    <p className="text-[11px]">
                      <strong className="text-slate-200">{upd.by}:</strong> {upd.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Actions based on Role */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Staff Actions */}
          {(role === 'staff' || role === 'admin') && ticket.status !== 'closed' && (
            <div className="flex flex-wrap gap-2">
              {ticket.status === 'assigned' && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusChange('in_progress', 'Technician on-site, beginning work')}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30"
                >
                  Start Work (In Progress)
                </button>
              )}
              {ticket.status === 'in_progress' && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusChange('resolved', 'Work completed and tested by technician')}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                </button>
              )}
            </div>
          )}

          {/* Warden Review Actions for Flagged Tickets */}
          {(role === 'warden' || role === 'admin') && ticket.is_flagged && (
            <div className="flex gap-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleWardenReview('approve')}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Approve (Genuine)
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleWardenReview('reject_fake')}
                className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
              >
                Reject (Spam / Deduct Trust)
              </button>
            </div>
          )}

          {/* Escalation button for Warden / Admin */}
          {(role === 'warden' || role === 'admin' || isEmergency) && ticket.status !== 'closed' && (
            <button
              disabled={isSubmitting}
              onClick={handleEscalate}
              className="py-2 px-3 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Escalate Issue
            </button>
          )}

          {/* Student Actions */}
          {role === 'student' && ticket.status === 'resolved' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowRatingModal(true)}
                className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirm Fix & Rate
              </button>
              <button
                onClick={() => handleFeedbackSubmit(true)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reopen Ticket
              </button>
            </div>
          )}

          {ticket.status === 'closed' && (
            <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Closed & Verified (Student Rating: {ticket.feedback?.rating || 5}★)
            </div>
          )}
        </div>

        {/* 5-Star Feedback Modal overlay */}
        {showRatingModal && (
          <div className="absolute inset-0 bg-slate-900/95 rounded-3xl p-6 z-30 flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Rate the Resolution</h3>
            <p className="text-xs text-slate-400">How satisfied are you with the technician's fix?</p>

            <div className="flex gap-2 text-2xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition-transform ${star <= rating ? 'text-amber-400 scale-110' : 'text-slate-700'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Leave optional praise or feedback for the technician..."
              className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="py-2 px-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFeedbackSubmit(false)}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30"
              >
                Submit Feedback & Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
