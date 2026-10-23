import os
import uuid
import json
import base64
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import db
from ai_engine import run_ai_analysis, calculate_priority_score

app = FastAPI(title="CampusConnect Platform API", version="3.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# WebSocket Connection Manager for Real-Time Dispatch & Siren
# -------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: Any):
        payload = json.dumps({"type": event_type, "data": data})
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "CHAT_SEND":
                    chat_data = parsed.get("data", {})
                    msg = db.add_chat(
                        ticket_id=chat_data.get("ticket_id"),
                        sender_id=chat_data.get("sender_id"),
                        sender_name=chat_data.get("sender_name"),
                        sender_role=chat_data.get("sender_role"),
                        message=chat_data.get("message")
                    )
                    await manager.broadcast("CHAT_MESSAGE", msg)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# -------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------
class StudentLoginRequest(BaseModel):
    identifier: str # Student ID or Email
    roll_number: str

@app.post("/api/auth/student-login")
def student_login(req: StudentLoginRequest):
    user = db.authenticate_student(req.identifier, req.roll_number)
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Student not found with this ID/Email and Roll Number. Please sign up with your details!"
        )
    return {"success": True, "user": user}

class StaffLoginRequest(BaseModel):
    identifier: str # Staff ID or Email
    password: str

@app.post("/api/auth/staff-login")
def staff_login(req: StaffLoginRequest):
    user = db.authenticate_staff(req.identifier, req.password)
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Staff credentials invalid. Enter Staff ID / Email and PIN/Password."
        )
    return {"success": True, "user": user}

class RegisterRequest(BaseModel):
    name: str
    role: str = "student"
    email: str
    phone: str
    password: Optional[str] = "1234"
    campus_name: Optional[str] = ""
    student_id: Optional[str] = ""
    roll_number: Optional[str] = ""
    hostel_block: Optional[str] = ""
    room_no: Optional[str] = ""
    staff_id: Optional[str] = ""
    department: Optional[str] = "Electrical & Facilities"

@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    if req.role == "student" and not req.roll_number.strip():
        raise HTTPException(status_code=400, detail="Roll Number is required for student registration")

    user = db.register_user(req.model_dump())
    return {"success": True, "message": "Account created successfully!", "user": user}

@app.get("/api/users")
def get_users():
    return {"success": True, "users": db.get_users()}

# -------------------------------------------------------------
# ADMIN: STAFF MANAGEMENT & DEPARTMENT MANAGEMENT
# -------------------------------------------------------------
@app.get("/api/admin/staff")
def get_all_staff():
    return {"success": True, "staff": db.get_staff_members()}

class CreateStaffRequest(BaseModel):
    name: str
    staff_id: str
    department: str
    email: str
    phone: str
    role: str = "staff" # staff, warden
    password: str = "staff"

@app.post("/api/admin/staff")
def create_staff(req: CreateStaffRequest):
    staff_data = req.model_dump()
    user = db.register_user(staff_data)
    return {"success": True, "staff": user}

class UpdateStaffRequest(BaseModel):
    name: Optional[str] = None
    staff_id: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    on_duty: Optional[bool] = None
    password: Optional[str] = None

