# Campus Connect — Hackathon Demo Guide & Project Architecture

> **A smart complaint and emergency response platform for campus hostels, grounds, and student health.**

---

## 🏆 Hackathon Quick Pitch (30-Second Elevator Pitch)
"Campus emergencies and facility complaints suffer from the same core problem: zero transparency, lost tickets, slow responses, and dangerous confusion during crises.
**Campus Connect** solves this with a **Two-Tier Architecture**:
1. **1-Tap Emergency SOS** with a 3-second accidental-cancel window that broadcasts loud siren alarms, live GPS coordinates, and student info to on-duty rapid responders in under 500ms.
2. **AI-Powered Complaint Lifecycle** that uses multimodal NLP and vision to calculate dynamic priority scores, enforce SLAs, transcribe spoken voice notes, and detect fake/AI-generated complaints before they waste staff time."

---

## 🚀 How to Run the App Instantly

### Option A: 1-Click Master Launcher
Double-click `start_campus_connect.bat` in the root folder, or `equinox-app/start_all.bat`.
It automatically launches:
- **FastAPI Backend**: `http://localhost:8000` (API Docs at `http://localhost:8000/docs`)
- **Next.js Frontend**: `http://localhost:3000`
- Automatically opens your browser at `http://localhost:3000`!

### Option B: Manual Terminal Launch
1. **Backend**:
   ```powershell
   cd equinox-app/backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Frontend**:
   ```powershell
   cd equinox-app/frontend
   npm.cmd run dev
   ```

---

## 🌟 Implemented Features Checklist (Matching User Specification 100%)

| Spec Section | Feature | Implementation Details |
|--------------|---------|------------------------|
| **3.1** | Two Separate Ticket Types | Distinct Normal Complaints vs. High-vis emergency SOS banner & button |
| **3.2** | Emergency SOS Button | Giant red pulsating button, **3-second cancel countdown**, emergency category selection (Fire 🔥, Medical 🏥, Safety 🚨, Hazard ⚠️), live GPS capture, post-alert note |
| **3.3** | Staff Emergency Alerts | Full-screen crisis takeover banner, **Web Audio API emergency siren alarm** (plays through browser speakers!), real-time WebSocket dispatch |
| **3.4** | Instant Connection to Staff | Responding technician card (Vikram Singh), ETA display (~3 mins), one-tap direct call, in-app live chat dialogue |
| **3.5** | Rich Proof Complaint Submission | **In-browser voice note audio recording** (MediaRecorder API), photo upload with preview, building/floor/room selector, geofenced GPS |
| **3.6** | Ticket Tracking Timeline | 6-stage visual timeline (`Submitted` ➔ `Verified` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved` ➔ `Closed`), progress bar %, staff card, confirm fix, 5-star rating feedback modal, reopen ticket |
| **3.7** | AI Severity Detection | NLP analysis of critical vs high vs medium keywords, category rules, multimodal image inspection, SLA estimation |
| **3.8** | Smart Priority Queue | Dynamic score (0-100) based on severity + emergency flag (+50) + aging wait time (+1.5/hr) + affected multiplier + health boost |
| **3.9** | Fake & Spam Detection | Checks keyboard mashing/gibberish, GPS geofence anomaly (>3km outside campus perimeter), duplicate image hash, synthetic image score. Flags for Warden review without blocking genuine students |
| **4.0** | Campus Hotspot Map | Interactive vector grid of campus buildings (Hostel Block B, Girls Hostel C, Mess, Health Center) with live ticket badges and SOS beacon |
| **4.0** | Campus Analytics & Directory | Overview KPI metrics, category breakdown charts, technician leaderboard, 24x7 emergency helpline directory |
| **Role Switcher** | 1-Click Role Switch | Switch between **Student**, **Staff / Technician**, **Warden**, and **Admin** instantly in top navbar |

---

## 🎬 3-Minute Winning Demo Script for Hackathon Judges

### Step 1: Student View & 1-Tap SOS (Minute 1)
1. Open `http://localhost:3000` as **🎓 Student** (Aryan Sharma).
2. Point out the prominent red **SOS Button**. Click it.
3. Show the **3-Second Countdown Window** ("Accidental tap? Click Cancel within 3s").
4. Select **🔥 Fire / Flash** and let it fire:
   - A **loud emergency siren sounds** through the speakers.
   - Live GPS coordinates (`28.5458, 77.1932`) and room (`B-204`) are dispatched.
   - Shows "HELP IS ON THE WAY!" with technician Vikram Singh assigned (ETA 3 mins) and one-tap call.
5. Close modal and show the **Active Emergency Banner** now pulsing at the top.

### Step 2: Staff / Technician Priority Queue (Minute 2)
1. In the top bar, click **🛠️ Staff / Tech** (Vikram Singh).
2. Point out:
   - **Emergency Siren alert banner** at the top.
   - **Smart Priority Queue** sorted by AI score (Emergency has Score 100/100!).
   - **On-Duty / Off-Duty** toggle.
3. Click **"View & Dispatch"** on the emergency or maintenance ticket:
   - Shows the 6-stage timeline.
   - Click **"Start Work"** (status moves to In Progress).
   - Click **"Live Chat"** and type a message: *"I am at staircase 2 with fire extinguisher"* — show real-time chat update!
   - Click **"Mark Resolved"**.

### Step 3: Anti-Spam / Fake AI Detection & Warden Review (Minute 3)
1. In the top bar, click **🎓 Student**, then click **"Raise Complaint"**.
2. Click the quick demo button: **"🚨 Test Fake / Gibberish (Spam Filter Demo)"**.
3. Submit it.
4. Now click **🧑‍💼 Warden** (Prof. Ramesh Patel) in the top bar:
   - Point out the **"Flagged for Human Review"** panel!
   - Shows **Fake Score: 75%** with reasons: *"Pattern detected matching gibberish/keyboard spam | Location anomaly"*.
   - Explain to judges: **"Unlike rigid systems that silently drop complaints or ban students, Campus Connect flags suspicious reports for human review and adjusts trust score, ensuring no genuine crisis is ever missed."**
   - Click **"Review & Decide"** ➔ Approve or Reject.
5. Switch to **Analytics & Reports** tab to show the campus building problem hotspots and technician leaderboard!

---

## 🛠️ Architecture Overview

```
                  ┌────────────────────────┐
                  │ Next.js 16 + React 19  │
                  │ Tailwind CSS + Icons   │
                  └───────────┬────────────┘
                              │
                    REST API + WebSockets
                              │
                  ┌───────────▼────────────┐
                  │  FastAPI (Python 3.13) │
                  │  WebSocket Event Hub   │
                  └───────────┬────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│ Gemini Flash AI │  │ Trust & Safety  │  │ In-Memory DB    │
│ & Multimodal    │  │ Geofencing &    │  │ + Persistence   │
│ Severity Engine │  │ Anti-Spam rules │  │ (campus_data)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---
*Created for Equinox 2026 Hackathon • Campus Connect Platform*
