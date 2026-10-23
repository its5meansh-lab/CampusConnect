'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, Users, Wrench, GraduationCap, ShieldAlert, Plus, 
  Trash2, Edit2, Check, Ban, ShieldCheck, Volume2, 
  FolderPlus, AlertCircle, Building2 
} from 'lucide-react';
import { audioSynth } from '../utils/audioAlarm';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  campusConfig: any;
  onConfigUpdated: (newConfig: any) => void;
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  campusConfig,
  onConfigUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'students' | 'departments' | 'sounds'>('staff');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>(campusConfig?.departments || []);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Add/Edit Staff Modal State
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffDept, setStaffDept] = useState(departments[0] || 'Electrical & Facilities');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('staff');
  const [staffRole, setStaffRole] = useState('staff');

  // Add Department State
  const [newDeptName, setNewDeptName] = useState('');

  // Add Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');
  const [newCatDept, setNewCatDept] = useState(departments[0] || 'Electrical & Facilities');

  const fetchStaff = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/staff');
      const data = await res.json();
      if (data.success) setStaffList(data.staff);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/students');
      const data = await res.json();
      if (data.success) setStudentList(data.students);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      fetchStudents();
      setDepartments(campusConfig?.departments || []);
    }
  }, [isOpen, campusConfig]);

  if (!isOpen) return null;

  // Staff Handlers
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffId.trim()) return;

    setLoading(true);
    try {
      if (editingStaffId) {
        // Update existing staff
        const res = await fetch(`http://localhost:8000/api/admin/staff/${editingStaffId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: staffName.trim(),
            staff_id: staffId.trim(),
            department: staffDept,
            email: staffEmail.trim() || `${staffId.toLowerCase()}@campus.edu`,
            phone: staffPhone.trim() || '+91 98000 00000',
            password: staffPassword.trim() || 'staff',
            role: staffRole
          })
        });
        const data = await res.json();
        if (data.success) {
          setMsg('Staff member updated successfully!');
          fetchStaff();
          resetStaffForm();
        }
      } else {
        // Create new staff
        const res = await fetch('http://localhost:8000/api/admin/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: staffName.trim(),
            staff_id: staffId.trim(),
            department: staffDept,
            email: staffEmail.trim() || `${staffId.toLowerCase()}@campus.edu`,
            phone: staffPhone.trim() || '+91 98000 00000',
            password: staffPassword.trim() || 'staff',
            role: staffRole
          })
        });
        const data = await res.json();
        if (data.success) {
          setMsg('New department staff added successfully!');
          fetchStaff();
          resetStaffForm();
        }
      }
    } catch (err: any) {
      setMsg('Error saving staff: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleEditClick = (stf: any) => {
    setEditingStaffId(stf.id);
    setStaffName(stf.name || '');
    setStaffId(stf.staff_id || '');
    setStaffDept(stf.department || departments[0]);
    setStaffEmail(stf.email || '');
    setStaffPhone(stf.phone || '');
    setStaffPassword(stf.password || 'staff');
    setStaffRole(stf.role || 'staff');
    setIsEditingStaff(true);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStaffList(prev => prev.filter(s => s.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetStaffForm = () => {
    setIsEditingStaff(false);
    setEditingStaffId(null);
    setStaffName('');
    setStaffId('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffPassword('staff');
  };

  // Student Blocking Handlers
  const handleToggleBlock = async (stu: any) => {
    const newStatus = !stu.is_blocked;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/students/${stu.id}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (newStatus) {
          audioSynth?.playErrorWarning();
        } else {
          audioSynth?.playChime();
        }
        setStudentList(prev => prev.map(s => s.id === stu.id ? { ...s, is_blocked: newStatus } : s));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Department Handlers
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onConfigUpdated({ ...campusConfig, departments: data.departments });
        setNewDeptName('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDept = async (name: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/admin/departments/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
        onConfigUpdated({ ...campusConfig, departments: data.departments });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Category with Department Mapping Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const subList = newCatSubs.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch('http://localhost:8000/api/campus/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: newCatName.trim(),
          subcategories: subList.length > 0 ? subList : ['General'],
          department: newCatDept
        })
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Category "${newCatName}" assigned to ${newCatDept}!`);
        onConfigUpdated({ ...campusConfig, categories: data.categories });
        setNewCatName('');
        setNewCatSubs('');
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 my-8 max-h-[90vh] flex flex-col space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              Campus Administrative Command Center
            </h2>
            <p className="text-xs text-slate-400">
              Department staff directory, student blocking & moderation, and campus categories.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            <Wrench className="w-4 h-4" /> Staff Members ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Students Moderation ({studentList.length})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'departments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            <Building2 className="w-4 h-4" /> Departments & Categories ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('sounds')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'sounds' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            <Volume2 className="w-4 h-4" /> Sound Effects Test
          </button>
        </div>

        {/* Tab 1: Staff Members Directory & Editing */}
        {activeTab === 'staff' && (
          <div className="flex-1 overflow-y-auto space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">
                Staff receive complaints filtered <strong>strictly for their department</strong>.
              </span>
              {!isEditingStaff && (
                <button
                  type="button"
                  onClick={() => setIsEditingStaff(true)}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                >
                  <Plus className="w-4 h-4" /> Add Staff Member
                </button>
              )}
            </div>

            {/* Staff Add / Edit Form */}
            {isEditingStaff && (
              <form onSubmit={handleSaveStaff} className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/40 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-indigo-400">
                    {editingStaffId ? 'Edit Staff Member Details' : 'Register New Department Staff Member'}
                  </h4>
                  <button type="button" onClick={resetStaffForm} className="text-slate-400 hover:text-white">
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Vikram Singh"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Department ID / Staff ID *</label>
                    <input
                      type="text"
                      required
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="e.g. STF-ELEC-01"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Department Assigned *</label>
                    <select
                      value={staffDept}
                      onChange={(e) => setStaffDept(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      placeholder="+91 99887 76655"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Login PIN / Password</label>
                    <input
                      type="text"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Default: staff"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Role</label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="staff">Field Technician</option>
                      <option value="warden">Hostel Warden</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetStaffForm}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                  >
                    {editingStaffId ? 'Update Staff Member' : 'Save Staff Member'}
                  </button>
                </div>
              </form>
            )}

            {/* Staff Table / Cards */}
            <div className="space-y-2">
              {staffList.map((stf) => (
                <div
                  key={stf.id}
                  className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
                      {stf.avatar || '⚡'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{stf.name}</h4>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-indigo-400 border border-slate-800">
                          {stf.staff_id || 'ID'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {stf.department}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {stf.phone || 'No phone'} • Login PIN: <code className="text-slate-300">{stf.password || 'staff'}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(stf)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition"
                      title="Edit Staff"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(stf.id)}
                      className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition"
                      title="Remove Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Students Moderation & Blocking */}
        {activeTab === 'students' && (
          <div className="flex-1 overflow-y-auto space-y-4 text-xs">
            <p className="text-slate-400">
              Manage registered students. Blocked students are restricted from submitting fake complaints or spam.
            </p>

            <div className="space-y-2">
              {studentList.map((stu) => (
                <div
                  key={stu.id}
                  className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    stu.is_blocked ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
                      stu.is_blocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{stu.name}</h4>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 border border-slate-800">
                          Roll: {stu.roll_number || 'N/A'}
                        </span>
                        {stu.is_blocked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                            BLOCKED
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {stu.hostel_block || 'Hostel'} Room {stu.room_no || '101'} • Phone: {stu.phone || 'N/A'} • Trust Score: <strong className="text-amber-400">{stu.trust_score || 95}/100</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleBlock(stu)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        stu.is_blocked
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          : 'bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white'
                      }`}
                    >
                      {stu.is_blocked ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Unblock Student
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" /> Block Student
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Departments & Categories */}
        {activeTab === 'departments' && (
          <div className="flex-1 overflow-y-auto space-y-6 text-xs">
            
            {/* Departments Manager */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Campus Facility Departments ({departments.length})
              </h3>
              <p className="text-slate-400 text-[11px]">
                Technicians register under these departments. Incoming tickets are automatically routed here.
              </p>

              <form onSubmit={handleAddDept} className="flex gap-2">
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Laboratory Maintenance, Civil & Carpentry..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Department
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-1">
                {departments.map((dept) => (
                  <div
                    key={dept}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDept(dept)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Category with Department Routing */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                Add Category & Assign to Responsible Department
              </h3>

              <form onSubmit={handleAddCategory} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Category Name</label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Lab Equipment Faults"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Target Department (Receives tickets)</label>
                    <select
                      value={newCatDept}
                      onChange={(e) => setNewCatDept(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Subcategories (Comma separated)</label>
                  <input
                    type="text"
                    value={newCatSubs}
                    onChange={(e) => setNewCatSubs(e.target.value)}
                    placeholder="e.g. Microscope lens broken, Bunsen burner gas, Power socket"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  Save Category & Route
                </button>
              </form>
            </div>

          </div>
        )}

        {/* Tab 4: Sound Effects Testing */}
        {activeTab === 'sounds' && (
          <div className="flex-1 overflow-y-auto space-y-4 text-xs">
            <p className="text-slate-400">
              Audition the synthesized soundscapes generated natively by the Web Audio API engine.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-rose-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> 🚨 Emergency SOS Siren
                </h4>
                <p className="text-slate-400 text-[11px]">
                  High-alert dual-oscillator sweep with harmonic overtone and sub-bass rumble.
                </p>
                <button
                  type="button"
                  onClick={() => audioSynth?.playEmergencySiren(4)}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                >
                  Play Siren Alarm
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> ✨ Complaint Raised Success Chime
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Sparkling 4-note ascending crystal arpeggio (C5 ➔ E5 ➔ G5 ➔ C6).
                </p>
                <button
                  type="button"
                  onClick={() => audioSynth?.playComplaintSuccess()}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Play Success Chime
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> 🔔 Notification / Chat Ping
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Subtle two-tone bell chime for chat messages and status updates.
                </p>
                <button
                  type="button"
                  onClick={() => audioSynth?.playChime()}
                  className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold"
                >
                  Play Chat Ping
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> ⚠️ Warning / Blocked Alert Thud
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Low-frequency warning drop played when an action is blocked or flagged.
                </p>
                <button
                  type="button"
                  onClick={() => audioSynth?.playErrorWarning()}
                  className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold"
                >
                  Play Warning Thud
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition text-xs"
          >
            Close Console
          </button>
        </div>

      </div>
    </div>
  );
};
