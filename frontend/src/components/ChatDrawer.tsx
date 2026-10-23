'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageSquare } from 'lucide-react';
import { audioSynth } from '../utils/audioAlarm';

interface ChatDrawerProps {
  ticket: any;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  ws: WebSocket | null;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  ticket,
  isOpen,
  onClose,
  currentUser,
  ws
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    if (isOpen && ticket?.id) {
      fetch(`http://localhost:8000/api/tickets/${ticket.id}/messages`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMessages(data.messages);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, ticket?.id]);

  // Scroll to bottom on message update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to WebSocket broadcasts for real-time chat updates
  useEffect(() => {
    if (!ws) return;
    const handleMsg = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'CHAT_MESSAGE' && payload.data?.ticket_id === ticket?.id) {
          audioSynth?.playChime();
          setMessages(prev => [...prev, payload.data]);
        }
      } catch (err) {
        // ignore
      }
    };
    ws.addEventListener('message', handleMsg);
    return () => ws.removeEventListener('message', handleMsg);
  }, [ws, ticket?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    try {
      // Send via REST endpoint
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUser?.id || 'usr-student-01',
          sender_name: currentUser?.name || 'User',
          sender_role: currentUser?.role || 'student',
          message: text
        })
      });
      const data = await res.json();
      if (data.success) {
        // if not received via ws yet
        if (!messages.some(m => m.id === data.message.id)) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    } catch (err) {
      console.error("Chat send error:", err);
    }
  };

  if (!isOpen || !ticket) return null;

  const quickReplies = [
    "I am standing right outside the door",
    "Where should I meet you?",
    "Arriving in 3 minutes with tools",
    "Power has been switched off safely"
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Live Field Chat ({ticket.ticket_number})
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentUser?.role === 'student' ? `Talking with: ${ticket.assigned_to_name || 'Staff'}` : `Student: ${ticket.student_name}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p className="text-xs">No messages yet. Send a quick update or question to the responder.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUser?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-500 mb-0.5 px-1">
                  {m.sender_name} • {m.timestamp}
                </span>
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                  {m.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Quick chips */}
      <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto">
        {quickReplies.map((qr, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInputText(qr)}
            className="text-[10px] px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700 transition shrink-0"
          >
            {qr}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/30"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
