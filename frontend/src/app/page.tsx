'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, Flame, ShieldAlert, Sparkles, Building2, 
  MapPin, Phone, MessageSquare, Plus, Bell, CheckCircle2, 
  Clock, Volume2, VolumeX, ShieldCheck, User, Wrench, 
  Settings2, LogOut, Radio, Check, ChevronRight, GraduationCap,
  Inbox, Users, Filter, Sun, Moon
} from 'lucide-react';

import { audioSynth } from '../utils/audioAlarm';
import { CampusMap } from '../components/CampusMap';
import { SOSModal } from '../components/SOSModal';
import { ComplaintModal } from '../components/ComplaintModal';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { ChatDrawer } from '../components/ChatDrawer';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { AnnouncementsModal } from '../components/AnnouncementsModal';
import { AuthModal } from '../components/AuthModal';
import { CampusConfigModal } from '../components/CampusConfigModal';
import { AdminManagementModal } from '../components/AdminManagementModal';

export default function Home() {
  // Theme & User States
  const [darkMode, setDarkMode] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [campusConfig, setCampusConfig] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'map' | 'analytics'>('tickets');
  const [staffFilter, setStaffFilter] = useState<'all' | 'emergency' | 'high' | 'medium' | 'low' | 'resolved'>('all');
  const [studentFilter, setStudentFilter] = useState<'active' | 'resolved' | 'all'>('active');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [chatTicket, setChatTicket] = useState<any>(null);

  const [staffOnDuty, setStaffOnDuty] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Sync theme with body class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [darkMode]);

  // 1. Fetch Config & Tickets
  const fetchCampusConfig = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/campus/config');
      const data = await res.json();
      if (data.success && data.config) {
        setCampusConfig(data.config);
      }
    } catch (e) {
      console.warn("Could not fetch campus config:", e);
    }
  };

  const fetchTickets = async (user = currentUser) => {
    try {
      let url = 'http://localhost:8000/api/tickets';
      if (user?.role === 'staff' && user?.id) {
        url += `?role=staff&user_id=${user.id}`;
      } else if (user?.role === 'student' && user?.id) {
        url += `?role=student&user_id=${user.id}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.warn("Could not fetch tickets:", e);
    }
  };

  useEffect(() => {
    fetchCampusConfig();

    const savedUser = localStorage.getItem('campus_connect_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        fetchTickets(u);
      } catch (e) {
        setIsAuthOpen(true);
      }
    } else {
      setIsAuthOpen(true);
      fetchTickets();
    }
  }, []);

  // 2. Real-Time WebSocket Connection
  useEffect(() => {
    let ws: WebSocket;
    const connectWS = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws');
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'EMERGENCY_SOS') {
              if (!alarmMuted) {
                audioSynth?.playEmergencySiren(5);
              }
              setTickets(prev => [payload.data, ...prev.filter(t => t.id !== payload.data.id)]);
            } else if (payload.type === 'TICKET_CREATED') {
              audioSynth?.playComplaintSuccess();
              const isEmergency = payload.data?.type === 'emergency';
              const isMyDept = currentUser?.role === 'staff' && (
                payload.data?.assigned_to_dept?.toLowerCase() === currentUser?.department?.toLowerCase() ||
                currentUser?.department?.toLowerCase().includes(payload.data?.assigned_to_dept?.toLowerCase())
              );

              if (currentUser?.role !== 'staff' || isEmergency || isMyDept) {
                setTickets(prev => [payload.data, ...prev.filter(t => t.id !== payload.data.id)]);
              }
            } else if (payload.type === 'TICKET_UPDATED' || payload.type === 'ESCALATION_TRIGGER') {
              audioSynth?.playChime();
              setTickets(prev => prev.map(t => t.id === payload.data.id ? payload.data : t));
              if (selectedTicket?.id === payload.data.id) {
                setSelectedTicket(payload.data);
              }
            } else if (payload.type === 'TICKETS_RESET') {
              setTickets([]);
              setSelectedTicket(null);
            } else if (payload.type === 'STUDENT_STATUS_CHANGED') {
              if (currentUser?.id === payload.data.id) {
                setCurrentUser(payload.data);
                localStorage.setItem('campus_connect_user', JSON.stringify(payload.data));
              }
            }
          } catch (err) {
            console.error("WS message parse error:", err);
          }
        };

        ws.onclose = () => {
          setTimeout(connectWS, 3000);
        };
      } catch (e) {
        console.warn("WS connection failed:", e);
      }
    };

    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [alarmMuted, selectedTicket?.id, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('campus_connect_user');
    setCurrentUser(null);
    setIsAuthOpen(true);
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    fetchTickets(user);
  };

  const activeEmergencies = tickets.filter(t => t.type === 'emergency' && t.status !== 'closed' && t.status !== 'resolved');
  const flaggedTickets = tickets.filter(t => t.is_flagged && t.status !== 'closed');

  const getDisplayTickets = () => {
    let list = [...tickets];

    if (selectedBuilding) {
      list = list.filter(t => (t.building || '').toLowerCase().includes(selectedBuilding.toLowerCase()));
    }

    if (currentUser?.role === 'student') {
      if (studentFilter === 'active') {
        list = list.filter(t => t.status !== 'closed' && t.status !== 'resolved');
      } else if (studentFilter === 'resolved') {
        list = list.filter(t => t.status === 'resolved' || t.status === 'closed');
      }
      return list;
    }

    if (currentUser?.role === 'staff') {
      if (staffFilter === 'emergency') {
        return list.filter(t => t.type === 'emergency');
      } else if (staffFilter === 'high') {
        return list.filter(t => t.severity === 'critical' || t.severity === 'high');
      } else if (staffFilter === 'medium') {
        return list.filter(t => t.severity === 'medium');
      } else if (staffFilter === 'low') {
        return list.filter(t => t.severity === 'low');
      } else if (staffFilter === 'resolved') {
        return list.filter(t => t.status === 'resolved' || t.status === 'closed');
      }
      return list;
    }

    return list;
  };

  const displayTickets = getDisplayTickets();
  const isAdmin = currentUser?.role === 'admin';

  // Dynamic calm classes
  const themeCardBg = darkMode ? 'bg-[#0c1836] border-[#1b305b]' : 'bg-white border-[#cbd8e8] shadow-sm';
  const themeCardSubtle = darkMode ? 'bg-[#081229] border-[#182b52]' : 'bg-[#f4f7fb] border-[#d8e3f0]';
  const themeTextMain = darkMode ? 'text-white' : 'text-[#0a1835]';
  const themeTextMuted = darkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${darkMode ? 'bg-[#060d1f] text-slate-100' : 'bg-[#f4f7fb] text-[#0a1835]'}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* CALM TOP NAVIGATION                                           */}
      {/* ------------------------------------------------------------- */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        darkMode ? 'bg-[#08132b]/90 border-[#1b305b]' : 'bg-white/90 border-[#cbd8e8] shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Campus Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 p-0.5 flex items-center justify-center shadow-md">
              <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${darkMode ? 'bg-[#070e20]' : 'bg-white'}`}>
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base font-bold tracking-tight ${themeTextMain}`}>Campus Connect</h1>
                <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  darkMode ? 'bg-blue-950/40 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  {campusConfig?.campus_name || 'Campus Portal'}
                </span>
              </div>
              <p className={`text-[10px] ${themeTextMuted} hidden sm:block`}>Helpdesk & Emergency Response</p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* Dark / Light Mode Switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                darkMode ? 'bg-[#0c1836] border-[#1b305b] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Blue Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-700" />}
            </button>

            {/* Siren Audio Toggle */}
            <button
              onClick={() => {
                setAlarmMuted(!alarmMuted);
                if (alarmMuted) audioSynth?.playChime();
              }}
              title={alarmMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
              className={`p-2 rounded-xl border transition ${
                alarmMuted
                  ? (darkMode ? 'bg-[#0c1836] border-[#1b305b] text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400')
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {alarmMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Announcements */}
            <button
              onClick={() => setIsAnnouncementsOpen(true)}
              className={`p-2 rounded-xl border transition ${
                darkMode ? 'bg-[#0c1836] border-[#1b305b] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Campus Announcements"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* ADMIN ONLY BUTTONS (Campus Customizer & Admin Console) */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setIsAdminConsoleOpen(true)}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-xs flex items-center gap-1.5 shadow-sm"
                  title="Admin Staff & Student Console"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Admin Console</span>
                </button>

                <button
                  onClick={() => setIsConfigOpen(true)}
                  className={`p-2 rounded-xl border transition ${
                    darkMode ? 'bg-[#0c1836] border-[#1b305b] text-cyan-300 hover:text-white' : 'bg-white border-slate-300 text-blue-600 hover:bg-slate-50'
                  }`}
                  title="Campus Settings (Admin Only)"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </>
            )}

            {/* User Profile Pill */}
            {currentUser ? (
              <div className={`flex items-center gap-2 p-1.5 px-3 rounded-2xl border text-xs ${
                darkMode ? 'bg-[#08132b] border-[#1b305b]' : 'bg-white border-slate-300 shadow-sm'
              }`}>
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  {currentUser.role === 'student' ? <GraduationCap className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block text-left">
                  <span className={`font-semibold block leading-tight truncate max-w-[130px] ${themeTextMain}`}>
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] font-mono ${themeTextMuted}`}>
                    {currentUser.role === 'student' ? `Roll: ${currentUser.roll_number || 'STU'}` : currentUser.department}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-1 p-1 text-slate-400 hover:text-rose-400 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
              >
                Sign In
              </button>
            )}

          </div>

        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE EMERGENCY NOTIFICATION (Clean & Calm Warning)          */}
      {/* ------------------------------------------------------------- */}
      {activeEmergencies.length > 0 && (
        <div className="bg-rose-950/80 border-b border-rose-600/70 px-4 py-2.5 text-white shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
              <Flame className="w-4 h-4 text-rose-300 shrink-0" />
              <span>
                <strong>Active Emergency:</strong> {activeEmergencies[0].subcategory} in {activeEmergencies[0].building}, {activeEmergencies[0].room}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTicket(activeEmergencies[0])}
                className="px-3 py-1 bg-white text-rose-950 font-bold rounded-lg hover:bg-rose-100 transition"
              >
                View Incident
              </button>
              <button
                onClick={() => setChatTicket(activeEmergencies[0])}
                className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg transition"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN BODY                                                     */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* ========================================================= */}
        {/* 1. STUDENT VIEW                                           */}
        {/* ========================================================= */}
        {currentUser?.role === 'student' && (
          <div className="space-y-6">
            
            {/* Student Blocked Banner if applicable */}
            {currentUser?.is_blocked && (
              <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>Your account is restricted from filing maintenance complaints. Emergency SOS remains active.</span>
                </div>
                <span className="font-semibold text-rose-400">Account Restricted</span>
              </div>
            )}

            {/* Calm Dual Action Section: SOS & Report Issue */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Emergency SOS Card */}
              <div className={`p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden transition ${
                darkMode ? 'bg-[#0f1b38] border-rose-500/40' : 'bg-white border-rose-200 shadow-sm'
              }`}>
                <div className="space-y-1 z-10">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Emergency Response
                  </span>
                  <h3 className={`text-xl font-bold ${themeTextMain}`}>1-Tap SOS Alert</h3>
                  <p className={`text-xs ${themeTextMuted} leading-relaxed`}>
                    Instantly alerts on-duty campus medical, fire, or security personnel with your live GPS location.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between z-10">
                  <button
                    onClick={() => setIsSOSOpen(true)}
                    className="py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs calm-sos-pulse transition flex items-center gap-2 shadow-lg shadow-rose-900/30"
                  >
                    <Flame className="w-4 h-4" /> Trigger Emergency SOS
                  </button>
                  <span className={`text-[10px] font-mono ${themeTextMuted}`}>3s safety cancel</span>
                </div>
              </div>

              {/* Maintenance Report Card */}
              <div className={`md:col-span-2 p-6 rounded-3xl border flex flex-col justify-between ${themeCardBg}`}>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Campus Facilities
                  </span>
                  <h3 className={`text-xl font-bold ${themeTextMain}`}>Report a Maintenance Issue</h3>
                  <p className={`text-xs ${themeTextMuted} leading-relaxed`}>
                    Have an issue with electricity, plumbing, Wi-Fi, room cleanliness, or student health? Submit a report with voice notes and photos.
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className={`flex items-center gap-3 text-xs ${themeTextMuted}`}>
                    <span>⚡ Electricity</span>
                    <span>•</span>
                    <span>💧 Plumbing</span>
                    <span>•</span>
                    <span>📶 Wi-Fi</span>
                    <span>•</span>
                    <span>🩺 Health</span>
                  </div>
                  <button
                    disabled={currentUser?.is_blocked}
                    onClick={() => setIsComplaintOpen(true)}
                    className={`py-3 px-6 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                      currentUser?.is_blocked
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-700/20'
                    }`}
                  >
                    <Plus className="w-4 h-4" /> File New Report
                  </button>
                </div>
              </div>

            </div>

            {/* Campus Map */}
            <CampusMap
              tickets={tickets}
              campusConfig={campusConfig}
              onSelectBuilding={(bld) => setSelectedBuilding(bld || null)}
              selectedBuilding={selectedBuilding}
            />

            {/* Student Tickets List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className={`text-base font-bold ${themeTextMain}`}>My Complaint History</h3>
                  {selectedBuilding && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/40">
                      Sector: {selectedBuilding}
                      <button onClick={() => setSelectedBuilding(null)} className="ml-1.5 font-bold">✕</button>
                    </span>
                  )}
                </div>

                <div className={`flex p-1 rounded-xl border text-xs ${themeCardSubtle}`}>
                  <button
                    onClick={() => setStudentFilter('active')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      studentFilter === 'active' ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStudentFilter('resolved')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      studentFilter === 'resolved' ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                    }`}
                  >
                    Resolved
                  </button>
                  <button
                    onClick={() => setStudentFilter('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      studentFilter === 'all' ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>

              {displayTickets.length === 0 ? (
                <div className={`p-8 rounded-3xl border text-center space-y-2 ${themeCardBg}`}>
                  <Inbox className="w-8 h-8 mx-auto text-slate-500" />
                  <p className={`text-sm font-semibold ${themeTextMain}`}>No complaints found</p>
                  <p className={`text-xs ${themeTextMuted}`}>Your campus room has no pending issues.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayTickets.map((t) => {
                    const isEmg = t.type === 'emergency';
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`cursor-pointer group p-5 rounded-3xl border transition-all duration-200 space-y-3 ${themeCardBg} hover:border-blue-500/60 ${
                          isEmg ? 'border-rose-500/70 ring-1 ring-rose-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                            isEmg ? 'bg-rose-600 text-white' : 'bg-blue-950/40 text-blue-300 border border-blue-500/30'
                          }`}>
                            {t.ticket_number}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            t.status === 'resolved' || t.status === 'closed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'in_progress'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div>
                          <h4 className={`text-sm font-bold truncate group-hover:text-blue-400 transition flex items-center gap-1.5 ${themeTextMain}`}>
                            {isEmg && <Flame className="w-4 h-4 text-rose-500 shrink-0" />}
                            {t.subcategory || t.category}
                          </h4>
                          <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${themeTextMuted}`}>
                            {t.description}
                          </p>
                        </div>

                        <div className={`pt-2 border-t text-[11px] flex items-center justify-between ${
                          darkMode ? 'border-[#1b305b]' : 'border-slate-200'
                        } ${themeTextMuted}`}>
                          <span className="flex items-center gap-1 truncate max-w-[170px]">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            {t.building}, {t.room}
                          </span>
                          <span className="font-semibold text-blue-400">
                            Dept: {t.assigned_to_dept || 'General'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* 2. STAFF / TECHNICIAN VIEW (Isolated by Department)       */}
        {/* ========================================================= */}
        {currentUser?.role === 'staff' && (
          <div className="space-y-6">
            
            {/* Staff Department Identity Card */}
            <div className={`p-6 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${themeCardBg}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${themeTextMain}`}>
                    {currentUser.name}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold">
                      {currentUser.department}
                    </span>
                  </h3>
                  <p className={`text-xs ${themeTextMuted}`}>
                    Department Staff ID: <code className="text-blue-400 font-bold">{currentUser.staff_id || 'STF'}</code> • Campus: {campusConfig?.campus_name || 'My Campus'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStaffOnDuty(!staffOnDuty)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    staffOnDuty
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${staffOnDuty ? 'bg-white' : 'bg-slate-400'}`} />
                  {staffOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                </button>
              </div>
            </div>

            {/* Department Isolation Banner */}
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
              darkMode ? 'bg-[#091533] border-[#1b305b] text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-cyan-400" />
                <span>
                  <strong>Department View:</strong> Showing tickets routed to <strong>{currentUser.department}</strong> and emergency alerts.
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold">{displayTickets.length} active tasks</span>
            </div>

            {/* Priority Queue Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-bold ${themeTextMain}`}>Assigned Work Queue</h3>
                  <p className={`text-xs ${themeTextMuted}`}>Priority sorted: Emergencies ➔ Critical ➔ Routine</p>
                </div>

                <div className={`flex flex-wrap gap-1 p-1 rounded-xl border text-xs ${themeCardSubtle}`}>
                  {[
                    { id: 'all', label: 'All Tasks' },
                    { id: 'emergency', label: '🚨 Emergencies' },
                    { id: 'high', label: 'High Priority' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'resolved', label: 'Resolved' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStaffFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                        staffFilter === tab.id ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {displayTickets.length === 0 ? (
                <div className={`p-8 rounded-3xl border text-center space-y-2 ${themeCardBg}`}>
                  <Inbox className="w-8 h-8 mx-auto text-slate-500" />
                  <p className={`text-sm font-semibold ${themeTextMain}`}>Department queue is clear</p>
                  <p className={`text-xs ${themeTextMuted}`}>No pending tickets for {currentUser.department}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayTickets.map((t) => {
                    const isEmg = t.type === 'emergency';
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`cursor-pointer p-4 rounded-3xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${themeCardBg} hover:border-blue-500/60 ${
                          isEmg ? 'border-rose-500/60 bg-rose-950/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl border shrink-0 ${themeCardSubtle}`}>
                            <span className="text-[9px] uppercase font-mono text-slate-400">Score</span>
                            <span className={`text-sm font-bold font-mono ${isEmg ? 'text-rose-400' : 'text-blue-400'}`}>
                              {t.priority_score}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-blue-400">{t.ticket_number}</span>
                              <h4 className={`text-sm font-bold flex items-center gap-1.5 ${themeTextMain}`}>
                                {isEmg && <Flame className="w-4 h-4 text-rose-500" />}
                                {t.subcategory || t.category}
                              </h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                t.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' :
                                t.severity === 'high' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/40 text-slate-300'
                              }`}>
                                {t.severity}
                              </span>
                            </div>

                            <p className={`text-xs line-clamp-1 max-w-xl ${themeTextMuted}`}>{t.description}</p>
                            
                            <div className={`flex flex-wrap items-center gap-3 text-[11px] pt-1 ${themeTextMuted}`}>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                {t.building}, {t.room}
                              </span>
                              <span>•</span>
                              <span>Student: <strong>{t.student_name}</strong></span>
                              <span>•</span>
                              <span>Target: {t.sla_hours}h</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatTicket(t);
                            }}
                            className={`p-2.5 rounded-xl border transition ${themeCardSubtle} text-blue-400 hover:text-white`}
                            title="Chat with Student"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(t);
                            }}
                            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                          >
                            Manage <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <CampusMap tickets={tickets} campusConfig={campusConfig} />

          </div>
        )}

        {/* ========================================================= */}
        {/* 3. WARDEN & ADMIN VIEW                                    */}
        {/* ========================================================= */}
        {(currentUser?.role === 'warden' || currentUser?.role === 'admin') && (
          <div className="space-y-6">
            
            <div className={`p-5 rounded-3xl border flex items-center justify-between ${themeCardBg}`}>
              <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${themeTextMain}`}>
                  <ShieldAlert className="w-5 h-5 text-blue-400" />
                  {currentUser.role === 'warden' ? 'Hostel Warden Overview' : 'Campus Operations Authority'}
                </h2>
                <p className={`text-xs ${themeTextMuted}`}>
                  Campus: {campusConfig?.campus_name || 'My Campus'} • Incident oversight & staff dispatch
                </p>
              </div>

              <div className={`flex p-1 rounded-xl border text-xs ${themeCardSubtle}`}>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeTab === 'tickets' ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                  }`}
                >
                  All Tickets ({tickets.length})
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeTab === 'map' ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                  }`}
                >
                  Campus Map
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    activeTab === 'analytics' ? 'bg-blue-600 text-white' : `${themeTextMuted} hover:text-white`
                  }`}
                >
                  Analytics
                </button>
              </div>
            </div>

            {/* Flagged Review Panel */}
            {flaggedTickets.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/40 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Flagged for Review ({flaggedTickets.length} Suspicious Submissions)
                  </h3>
                  <span className="text-[11px] text-amber-400/80">Filtered by AI spam heuristics and geofence verification</span>
                </div>

                <div className="space-y-2">
                  {flaggedTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`cursor-pointer p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${themeCardSubtle}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{t.ticket_number}</span>
                          <span className={`font-bold ${themeTextMain}`}>{t.subcategory || t.category}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                            Risk Score: {t.fake_score}%
                          </span>
                        </div>
                        <p className={themeTextMain}>{t.description}</p>
                        <p className="text-[11px] text-amber-300/80 italic">{t.flag_reason}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(t);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Views */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                {displayTickets.length === 0 ? (
                  <div className={`p-8 rounded-3xl border text-center space-y-2 ${themeCardBg}`}>
                    <Inbox className="w-8 h-8 mx-auto text-slate-500" />
                    <p className={`text-sm font-semibold ${themeTextMain}`}>No complaints active</p>
                    <p className={`text-xs ${themeTextMuted}`}>All campus facilities are currently operating normally.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayTickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`cursor-pointer p-4 rounded-3xl border transition shadow-sm space-y-2.5 ${themeCardBg} hover:border-blue-500/60`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-blue-400 font-bold">{t.ticket_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.severity === 'critical' ? 'bg-rose-500 text-white' :
                            t.severity === 'high' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/40 text-slate-300'
                          }`}>
                            {t.severity}
                          </span>
                        </div>

                        <h4 className={`text-sm font-bold truncate ${themeTextMain}`}>{t.subcategory || t.category}</h4>
                        <p className={`text-xs line-clamp-2 ${themeTextMuted}`}>{t.description}</p>

                        <div className={`pt-2 border-t text-[11px] flex justify-between ${darkMode ? 'border-[#1b305b]' : 'border-slate-200'} ${themeTextMuted}`}>
                          <span>{t.building} • {t.room}</span>
                          <span className="font-mono text-cyan-400 font-semibold">Dept: {t.assigned_to_dept || 'General'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <CampusMap tickets={tickets} campusConfig={campusConfig} />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard tickets={tickets} />
            )}

          </div>
        )}

      </main>

      {/* ------------------------------------------------------------- */}
      {/* POPUPS & MODALS                                               */}
      {/* ------------------------------------------------------------- */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        campusName={campusConfig?.campus_name || 'Campus Connect'}
        campusConfig={campusConfig}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Admin Only Modals */}
      {isAdmin && (
        <>
          <AdminManagementModal
            isOpen={isAdminConsoleOpen}
            onClose={() => setIsAdminConsoleOpen(false)}
            campusConfig={campusConfig}
            onConfigUpdated={(cfg) => setCampusConfig(cfg)}
          />

          <CampusConfigModal
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            config={campusConfig}
            onConfigUpdated={(cfg) => setCampusConfig(cfg)}
            onResetTickets={() => {
              setTickets([]);
              setSelectedTicket(null);
            }}
          />
        </>
      )}

      <SOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        currentUser={currentUser}
        campusConfig={campusConfig}
        onSuccess={(newTkt) => {
          setTickets(prev => [newTkt, ...prev.filter(t => t.id !== newTkt.id)]);
        }}
      />

      <ComplaintModal
        isOpen={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        currentUser={currentUser}
        campusConfig={campusConfig}
        onSuccess={(newTkt) => {
          setTickets(prev => [newTkt, ...prev.filter(t => t.id !== newTkt.id)]);
        }}
      />

      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        currentUser={currentUser}
        onTicketUpdated={(upd) => {
          setTickets(prev => prev.map(t => t.id === upd.id ? upd : t));
          setSelectedTicket(upd);
        }}
        onOpenChat={(tkt) => setChatTicket(tkt)}
      />

      <ChatDrawer
        ticket={chatTicket}
        isOpen={!!chatTicket}
        onClose={() => setChatTicket(null)}
        currentUser={currentUser}
        ws={wsRef.current}
      />

      <AnnouncementsModal
        isOpen={isAnnouncementsOpen}
        onClose={() => setIsAnnouncementsOpen(false)}
        currentUser={currentUser}
      />

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs transition-colors ${
        darkMode ? 'border-[#1b305b] bg-[#070e20] text-slate-500' : 'border-slate-200 bg-white text-slate-600'
      }`}>
        Campus Connect • {campusConfig?.campus_name || 'My Campus'} • Calm UI & Emergency Dispatch Network
      </footer>

    </div>
  );
}