@app.put("/api/admin/staff/{staff_id}")
def update_staff(staff_id: str, req: UpdateStaffRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updated = db.update_staff(staff_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"success": True, "staff": updated}

@app.delete("/api/admin/staff/{staff_id}")
def delete_staff(staff_id: str):
    ok = db.delete_staff(staff_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"success": True, "message": "Staff member removed"}

# -------------------------------------------------------------
# ADMIN: STUDENT MODERATION & BLOCKING
# -------------------------------------------------------------
@app.get("/api/admin/students")
def get_all_students():
    return {"success": True, "students": db.get_students()}

class BlockStudentRequest(BaseModel):
    is_blocked: bool

@app.patch("/api/admin/students/{student_id}/block")
async def toggle_student_block(student_id: str, req: BlockStudentRequest):
    student = db.toggle_block_student(student_id, req.is_blocked)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await manager.broadcast("STUDENT_STATUS_CHANGED", student)
    return {"success": True, "student": student}

class TrustScoreRequest(BaseModel):
    delta: int

@app.patch("/api/admin/students/{student_id}/trust")
def adjust_trust_score(student_id: str, req: TrustScoreRequest):
    db.update_user_trust(student_id, req.delta)
    u = db.get_user_by_id(student_id)
    return {"success": True, "student": u}

# -------------------------------------------------------------
# ADMIN: DEPARTMENTS & CAMPUS CONFIG
# -------------------------------------------------------------
@app.get("/api/admin/departments")
def get_departments():
    cfg = db.get_campus_config()
    return {"success": True, "departments": cfg.get("departments", [])}

class DepartmentRequest(BaseModel):
    name: str

@app.post("/api/admin/departments")
def add_department(req: DepartmentRequest):
    depts = db.add_department(req.name)
    return {"success": True, "departments": depts}

@app.delete("/api/admin/departments/{name}")
def delete_department(name: str):
    depts = db.remove_department(name)
    return {"success": True, "departments": depts}

@app.get("/api/campus/config")
def get_campus_config():
    return {"success": True, "config": db.get_campus_config()}

class CampusConfigUpdate(BaseModel):
    campus_name: Optional[str] = None
    campus_city: Optional[str] = None
    geofence_center_lat: Optional[float] = None
    geofence_center_lng: Optional[float] = None
    geofence_radius_km: Optional[float] = None

@app.post("/api/campus/config")
def update_campus_config(req: CampusConfigUpdate):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    cfg = db.update_campus_config(updates)
    return {"success": True, "config": cfg}

class AddBuildingRequest(BaseModel):
    building_name: str

@app.post("/api/campus/buildings")
def add_building(req: AddBuildingRequest):
    if not req.building_name.strip():
        raise HTTPException(status_code=400, detail="Building name required")
    buildings = db.add_campus_building(req.building_name)
    return {"success": True, "buildings": buildings}

@app.delete("/api/campus/buildings/{building_name}")
def delete_building(building_name: str):
    buildings = db.remove_campus_building(building_name)
    return {"success": True, "buildings": buildings}

class AddCategoryRequest(BaseModel):
    category_name: str
    subcategories: List[str]
    department: Optional[str] = ""

@app.post("/api/campus/categories")
def add_category(req: AddCategoryRequest):
    cats = db.add_campus_category(req.category_name, req.subcategories, req.department or "")
    return {"success": True, "categories": cats}

@app.post("/api/campus/reset-tickets")
async def reset_all_tickets():
    db.clear_all_tickets()
    await manager.broadcast("TICKETS_RESET", {})
    return {"success": True, "message": "All test tickets cleared! Ready for real campus complaints."}

# -------------------------------------------------------------
# TICKET ENDPOINTS WITH DEPARTMENT ISOLATION
# -------------------------------------------------------------
@app.get("/api/tickets")
def get_tickets(
    role: Optional[str] = None, 
    user_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None
):
    # Department Isolation for Staff
    if role == "staff" and user_id:
        staff_user = db.get_user_by_id(user_id)
        if staff_user:
            tickets = db.get_tickets_for_staff(staff_user)
        else:
            tickets = db.get_tickets()
    elif role == "student" and user_id:
        tickets = [t for t in db.get_tickets() if t.get("student_id") == user_id]
    else:
        tickets = db.get_tickets()

    if category:
        tickets = [t for t in tickets if t.get("category", "").lower() == category.lower()]
    if status:
        tickets = [t for t in tickets if t.get("status", "").lower() == status.lower()]

    return {"success": True, "tickets": tickets}

@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    t = db.get_ticket_by_id(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"success": True, "ticket": t}

# -------------------------------------------------------------
# 1-TAP EMERGENCY SOS ENDPOINT
# -------------------------------------------------------------
class SOSRequest(BaseModel):
    student_id: str
    emergency_type: str = "general"
    location_lat: Optional[float] = 28.5450
    location_lng: Optional[float] = 77.1920
    building: Optional[str] = "Campus Area"
    floor: Optional[str] = "Floor 1"
    room: Optional[str] = "Room"
    additional_note: Optional[str] = ""

@app.post("/api/tickets/sos")
async def trigger_emergency_sos(req: SOSRequest):
    student = db.get_user_by_id(req.student_id)
    if not student:
        student = {
            "id": req.student_id,
            "name": "Student",
            "phone": "+91 99999 88888",
            "room_no": req.room or "Room",
            "hostel_block": req.building or "Hostel"
        }
        
    ticket_id = f"TKT-EMG-{uuid.uuid4().hex[:4].upper()}"
    tkt_num = f"EMG-{uuid.uuid4().hex[:4].upper()}"
    
    emergency_labels = {
        "fire": "🔥 Fire / Electrical Flash Incident",
        "medical": "🏥 Critical Medical Emergency",
        "safety": "🚨 Personal Safety Threat",
        "hazard": "⚠️ Hazardous Gas / Structural Failure"
    }
    
    subcat = emergency_labels.get(req.emergency_type.lower(), "🚨 Critical Safety Alert")
    desc = f"SOS ALARM TRIGGERED by {student['name']} ({student.get('roll_number', '')} {student.get('room_no', 'Campus')}). "
    if req.additional_note:
        desc += f"Note: {req.additional_note}"
    else:
        desc += f"Type: {subcat}. Needs instant on-site responder dispatch."

    now_iso = datetime.now(timezone.utc).isoformat()
    now_human = datetime.now().strftime("%I:%M %p")

    assigned_staff = None
    for u in db.users:
        if u.get("role") == "staff" and u.get("on_duty", True):
            assigned_staff = u
            break
    
    assigned_name = assigned_staff["name"] if assigned_staff else "Campus Rapid Responder"
    assigned_id = assigned_staff["id"] if assigned_staff else "usr-staff-01"

    new_ticket = {
        "id": ticket_id,
        "ticket_number": tkt_num,
        "student_id": student["id"],
        "student_name": student["name"],
        "student_phone": student.get("phone", "+91 99999 88888"),
        "student_room": req.room or student.get("room_no", "Room"),
        "student_block": req.building or student.get("hostel_block", "Campus"),
        "type": "emergency",
        "emergency_type": req.emergency_type.lower(),
        "category": "Emergency",
        "subcategory": subcat,
        "description": desc,
        "severity": "critical",
        "priority_score": 100,
        "status": "in_progress",
        "location_lat": req.location_lat or 28.5458,
        "location_lng": req.location_lng or 77.1932,
        "building": req.building or student.get("hostel_block", "Main Campus"),
        "floor": req.floor or "Floor 1",
        "room": req.room or student.get("room_no", "Common Area"),
        "assigned_to_id": assigned_id,
        "assigned_to_name": assigned_name,
        "assigned_to_dept": "Security & Emergency Response",
        "is_flagged": False,
        "flag_reason": "",
        "fake_score": 0,
        "ai_generated_score": 0,
        "sla_hours": 0.08,
        "escalation_level": 1,
        "created_at": now_iso,
        "updated_at": now_iso,
        "audio_url": None,
        "image_url": None,
        "affected_count": 5,
        "updates": [
            {"time": now_human, "by": "System SOS", "note": "Instant SOS triggered. Alarm siren ringing on staff terminals."},
            {"time": now_human, "by": "Auto-Dispatch", "note": f"Assigned to on-duty rapid responder {assigned_name} (ETA: 3 mins)"}
        ],
        "feedback": None
    }
    
    saved = db.add_ticket(new_ticket)
    await manager.broadcast("EMERGENCY_SOS", saved)
    
    return {
        "success": True,
        "message": "Emergency SOS broadcasted successfully! Staff alerted with high-priority alarm.",
        "ticket": saved
    }

# -------------------------------------------------------------
# NORMAL COMPLAINT SUBMISSION (Enforces Student Blocking & Auto Department Routing)
# -------------------------------------------------------------
@app.post("/api/tickets/complaint")
async def create_normal_complaint(
    student_id: str = Form(...),
    category: str = Form(...),
    subcategory: str = Form(...),
    building: str = Form(...),
    floor: str = Form("Floor 1"),
    room: str = Form(""),
    description: str = Form(...),
    location_lat: Optional[float] = Form(28.5450),
    location_lng: Optional[float] = Form(77.1920),
    file: Optional[UploadFile] = File(None),
    audio_base64: Optional[str] = Form(None)
):
    student = db.get_user_by_id(student_id)
    if not student:
        student = {"id": student_id, "name": "Student", "phone": "+91 98765 43210"}
        
    # Check if student is BLOCKED by administration
    if student.get("is_blocked"):
        raise HTTPException(
            status_code=403, 
            detail="⚠️ Your student account is currently BLOCKED by campus administration due to policy violation or repeated fake complaints. Please contact the Warden office."
        )

    file_bytes = None
    file_name = None
    file_type = None
    image_data_url = None
    
    if file and file.filename:
        file_bytes = await file.read()
        file_name = file.filename
        file_type = file.content_type
        if file_type and "image" in file_type:
            b64_str = base64.b64encode(file_bytes).decode('utf-8')
            image_data_url = f"data:{file_type};base64,{b64_str}"

    audio_url = None
    if audio_base64:
        audio_url = audio_base64 if audio_base64.startswith("data:") else f"data:audio/webm;base64,{audio_base64}"

    location_str = f"{building}, {floor}, {room}"
    ai_result = await run_ai_analysis(
        description=description,
        category=category,
        subcategory=subcategory,
        location_str=location_str,
        lat=location_lat,
        lng=location_lng,
        is_emergency=False,
        file_bytes=file_bytes,
        file_name=file_name,
        file_type=file_type
    )

    ticket_id = f"TKT-NORM-{uuid.uuid4().hex[:4].upper()}"
    tkt_num = f"TKT-{uuid.uuid4().hex[:4].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    now_human = datetime.now().strftime("%I:%M %p")

    # Determine Department for this issue from admin mapping or heuristics
    target_dept = db.get_department_for_issue(category, subcategory)

    # Find an on-duty staff member in that specific department
    assigned_staff = None
    for u in db.users:
        if u.get("role") == "staff" and u.get("on_duty", True):
            u_dept = (u.get("department") or "").lower()
            if target_dept.lower() in u_dept or u_dept in target_dept.lower():
                assigned_staff = u
                break
    
    if not assigned_staff:
        # Pick any staff if department staff isn't registered yet
        assigned_staff = next((u for u in db.users if u.get("role") == "staff"), None)

    if ai_result["is_flagged"]:
        if student.get("id"):
            db.update_user_trust(student["id"], -10)
        status = "submitted"
        assigned_staff_id = None
        assigned_staff_name = None
        assigned_staff_dept = target_dept
        note_text = f"Flagged for Warden Review: {ai_result['flag_reason']}"
    else:
        status = "assigned"
        assigned_staff_id = assigned_staff["id"] if assigned_staff else None
        assigned_staff_name = assigned_staff["name"] if assigned_staff else f"{target_dept} Desk"
        assigned_staff_dept = target_dept
        note_text = f"Routed to {target_dept} (Severity {ai_result['severity'].upper()}). Assigned to {assigned_staff_name}."

    new_ticket = {
        "id": ticket_id,
        "ticket_number": tkt_num,
        "student_id": student["id"],
        "student_name": student["name"],
        "student_phone": student.get("phone", "+91 98765 43210"),
        "student_room": room or student.get("room_no", "Room"),
        "student_block": building or student.get("hostel_block", "Campus"),
        "type": "complaint",
        "emergency_type": None,
        "category": category,
        "subcategory": subcategory,
        "description": description,
        "severity": ai_result["severity"],
        "priority_score": ai_result["priority_score"],
        "status": status,
        "location_lat": location_lat or 28.5450,
        "location_lng": location_lng or 77.1920,
        "building": building,
        "floor": floor,
        "room": room,
        "assigned_to_id": assigned_staff_id,
        "assigned_to_name": assigned_staff_name,
        "assigned_to_dept": assigned_staff_dept,
        "is_flagged": ai_result["is_flagged"],
        "flag_reason": ai_result["flag_reason"],
        "fake_score": ai_result["fake_score"],
        "ai_generated_score": ai_result["ai_generated_score"],
        "sla_hours": ai_result["sla_hours"],
        "escalation_level": 0,
        "created_at": now_iso,
        "updated_at": now_iso,
        "audio_url": audio_url,
        "image_url": image_data_url,
        "affected_count": 1,
        "updates": [
            {"time": now_human, "by": student["name"], "note": f"Ticket submitted under {category} → {subcategory}"},
            {"time": now_human, "by": "CampusConnect Routing Engine", "note": note_text}
        ],
        "feedback": None
    }

    saved = db.add_ticket(new_ticket)
    await manager.broadcast("TICKET_CREATED", saved)
    
    return {
        "success": True,
        "ticket": saved,
        "ai_analysis": ai_result
    }

# -------------------------------------------------------------
# STATUS TRANSITION & ASSIGNMENT
# -------------------------------------------------------------
class StatusUpdate(BaseModel):
    status: str
    updated_by_name: str
    note: Optional[str] = ""
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None

@app.patch("/api/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, body: StatusUpdate):
    t = db.get_ticket_by_id(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    updates: Dict[str, Any] = {"status": body.status}
    if body.assigned_to_id:
        updates["assigned_to_id"] = body.assigned_to_id
    if body.assigned_to_name:
        updates["assigned_to_name"] = body.assigned_to_name
        
    note = body.note or f"Status changed to {body.status.replace('_', ' ').title()}"
    db.add_ticket_update(ticket_id, body.updated_by_name, note)
    
    updated = db.update_ticket(ticket_id, updates)
    await manager.broadcast("TICKET_UPDATED", updated)
    return {"success": True, "ticket": updated}

@app.post("/api/tickets/{ticket_id}/escalate")
async def escalate_ticket(ticket_id: str):
    t = db.get_ticket_by_id(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    curr_level = t.get("escalation_level", 0) + 1
    escalated_targets = {
        1: "Tier 1: Designated Department Technician",
        2: "Tier 2: Hostel Chief Warden Office",
        3: "Tier 3: Campus Dean & Security Command Authority"
    }
    
    target_str = escalated_targets.get(curr_level, "High Priority Command")
    db.add_ticket_update(
        ticket_id, 
        "Auto-Escalation Engine", 
        f"🚨 SLA Timer exceeded! Ticket escalated to {target_str}."
    )
    
    updated = db.update_ticket(ticket_id, {
        "escalation_level": curr_level,
        "priority_score": min(100, t.get("priority_score", 50) + 15)
    })
    
    await manager.broadcast("ESCALATION_TRIGGER", updated)
    return {"success": True, "ticket": updated, "escalation_level": curr_level}

class ReviewRequest(BaseModel):
    decision: str
    reviewer_name: str
    reviewer_note: Optional[str] = ""

@app.patch("/api/tickets/{ticket_id}/review")
async def review_flagged_ticket(ticket_id: str, body: ReviewRequest):
    t = db.get_ticket_by_id(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    student_id = t.get("student_id")

    if body.decision == "approve":
        updated = db.update_ticket(ticket_id, {
            "is_flagged": False,
            "status": "assigned"
        })
        db.add_ticket_update(ticket_id, body.reviewer_name, f"Approved by Warden: Marked genuine. {body.reviewer_note}")
        if student_id:
            db.update_user_trust(student_id, +5)
    else:
        updated = db.update_ticket(ticket_id, {
            "status": "closed",
            "is_flagged": True
        })
        db.add_ticket_update(ticket_id, body.reviewer_name, f"Rejected by Warden as Spurious/Fake. {body.reviewer_note}")
        if student_id:
            db.update_user_trust(student_id, -25)

    await manager.broadcast("TICKET_UPDATED", updated)
    return {"success": True, "ticket": updated}

class FeedbackRequest(BaseModel):
    rating: int
    comment: Optional[str] = ""
    reopen: Optional[bool] = False

@app.post("/api/tickets/{ticket_id}/feedback")
async def submit_feedback(ticket_id: str, body: FeedbackRequest):
    t = db.get_ticket_by_id(ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if body.reopen:
        updated = db.update_ticket(ticket_id, {"status": "in_progress"})
        db.add_ticket_update(ticket_id, t.get("student_name", "Student"), f"Student requested REOPEN: {body.comment}")
    else:
        feedback_data = {"rating": body.rating, "comment": body.comment}
        updated = db.update_ticket(ticket_id, {
            "status": "closed",
            "feedback": feedback_data
        })
        db.add_ticket_update(ticket_id, t.get("student_name", "Student"), f"Confirmed resolution ({body.rating}★): {body.comment}")
        if t.get("student_id"):
            db.update_user_trust(t["student_id"], +2)

    await manager.broadcast("TICKET_UPDATED", updated)
    return {"success": True, "ticket": updated}

# -------------------------------------------------------------
# CHAT SYSTEM
# -------------------------------------------------------------
@app.get("/api/tickets/{ticket_id}/messages")
def get_messages(ticket_id: str):
    msgs = db.get_chats_for_ticket(ticket_id)
    return {"success": True, "messages": msgs}

class ChatSend(BaseModel):
    sender_id: str
    sender_name: str
    sender_role: str
    message: str

@app.post("/api/tickets/{ticket_id}/messages")
async def send_message(ticket_id: str, body: ChatSend):
    msg = db.add_chat(
        ticket_id=ticket_id,
        sender_id=body.sender_id,
        sender_name=body.sender_name,
        sender_role=body.sender_role,
        message=body.message
    )
    await manager.broadcast("CHAT_MESSAGE", msg)
    return {"success": True, "message": msg}

# -------------------------------------------------------------
# ANNOUNCEMENTS & DIRECTORY
# -------------------------------------------------------------
@app.get("/api/announcements")
def get_announcements():
    return {"success": True, "announcements": db.get_announcements()}

class AnnouncementRequest(BaseModel):
    title: str
    content: str
    priority: str = "medium"
    category: str = "General"
    created_by: str = "Admin"

@app.post("/api/announcements")
async def create_announcement(req: AnnouncementRequest):
    new_anc = {
        "id": f"anc-{uuid.uuid4().hex[:4]}",
        "title": req.title,
        "content": req.content,
        "priority": req.priority,
        "category": req.category,
        "created_by": req.created_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    saved = db.add_announcement(new_anc)
    await manager.broadcast("NEW_ANNOUNCEMENT", saved)
    return {"success": True, "announcement": saved}

@app.get("/api/emergency-contacts")
def get_emergency_contacts():
    return {"success": True, "contacts": db.get_emergency_contacts()}

# -------------------------------------------------------------
# CAMPUS OPERATIONS ANALYTICS
# -------------------------------------------------------------
@app.get("/api/analytics")
def get_analytics():
    tickets = db.get_tickets()
    
    total = len(tickets)
    emergencies = sum(1 for t in tickets if t.get("type") == "emergency")
    resolved = sum(1 for t in tickets if t.get("status") in ["resolved", "closed"])
    in_progress = sum(1 for t in tickets if t.get("status") == "in_progress")
    flagged = sum(1 for t in tickets if t.get("is_flagged"))
    
    cat_counts: Dict[str, int] = {}
    building_counts: Dict[str, int] = {}
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    
    for t in tickets:
        c = t.get("category", "Other")
        cat_counts[c] = cat_counts.get(c, 0) + 1
        
        b = t.get("building", "General Campus")
        building_counts[b] = building_counts.get(b, 0) + 1
        
        sev = t.get("severity", "low").lower()
        if sev in severity_counts:
            severity_counts[sev] += 1

    staff_leaderboard = []
    for u in db.users:
        if u.get("role") == "staff":
            staff_leaderboard.append({
                "name": u["name"],
                "role": u.get("department", "Staff"),
                "resolved": sum(1 for t in tickets if t.get("assigned_to_id") == u["id"] and t.get("status") in ["resolved", "closed"]),
                "avg_mins": 30,
                "rating": 4.9
            })

    return {
        "success": True,
        "overview": {
            "total_tickets": total,
            "active_emergencies": emergencies,
            "resolved_tickets": resolved,
            "in_progress": in_progress,
            "flagged_for_review": flagged,
            "avg_resolution_hours": 1.5 if resolved > 0 else 0,
            "sla_compliance_percent": 98.2 if total > 0 else 100
        },
        "by_category": cat_counts,
        "by_building": building_counts,
        "by_severity": severity_counts,
        "leaderboard": staff_leaderboard
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
