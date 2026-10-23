'use client';
import React, { useState } from 'react';
import { X, User, ShieldCheck, Wrench, GraduationCap, Building2, Phone, KeyRound, AlertCircle } from 'lucide-react';
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
  const [tab, setTab] = useState<'student' | 'staff'>('student');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const departments: string[] = campusConfig?.departments || [
    "Electrical & Facilities",
    "Plumbing & Sanitation",
    "IT & Networks",
    "Campus Health & Medical",
    "Civil & Carpentry",
    "Housekeeping & Cleanliness",
    "Hostel Administration",
    "Security & Emergency Response"
  ];

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [staffRole, setStaffRole] = useState<'staff' | 'warden' | 'admin'>('staff');
  const [department, setDepartment] = useState(departments[0]);

  if (!isOpen) return null;

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim() || !rollNumber.trim()) {
      setErrorMsg('Please enter both your Student ID / Email and Roll Number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), roll_number: rollNumber.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        if (data.user.is_blocked) {
          audioSynth?.playErrorWarning();
          setErrorMsg('⚠️ Your student account is currently BLOCKED by campus administration. Please contact the Warden office.');
          return;
        }
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || 'Login failed. If you are new, click "Sign Up" below to register your Roll Number!');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter your Staff ID / Department ID and Password/PIN');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || 'Invalid Staff/Department ID or Password.');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please provide your Full Name');
      return;
    }

    if (tab === 'student' && !rollNumber.trim()) {
      setErrorMsg('Roll Number is mandatory for student registration');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        role: tab === 'student' ? 'student' : staffRole,
        email: email.trim() || `${identifier.trim() || 'user'}@campus.edu`,
        phone: phone.trim() || '+91 98000 00000',
        password: password.trim() || '1234',
        campus_name: campusName
      };

      if (tab === 'student') {
        payload.student_id = identifier.trim() || rollNumber.trim();
        payload.roll_number = rollNumber.trim();
        payload.hostel_block = hostelBlock.trim() || 'General Hostel';
        payload.room_no = roomNo.trim() || 'Room 101';
      } else {
        payload.staff_id = identifier.trim() || 'STF-NEW';
        payload.department = department.trim();
      }

      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        audioSynth?.playChime();
        localStorage.setItem('campus_connect_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.detail || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMsg('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-bold">
              {campusName || 'Campus Portal'}
            </span>
            <h2 className="text-xl font-bold text-white">
              {isRegister ? 'Create Campus Account' : 'Campus Portal Login'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Student vs Department Staff */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => { setTab('student'); setErrorMsg(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition ${
              tab === 'student' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('staff'); setErrorMsg(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition ${
              tab === 'staff' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" /> Department Staff
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={isRegister ? handleRegister : (tab === 'student' ? handleStudentLogin : handleStaffLogin)} className="space-y-3.5 mt-4 text-xs">
          
          {isRegister && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {tab === 'student' ? (
            <>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Roll Number *</label>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2024CS01, BT22ECE042"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Student ID or Campus Email {isRegister ? '' : '(Optional if Roll Number entered)'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STU101 or rahul@campus.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {isRegister && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Hostel / Block</label>
                      <input
                        type="text"
                        value={hostelBlock}
                        onChange={(e) => setHostelBlock(e.target.value)}
                        placeholder="e.g. Hostel Block B"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Room No</label>
                      <input
                        type="text"
                        value={roomNo}
                        onChange={(e) => setRoomNo(e.target.value)}
                        placeholder="e.g. 204"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Department Staff ID or Email *</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STF-ELEC, STF-PLUMB, ADM001, WRD001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Password / Security PIN *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter PIN (Default: staff / warden / admin)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {isRegister && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Staff Role</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="staff">Department Technician</option>
                        <option value="warden">Hostel Warden</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Assigned Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 99887 76655"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Complete Sign Up' : `Login as ${tab === 'student' ? 'Student' : 'Department Staff'}`}
          </button>

          <div className="pt-2 text-center text-slate-400">
            {!isRegister ? (
              <p>
                Don't have an account registered yet?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setErrorMsg(''); }}
                  className="text-cyan-400 font-bold hover:underline"
                >
                  Sign Up with Roll Number / ID
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setErrorMsg(''); }}
                  className="text-cyan-400 font-bold hover:underline"
                >
                  Back to Login
                </button>
              </p>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
