'use client';
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, UploadCloud, Mic, Square, Trash2, MapPin, 
  Sparkles, Check, AlertCircle, Home, Trees, Stethoscope, Plus 
} from 'lucide-react';
import { audioSynth } from '../utils/audioAlarm';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  campusConfig: any;
  onSuccess: (newTicket: any) => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  campusConfig,
  onSuccess 
}) => {
  const categoriesMap = campusConfig?.categories || {
    Hostel: ['Electricity & Fans', 'Plumbing & Water', 'Bathroom Sanitation', 'Wi-Fi & LAN', 'Mess & Food', 'Furniture & Carpentry', 'Room Cleanliness'],
    'Grounds & Infrastructure': ['Streetlights & Paths', 'Drainage & Overflow', 'Roads & Pavements', 'Sports Complex', 'Gardens & Waste Bins'],
    'Student Health': ['Minor Illness Consultation', 'First Aid Dressing', 'Medical Room Bed Request', 'Doctor Appointment', 'Medicine Dispensation']
  };

  const categoryKeys = Object.keys(categoriesMap);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryKeys[0] || 'Hostel');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  
  const campusBuildings: string[] = campusConfig?.buildings || [
    'Hostel Block A', 'Hostel Block B', 'Girls Hostel Block C', 'Dining Hall & Mess', 'Academic Block', 'Student Health Center'
  ];

  const [building, setBuilding] = useState<string>(currentUser?.hostel_block || campusBuildings[0] || 'Hostel Block B');
  const [isCustomBuilding, setIsCustomBuilding] = useState<boolean>(false);
  const [customBuildingText, setCustomBuildingText] = useState<string>('');

  const [floor, setFloor] = useState('Floor 1');
  const [room, setRoom] = useState(currentUser?.room_no || '');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // In-browser Audio Voice Note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize category subcategories
  useEffect(() => {
    if (categoriesMap[selectedCategory]?.length) {
      setSelectedSubcategory(categoriesMap[selectedCategory][0]);
    }
  }, [selectedCategory, campusConfig]);

  // Handle Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access unavailable or denied. You can type the description directly!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !audioBlob) {
      setErrorMsg("Please provide either a description or a voice note!");
      return;
    }

    const finalBuilding = isCustomBuilding ? (customBuildingText.trim() || 'Campus Area') : building;

    setLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('student_id', currentUser?.id || 'usr-student-01');
      formData.append('category', selectedCategory);
      formData.append('subcategory', selectedSubcategory || 'General Issue');
      formData.append('building', finalBuilding);
      formData.append('floor', floor);
      formData.append('room', room || 'General');
      formData.append('description', description.trim() || 'Spoken voice complaint attached');
      formData.append('location_lat', '28.5450');
      formData.append('location_lng', '77.1920');

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      if (audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
        const b64 = await base64Promise;
        formData.append('audio_base64', b64);
      }

      const res = await fetch('http://localhost:8000/api/tickets/complaint', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        audioSynth?.playComplaintSuccess();
        onSuccess(data.ticket);
        onClose();
      } else {
        audioSynth?.playErrorWarning();
        setErrorMsg(data.detail || "Error submitting complaint");
      }
    } catch (err: any) {
      setErrorMsg("Failed to connect to backend: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-bold">
              {campusConfig?.campus_name || 'Campus Connect'}
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              File Maintenance or Facility Complaint
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          
          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Category</label>
            <div className="flex flex-wrap gap-2">
              {categoryKeys.map(catKey => {
                const isSel = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`py-2 px-3.5 rounded-xl border font-bold transition ${
                      isSel
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {catKey}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Specific Problem Area</label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            >
              {(categoriesMap[selectedCategory] || []).map((sub: string) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Location Fields (Editable & Dynamic!) */}
          <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Issue Location in Campus
              </span>
              <button
                type="button"
                onClick={() => setIsCustomBuilding(!isCustomBuilding)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {isCustomBuilding ? "← Choose from campus list" : "+ Type other building/place"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {!isCustomBuilding ? (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Building / Hostel</label>
                  <select
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {campusBuildings.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Custom Building Name</label>
                  <input
                    type="text"
                    required
                    value={customBuildingText}
                    onChange={(e) => setCustomBuildingText(e.target.value)}
                    placeholder="e.g. Civil Workshop, Canteen 2"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Floor</label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. Floor 2"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Room / Wing</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Room 204"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">
              Detailed Description (English or Hindi):
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is broken or needs attention? Any urgent hazards..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Attachments: Voice Note & Photo Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Voice Recorder */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
              <span className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Spoken Voice Note:</span>
                {audioUrl && <span className="text-emerald-400 text-[10px]">✓ Audio Ready</span>}
              </span>

              {!audioUrl ? (
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl font-semibold transition border border-slate-700"
                    >
                      <Mic className="w-4 h-4 text-rose-400" /> Record Spoken Note
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-rose-600 text-white rounded-xl font-semibold transition animate-pulse"
                    >
                      <Square className="w-4 h-4" /> Stop ({recordingSeconds}s)
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <audio src={audioUrl} controls className="h-8 w-44" />
                  <button
                    type="button"
                    onClick={deleteRecording}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
              <span className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Photo Proof:</span>
                {imagePreview && <span className="text-cyan-400 text-[10px]">✓ Photo Attached</span>}
              </span>

              {!imagePreview ? (
                <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl font-semibold transition border border-slate-700 cursor-pointer">
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  <span>Choose Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <img src={imagePreview} alt="Preview" className="w-12 h-10 object-cover rounded-lg border border-slate-700" />
                  <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{selectedFile?.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                    className="p-1.5 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Routing to Campus Staff...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Submit Report
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
