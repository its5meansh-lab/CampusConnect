'use client';
import React, { useState } from 'react';
import { X, Building2, Plus, Trash2, Settings2, RotateCcw, Check, Sparkles, AlertTriangle } from 'lucide-react';

interface CampusConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  onConfigUpdated: (newConfig: any) => void;
  onResetTickets: () => void;
}

export const CampusConfigModal: React.FC<CampusConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  onResetTickets
}) => {
  const [campusName, setCampusName] = useState(config?.campus_name || 'Apex Institute of Technology');
  const [newBuilding, setNewBuilding] = useState('');
  const [buildings, setBuildings] = useState<string[]>(config?.buildings || []);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');
  const [categories, setCategories] = useState<Record<string, string[]>>(config?.categories || {});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!isOpen) return null;

  const handleSaveCampusName = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/campus/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campus_name: campusName })
      });
      const data = await res.json();
      if (data.success) {
        onConfigUpdated(data.config);
        setSuccessMsg('Campus name updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuilding.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/api/campus/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building_name: newBuilding.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setBuildings(data.buildings);
        onConfigUpdated({ ...config, buildings: data.buildings });
        setNewBuilding('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBuilding = async (bld: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/campus/buildings/${encodeURIComponent(bld)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setBuildings(data.buildings);
        onConfigUpdated({ ...config, buildings: data.buildings });
      }
    } catch (e) {
      console.error(e);
    }
  };

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
          subcategories: subList.length > 0 ? subList : ['General Issue']
        })
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        onConfigUpdated({ ...config, categories: data.categories });
        setNewCatName('');
        setNewCatSubs('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWipeTickets = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/campus/reset-tickets', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        onResetTickets();
        setConfirmWipe(false);
        setSuccessMsg('All test tickets cleared! You have a 100% clean board.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 my-8 space-y-6 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Campus & Issue Customizer</h2>
              <p className="text-xs text-slate-400">
                Configure your own institution's buildings, hostels, and custom complaint categories.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs">
          
          {/* 1. Campus Identity */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" /> Campus Details
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="Enter your campus / college name..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveCampusName}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Save Name
              </button>
            </div>
          </div>

          {/* 2. Buildings & Hostels Manager */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Campus Buildings & Hostels ({buildings.length})
              </h3>
              <span className="text-[10px] text-slate-400">Available in complaint & map dropdowns</span>
            </div>

            {/* Add Building Form */}
            <form onSubmit={handleAddBuilding} className="flex gap-2">
              <input
                type="text"
                value={newBuilding}
                onChange={(e) => setNewBuilding(e.target.value)}
                placeholder="Add custom hostel / building (e.g. Kaveri Hostel, Block 4)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            {/* List of existing buildings */}
            <div className="flex flex-wrap gap-2 pt-2 max-h-40 overflow-y-auto">
              {buildings.map((bld) => (
                <div
                  key={bld}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                >
                  <span>{bld}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBuilding(bld)}
                    className="text-slate-500 hover:text-rose-400 transition"
                    title="Delete building"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Custom Categories & Issue Types */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Custom Complaint Categories & Problem Types
            </h3>
            
            <form onSubmit={handleAddCategory} className="space-y-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category Name (e.g. Laboratory Equipment, Mess Canteen)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatSubs}
                  onChange={(e) => setNewCatSubs(e.target.value)}
                  placeholder="Subcategories comma-separated (e.g. Microscopes, Gas Burner, Glassware)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  Add Category
                </button>
              </div>
            </form>

            {/* List */}
            <div className="space-y-2 pt-2 max-h-36 overflow-y-auto">
              {Object.entries(categories).map(([cat, subs]) => (
                <div key={cat} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                  <div className="font-bold text-indigo-300">{cat}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {Array.isArray(subs) ? subs.join(' • ') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Reset & Clean Slate Button */}
          <div className="bg-rose-950/20 p-4 rounded-2xl border border-rose-500/30 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Wipe Test Data / Start 100% Clean
                </h4>
                <p className="text-[11px] text-rose-200/80">
                  Delete all sample/mock complaints so your campus board starts empty for real users.
                </p>
              </div>
              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition"
                >
                  Clear All Tickets
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleWipeTickets}
                    className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg animate-pulse"
                  >
                    Confirm Wipe
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
