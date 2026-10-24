'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ShieldCheck, Wrench, GraduationCap, Building2, Phone, 
  KeyRound, AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2 
} from 'lucide-react';
import { audioSynth } from '../utils/audioAlarm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  campusName: string;
  campusConfig?: any;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  campusName, 
  campusConfig 
}) => {
  // Tabs: 'admin' | 'student' | 'staff'
  const [tab, setTab] = useState<'admin' | 'student' | 'staff'>('admin');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);

  // Form Fields
  const [adminMasterKey, setAdminMasterKey] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Student registration fields
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentHostel, setStudentHostel] = useState('Boys hostel');
  const [studentRoom, setStudentRoom] = useState('');

  // Motion graphics canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas motion graphics when open
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 650);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseAlpha: number;
    }> = [];

    const count = 45;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: i % 3 === 0 ? '#9333ea' : (i % 3 === 1 ? '#06b6d4' : '#3b82f6'),
        baseAlpha: Math.random() * 0.5 + 0.2
      });
    }

    let time = 0;
    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Subtle aurora background gradient waves
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      const cy = height * 0.7;
      ctx.moveTo(0, cy);
      for (let x = 0; x <= width; x += 20) {
        const y = cy + Math.sin(x * 0.008 + time) * 30 + Math.cos(x * 0.004 - time * 0.5) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, cy - 40, width, height);
      grad.addColorStop(0, '#9333ea');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Particle network
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.baseAlpha;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#c084fc';
            ctx.globalAlpha = (1 - dist / 90) * 0.2;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. MASTER ADMIN VERIFICATION HANDLER
  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!adminMasterKey.trim()) {
      setErrorMsg('Please enter the Master Admin Verification Key.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/admin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ master_key: adminMasterKey.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || 'Invalid Master Verification Key. Only the single authorized admin key grants access.');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. STUDENT LOGIN HANDLER
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!studentEmail.trim() || !studentRoll.trim()) {
      setErrorMsg('Please enter both your Campus Email / ID and Roll Number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: studentEmail.trim(), roll_number: studentRoll.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        if (data.user.is_blocked) {
          audioSynth?.playErrorWarning();
          setErrorMsg('⛔ Your student account is currently blocked by administration. Please contact the Warden office.');
          return;
        }
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || 'Student authentication failed. Check your Email or Roll Number (2026AI001 - 2026AI999).');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. STUDENT REGISTRATION HANDLER
  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!studentName.trim() || !studentRoll.trim() || !studentEmail.trim()) {
      setErrorMsg('Name, Campus Email, and Roll Number are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName.trim(),
          role: 'student',
          email: studentEmail.trim().toLowerCase(),
          phone: studentPhone.trim() || '+91 98000 00000',
          roll_number: studentRoll.trim().toUpperCase(),
          hostel_block: studentHostel,
          room_no: studentRoom.trim() || '101',
          campus_name: campusName
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. STAFF LOGIN HANDLER
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!staffId.trim() || !staffPassword.trim()) {
      setErrorMsg('Please enter your Staff ID and Passcode.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: staffId.trim(), password: staffPassword.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || 'Invalid Staff ID or Passcode. Staff accounts must be provisioned by Admin.');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-7 shadow-2xl shadow-indigo-950/80 text-slate-100 overflow-hidden backdrop-blur-2xl">
        
        {/* Creative Motion Graphics Background Canvas */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl opacity-80"
        />

        {/* Floating Ambient Glowing Mesh */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="brand-font text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
                Campus Care
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {campusName || 'Smart Facility & Emergency Portal'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Simpler Role Tabs */}
        <div className="relative z-10 grid grid-cols-3 gap-1.5 bg-slate-950/70 p-1.5 rounded-2xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('admin'); setErrorMsg(''); setIsRegister(false); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'admin'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('student'); setErrorMsg(''); setIsRegister(false); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'student'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('staff'); setErrorMsg(''); setIsRegister(false); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'staff'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Staff Desk</span>
          </button>
        </div>

        {/* 1. MASTER ADMIN FORM (Single Verification Setup Only) */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminVerify} className="relative z-10 space-y-4">
            <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl text-xs text-purple-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-300">
                <ShieldCheck className="w-4 h-4" /> Single Master Verification Setup
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Only <strong>one</strong> master verification credential grants access to Administration. No arbitrary admin IDs or secondary passwords allowed. Multiple admins can authenticate simultaneously with this master key.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Master Admin Verification Key *
              </label>
              <div className="relative">
                <input
                  type={showAdminKey ? 'text' : 'password'}
                  required
                  value={adminMasterKey}
                  onChange={(e) => setAdminMasterKey(e.target.value)}
                  placeholder="Enter Master Verification Key"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Cryptographic constant-time verification & security lockout active.
              </span>
            </div>

            {/* Quick Demo Fill Button */}
            <div className="flex items-center justify-between p-2 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Demo Setup:</span>
              <button
                type="button"
                onClick={() => setAdminMasterKey('EQUINOX-ADMIN-MASTER-2026')}
                className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-[11px] font-bold transition"
              >
                ⚡ Fill Master Key
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/30 text-sm"
            >
              {loading ? 'Verifying Master Key...' : 'Authenticate as Master Admin'}
            </button>
          </form>
        )}

        {/* 2. STUDENT FORM (Email + Roll 2026AI001 - 2026AI999) */}
        {tab === 'student' && !isRegister && (
          <form onSubmit={handleStudentLogin} className="relative z-10 space-y-4">
            <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-blue-200 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 shrink-0 text-blue-300" />
              <span>Sign in with Campus Email and Roll Number (Batch <code>2026AI001</code> - <code>2026AI999</code>).</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Campus Email *</label>
              <input
                type="email"
                required
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="e.g. arjun.2026ai042@campus.edu"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Roll Number (2026AI001 - 2026AI999) *</label>
              <input
                type="text"
                required
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
                placeholder="e.g. 2026AI042"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm uppercase"
              />
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Demo Students:</span>
              <button
                type="button"
                onClick={() => {
                  setStudentEmail('arjun.2026ai042@campus.edu');
                  setStudentRoll('2026AI042');
                }}
                className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-lg text-[10px] font-bold"
              >
                ⚡ 2026AI042
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentEmail('ansh.tiger55555@gmail.com@campus.edu');
                  setStudentRoll('2024CS01');
                }}
                className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-lg text-[10px] font-bold"
              >
                ⚡ Ansh (2024CS01)
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/30 text-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In as Student'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMsg(''); }}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                New Student? Register Roll Number & Room &rarr;
              </button>
            </div>
          </form>
        )}

        {/* 2b. STUDENT REGISTRATION FORM */}
        {tab === 'student' && isRegister && (
          <form onSubmit={handleStudentRegister} className="relative z-10 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Arjun Sharma"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Campus Email *</label>
                <input
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="name@campus.edu"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Roll (2026AIxxx) *</label>
                <input
                  type="text"
                  required
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  placeholder="2026AI042"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono uppercase focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Hostel Block</label>
                <input
                  type="text"
                  value={studentHostel}
                  onChange={(e) => setStudentHostel(e.target.value)}
                  placeholder="Hostel Block A"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Room No</label>
                <input
                  type="text"
                  value={studentRoom}
                  onChange={(e) => setStudentRoom(e.target.value)}
                  placeholder="e.g. 204"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-blue-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white rounded-xl font-bold transition text-xs"
            >
              {loading ? 'Registering...' : 'Complete Student Registration'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMsg(''); }}
                className="text-xs text-slate-400 hover:text-white"
              >
                &larr; Back to Login
              </button>
            </div>
          </form>
        )}

        {/* 3. STAFF FORM (Admin-Provisioned ID only) */}
        {tab === 'staff' && (
          <form onSubmit={handleStaffLogin} className="relative z-10 space-y-4">
            <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 shrink-0 text-amber-300" />
              <span>Staff accounts are provisioned exclusively by the Administrator. Self-registration is restricted.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Staff ID *</label>
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. STF-PLB-01"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-sm uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Passcode / PIN *</label>
              <input
                type="password"
                required
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="Enter Staff Passcode"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[10px]">Demo Staff:</span>
              <button
                type="button"
                onClick={() => { setStaffId('STF-PLB-01'); setStaffPassword('staff'); }}
                className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded-lg text-[10px] font-bold"
              >
                🚰 Plumber 1
              </button>
              <button
                type="button"
                onClick={() => { setStaffId('STF-PLB-02'); setStaffPassword('staff'); }}
                className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded-lg text-[10px] font-bold"
              >
                🚰 Plumber 2
              </button>
              <button
                type="button"
                onClick={() => { setStaffId('STF-ELEC-01'); setStaffPassword('staff'); }}
                className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded-lg text-[10px] font-bold"
              >
                ⚡ Electrician
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white rounded-xl font-bold transition shadow-lg shadow-amber-600/30 text-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In as Staff'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
