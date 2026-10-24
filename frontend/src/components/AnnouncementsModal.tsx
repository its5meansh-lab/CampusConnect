'use client';
import React, { useState, useEffect } from 'react';
import { X, Bell, Megaphone, Plus, Calendar, AlertTriangle } from 'lucide-react';

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('General');

  const fetchAnnouncements = () => {
    fetch('http://localhost:8000/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          priority,
          category,
          created_by: currentUser?.name || 'Campus Operations'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements([data.announcement, ...announcements]);
        setTitle('');
        setContent('');
        setIsPosting(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const canPost = currentUser?.role === 'warden' || currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Campus Announcements</h3>
              <p className="text-xs text-slate-400">Important notices from hostel warden and campus facilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {canPost && (
            <div className="pb-3 border-b border-slate-800">
              {!isPosting ? (
                <button
                  type="button"
                  onClick={() => setIsPosting(true)}
                  className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Broadcast New Announcement
                </button>
              ) : (
                <form onSubmit={handleCreate} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-400">Compose Broadcast Notice</span>
                    <button type="button" onClick={() => setIsPosting(false)} className="text-slate-400 hover:text-white">
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement Title..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Detailed message..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300"
                    >
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical / Emergency</option>
                    </select>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                    >
                      Publish Announcement
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* List */}
          {announcements.map((anc) => (
            <div
              key={anc.id}
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                anc.priority === 'high' || anc.priority === 'critical'
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-100'
                  : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  anc.priority === 'high' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {anc.category || 'General'}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3" /> {new Date(anc.created_at).toLocaleDateString()}
                </span>
              </div>
              <h4 className="font-bold text-sm text-white">{anc.title}</h4>
              <p className="text-slate-300 leading-relaxed">{anc.content}</p>
              <div className="text-[10px] text-slate-400 font-medium pt-1">
                Issued by: <strong className="text-slate-300">{anc.created_by}</strong>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
