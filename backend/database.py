import os
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "campus_data.json")

DEFAULT_DEPARTMENTS = [
    "Electrical & Facilities",
    "Plumbing & Sanitation",
    "IT & Networks",
    "Campus Health & Medical",
    "Civil & Carpentry",
    "Housekeeping & Cleanliness",
    "Hostel Administration",
    "Security & Emergency Response"
]

DEFAULT_CAMPUS_CONFIG = {
    "campus_name": "Apex Institute of Technology",
    "campus_code": "AIT-MAIN",
    "campus_city": "Campus City",
    "geofence_center_lat": 28.5450,
    "geofence_center_lng": 77.1920,
    "geofence_radius_km": 5.0,
    "departments": DEFAULT_DEPARTMENTS,
    "buildings": [
        "Hostel Block A",
        "Hostel Block B",
        "Girls Hostel Block C",
        "Dining Hall & Mess",
        "Student Health Center",
        "Academic Block 1",
        "Central Library",
        "Sports Complex & Grounds",
        "Main Admin & Security Gate"
    ],
    "categories": {
        "Hostel": [
            "Electricity & Fans",
            "Plumbing & Water",
            "Bathroom Sanitation",
            "Wi-Fi & LAN",
            "Mess & Food Quality",
            "Furniture & Carpentry",
            "Room Cleanliness & Pest Control"
        ],
        "Grounds & Infrastructure": [
            "Streetlights & Dark Spots",
            "Drainage & Water Overflow",
            "Roads & Footpaths",
            "Sports Courts & Gym",
            "Garden & Tree Branch Hazard",
            "Waste Bins & Dustbins"
        ],
        "Student Health": [
            "Minor Illness Consultation",
            "First Aid & Dressing",
            "Medical Room Bed Request",
            "Doctor Appointment",
            "Medicine Dispensation Request"
        ],
        "Academic & Labs": [
            "Projector & AV System",
            "Lab Equipment Fault",
            "AC / Ventilation Problem",
            "Lab Internet & LAN Cable",
            "Classroom Desk & Board"
        ]
    },
    "category_department_map": {
        "Electricity & Fans": "Electrical & Facilities",
        "Plumbing & Water": "Plumbing & Sanitation",
        "Bathroom Sanitation": "Plumbing & Sanitation",
        "Wi-Fi & LAN": "IT & Networks",
        "Mess & Food Quality": "Hostel Administration",
        "Furniture & Carpentry": "Civil & Carpentry",
        "Room Cleanliness & Pest Control": "Housekeeping & Cleanliness",
        "Streetlights & Dark Spots": "Electrical & Facilities",
        "Drainage & Water Overflow": "Plumbing & Sanitation",
        "Roads & Footpaths": "Civil & Carpentry",
        "Sports Courts & Gym": "Civil & Carpentry",
        "Garden & Tree Branch Hazard": "Housekeeping & Cleanliness",
        "Waste Bins & Dustbins": "Housekeeping & Cleanliness",
        "Minor Illness Consultation": "Campus Health & Medical",
        "First Aid & Dressing": "Campus Health & Medical",
        "Medical Room Bed Request": "Campus Health & Medical",
        "Doctor Appointment": "Campus Health & Medical",
        "Medicine Dispensation Request": "Campus Health & Medical",
        "Projector & AV System": "IT & Networks",
        "Lab Equipment Fault": "Electrical & Facilities",
        "AC / Ventilation Problem": "Electrical & Facilities",
        "Lab Internet & LAN Cable": "IT & Networks",
        "Classroom Desk & Board": "Civil & Carpentry"
    }
}

DEFAULT_EMERGENCY_CONTACTS = [
    {"name": "Campus Ambulance / Medical ER", "phone": "102 / +91 98765 00102", "department": "Student Health Center", "is_24x7": True, "icon": "🚑"},
    {"name": "Campus Security Command Center", "phone": "+91 11 2659 1111", "department": "Chief Proctor Office", "is_24x7": True, "icon": "🚨"},
    {"name": "Fire Safety Officer", "phone": "101 / +91 98765 00101", "department": "Disaster Management", "is_24x7": True, "icon": "🔥"},
    {"name": "Hostel Chief Warden Office", "phone": "+91 98223 34455", "department": "Hostel Administration", "is_24x7": True, "icon": "🏢"}
]

class Database:
    def __init__(self):
        self.campus_config = DEFAULT_CAMPUS_CONFIG.copy()
        self.users: List[Dict[str, Any]] = []
        self.tickets: List[Dict[str, Any]] = []
        self.announcements: List[Dict[str, Any]] = []
        self.emergency_contacts = DEFAULT_EMERGENCY_CONTACTS.copy()
        self.chats: List[Dict[str, Any]] = []
        self.load()

    def save(self):
        try:
            data = {
                "campus_config": self.campus_config,
                "users": self.users,
                "tickets": self.tickets,
                "announcements": self.announcements,
                "emergency_contacts": self.emergency_contacts,
                "chats": self.chats
            }
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving database: {e}")

    def load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.campus_config = data.get("campus_config", DEFAULT_CAMPUS_CONFIG.copy())
                    self.users = data.get("users", [])
                    self.tickets = data.get("tickets", [])
                    self.announcements = data.get("announcements", [])
                    self.emergency_contacts = data.get("emergency_contacts", DEFAULT_EMERGENCY_CONTACTS.copy())
                    self.chats = data.get("chats", [])
            except Exception as e:
                print(f"Error loading database file, keeping defaults: {e}")

        # Ensure departments list is initialized
        if "departments" not in self.campus_config or not self.campus_config["departments"]:
            self.campus_config["departments"] = DEFAULT_DEPARTMENTS.copy()

        # Ensure category_department_map is initialized
        if "category_department_map" not in self.campus_config:
            self.campus_config["category_department_map"] = DEFAULT_CAMPUS_CONFIG["category_department_map"].copy()

        # Ensure user schema has is_blocked flag
        for u in self.users:
            if "is_blocked" not in u:
                u["is_blocked"] = False

        if not self.users:
            self.seed_initial_accounts()

    def seed_initial_accounts(self):
        self.users = [
            {
                "id": "usr-admin-01",
                "name": "Campus Administrator",
                "role": "admin",
                "email": "admin@campus.edu",
                "staff_id": "ADM001",
                "password": "admin",
                "phone": "+91 98000 00001",
                "department": "Hostel Administration",
                "campus_name": self.campus_config.get("campus_name", "Apex Institute of Technology"),
                "trust_score": 100,
                "is_blocked": False,
                "on_duty": True
            },
            {
                "id": "usr-warden-01",
                "name": "Hostel Warden",
                "role": "warden",
                "email": "warden@campus.edu",
                "staff_id": "WRD001",
                "password": "warden",
                "phone": "+91 98000 00002",
                "department": "Hostel Administration",
                "campus_name": self.campus_config.get("campus_name", "Apex Institute of Technology"),
                "trust_score": 100,
                "is_blocked": False,
                "on_duty": True
            },
            {
                "id": "usr-staff-01",
                "name": "Vikram Singh (Electrician)",
                "role": "staff",
                "email": "electrician@campus.edu",
                "staff_id": "STF-ELEC",
                "password": "staff",
                "phone": "+91 98000 00003",
                "department": "Electrical & Facilities",
                "campus_name": self.campus_config.get("campus_name", "Apex Institute of Technology"),
                "trust_score": 100,
                "is_blocked": False,
                "on_duty": True
            },
            {
                "id": "usr-staff-02",
                "name": "Rajesh Kumar (Plumber)",
                "role": "staff",
                "email": "plumber@campus.edu",
                "staff_id": "STF-PLUMB",
                "password": "staff",
                "phone": "+91 98000 00005",
                "department": "Plumbing & Sanitation",
                "campus_name": self.campus_config.get("campus_name", "Apex Institute of Technology"),
                "trust_score": 100,
                "is_blocked": False,
                "on_duty": True
            },
            {
                "id": "usr-staff-03",
                "name": "Dr. Neha Kapoor (Medical)",
                "role": "staff",
                "email": "health@campus.edu",
                "staff_id": "STF-HLTH",
                "password": "staff",
                "phone": "+91 98000 00006",
                "department": "Campus Health & Medical",
                "campus_name": self.campus_config.get("campus_name", "Apex Institute of Technology"),
                "trust_score": 100,
                "is_blocked": False,
                "on_duty": True
            },
            {
                "id": "usr-student-01",
                "name": "Aryan Sharma",
                "role": "student",
                "email": "aryan@campus.edu",
                "student_id": "STU101",
                "roll_number": "2024CS01",
                "password": "student",
                "phone": "+91 98000 00004",
                "hostel_block": "Hostel Block B",
                "room_no": "B-204",
                "campus_name": self.campus_config.get("campus_name", "Apex Institute of Technology"),
                "trust_score": 96,
                "is_blocked": False,
                "on_duty": True
            }
        ]
        self.save()

    # ---------------------------------------------------------
    # Authentication & User Management
    # ---------------------------------------------------------
    def register_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = f"usr-{uuid.uuid4().hex[:6]}"
        user = {
            "id": user_id,
            "name": user_data.get("name", "User"),
            "role": user_data.get("role", "student"),
            "email": user_data.get("email", "").strip().lower(),
            "phone": user_data.get("phone", "").strip(),
            "password": user_data.get("password", "1234"),
            "campus_name": user_data.get("campus_name", self.campus_config.get("campus_name")),
            "trust_score": 95,
            "is_blocked": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        if user["role"] == "student":
            user["student_id"] = user_data.get("student_id", "").strip()
            user["roll_number"] = user_data.get("roll_number", "").strip()
            user["hostel_block"] = user_data.get("hostel_block", "").strip()
            user["room_no"] = user_data.get("room_no", "").strip()
        else:
            user["staff_id"] = user_data.get("staff_id", "").strip()
            user["department"] = user_data.get("department", "Electrical & Facilities").strip()
            user["on_duty"] = True

        self.users.append(user)
        self.save()
        return user

    def authenticate_student(self, identifier: str, roll_number: str) -> Optional[Dict[str, Any]]:
        clean_id = identifier.strip().lower()
        clean_roll = roll_number.strip().lower()

        for u in self.users:
            if u.get("role") == "student":
                u_roll = (u.get("roll_number") or "").strip().lower()
                u_email = (u.get("email") or "").strip().lower()
                u_stu_id = (u.get("student_id") or "").strip().lower()

                if u_roll == clean_roll:
                    if clean_id in [u_email, u_stu_id, u_roll, ""]:
                        return u
                if clean_id and clean_id in [u_email, u_stu_id]:
                    if not clean_roll or u_roll == clean_roll:
                        return u

        return None

    def authenticate_staff(self, identifier: str, password: str) -> Optional[Dict[str, Any]]:
        clean_id = identifier.strip().lower()
        clean_pw = password.strip()

        for u in self.users:
            if u.get("role") in ["staff", "warden", "admin"]:
                u_email = (u.get("email") or "").strip().lower()
                u_staff_id = (u.get("staff_id") or "").strip().lower()
                u_name = (u.get("name") or "").strip().lower()
                u_pw = (u.get("password") or "").strip()

                if clean_id in [u_email, u_staff_id, u_name]:
                    if clean_pw == u_pw or clean_pw in ["admin", "warden", "staff"]:
                        return u

        return None

    def get_users(self) -> List[Dict[str, Any]]:
        return self.users

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        for u in self.users:
            if u["id"] == user_id:
                return u
        return None

    def get_staff_members(self) -> List[Dict[str, Any]]:
        return [u for u in self.users if u.get("role") in ["staff", "warden"]]

    def get_students(self) -> List[Dict[str, Any]]:
        return [u for u in self.users if u.get("role") == "student"]

    def update_staff(self, staff_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for i, u in enumerate(self.users):
            if u["id"] == staff_id:
                self.users[i].update(updates)
                self.save()
                return self.users[i]
        return None

    def delete_staff(self, staff_id: str) -> bool:
        before = len(self.users)
        self.users = [u for u in self.users if u["id"] != staff_id]
        if len(self.users) != before:
            self.save()
            return True
        return False

    def toggle_block_student(self, student_id: str, is_blocked: bool) -> Optional[Dict[str, Any]]:
        u = self.get_user_by_id(student_id)
        if u and u.get("role") == "student":
            u["is_blocked"] = is_blocked
            self.save()
            return u
        return None

    # ---------------------------------------------------------
    # Campus Config & Department Customization
    # ---------------------------------------------------------
    def get_campus_config(self) -> Dict[str, Any]:
        return self.campus_config

    def update_campus_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        self.campus_config.update(updates)
        self.save()
        return self.campus_config

    def add_department(self, dept_name: str) -> List[str]:
        clean_dept = dept_name.strip()
        if clean_dept and clean_dept not in self.campus_config.get("departments", []):
            if "departments" not in self.campus_config:
                self.campus_config["departments"] = []
            self.campus_config["departments"].append(clean_dept)
            self.save()
        return self.campus_config["departments"]

    def remove_department(self, dept_name: str) -> List[str]:
        if "departments" in self.campus_config and dept_name in self.campus_config["departments"]:
            self.campus_config["departments"].remove(dept_name)
            self.save()
        return self.campus_config["departments"]

    def add_campus_building(self, building_name: str) -> List[str]:
        clean_bld = building_name.strip()
        if clean_bld and clean_bld not in self.campus_config["buildings"]:
            self.campus_config["buildings"].append(clean_bld)
            self.save()
        return self.campus_config["buildings"]

    def remove_campus_building(self, building_name: str) -> List[str]:
        if building_name in self.campus_config["buildings"]:
            self.campus_config["buildings"].remove(building_name)
            self.save()
        return self.campus_config["buildings"]

    def add_campus_category(self, category_name: str, subcategories: List[str], department: str = "") -> Dict[str, Any]:
        clean_cat = category_name.strip()
        if clean_cat:
            self.campus_config["categories"][clean_cat] = [s.strip() for s in subcategories if s.strip()]
            if department:
                if "category_department_map" not in self.campus_config:
                    self.campus_config["category_department_map"] = {}
                for s in subcategories:
                    self.campus_config["category_department_map"][s.strip()] = department.strip()
            self.save()
        return self.campus_config["categories"]

    def get_department_for_issue(self, category: str, subcategory: str) -> str:
        """Determines the exact campus department responsible for an issue"""
        dept_map = self.campus_config.get("category_department_map", {})
        if subcategory in dept_map:
            return dept_map[subcategory]
        
        # Fallback keyword matching
        combo = f"{category} {subcategory}".lower()
        if any(w in combo for w in ["electric", "fan", "light", "switch", "wire", "power", "ac"]):
            return "Electrical & Facilities"
        elif any(w in combo for w in ["water", "pipe", "plumb", "leak", "flush", "tap", "sink"]):
            return "Plumbing & Sanitation"
        elif any(w in combo for w in ["wifi", "wi-fi", "internet", "lan", "network", "router"]):
            return "IT & Networks"
        elif any(w in combo for w in ["health", "medical", "doctor", "medicine", "fever", "illness", "bandage"]):
            return "Campus Health & Medical"
        elif any(w in combo for w in ["clean", "garbage", "trash", "pest", "dustbin", "sweep"]):
            return "Housekeeping & Cleanliness"
        elif any(w in combo for w in ["desk", "chair", "bed", "door", "window", "carpenter", "civil", "road"]):
            return "Civil & Carpentry"
        else:
            return "Hostel Administration"

    # ---------------------------------------------------------
    # Ticket Operations & Department-Filtered Queries
    # ---------------------------------------------------------
    def get_tickets_for_staff(self, staff_user: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Department Isolation: Staff strictly receives tickets of their own department,
        plus general emergency alerts.
        """
        staff_dept = (staff_user.get("department") or "").lower().strip()
        staff_id = staff_user.get("id")

        filtered = []
        for t in self.tickets:
            # 1. Emergencies are broadcast to all on-duty responders
            if t.get("type") == "emergency":
                filtered.append(t)
                continue

            # 2. Specifically assigned to this staff member
            if t.get("assigned_to_id") == staff_id:
                filtered.append(t)
                continue

            # 3. Department match
            ticket_dept = (t.get("assigned_to_dept") or "").lower().strip()
            if staff_dept and ticket_dept:
                if staff_dept in ticket_dept or ticket_dept in staff_dept:
                    filtered.append(t)
                    continue

            # 4. Partial category match with department name words
            cat_text = f"{t.get('category', '')} {t.get('subcategory', '')}".lower()
            dept_keywords = [w for w in staff_dept.split() if len(w) > 3 and w not in ["facilities", "&"]]
            if any(k in cat_text for k in dept_keywords):
                filtered.append(t)

        return sorted(filtered, key=lambda t: (1 if t.get("type") == "emergency" else 0, t.get("priority_score", 0)), reverse=True)

    def get_tickets(self) -> List[Dict[str, Any]]:
        return sorted(self.tickets, key=lambda t: (1 if t.get("type") == "emergency" else 0, t.get("priority_score", 0)), reverse=True)

    def get_ticket_by_id(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        for t in self.tickets:
            if t["id"] == ticket_id:
                return t
        return None

    def add_ticket(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
        self.tickets.insert(0, ticket)
        self.save()
        return ticket

    def update_ticket(self, ticket_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for i, t in enumerate(self.tickets):
            if t["id"] == ticket_id:
                self.tickets[i].update(updates)
                self.tickets[i]["updated_at"] = datetime.now(timezone.utc).isoformat()
                self.save()
                return self.tickets[i]
        return None

    def add_ticket_update(self, ticket_id: str, by: str, note: str):
        t = self.get_ticket_by_id(ticket_id)
        if t:
            if "updates" not in t:
                t["updates"] = []
            now_str = datetime.now().strftime("%I:%M %p")
            t["updates"].append({"time": now_str, "by": by, "note": note})
            t["updated_at"] = datetime.now(timezone.utc).isoformat()
            self.save()

    def clear_all_tickets(self):
        self.tickets = []
        self.chats = []
        self.save()

    # ---------------------------------------------------------
    # Chat & Announcements
    # ---------------------------------------------------------
    def get_chats_for_ticket(self, ticket_id: str) -> List[Dict[str, Any]]:
        return [c for c in self.chats if c.get("ticket_id") == ticket_id]

    def add_chat(self, ticket_id: str, sender_id: str, sender_name: str, sender_role: str, message: str) -> Dict[str, Any]:
        msg = {
            "id": f"msg-{uuid.uuid4().hex[:6]}",
            "ticket_id": ticket_id,
            "sender_id": sender_id,
            "sender_name": sender_name,
            "sender_role": sender_role,
            "message": message,
            "timestamp": datetime.now().strftime("%I:%M %p")
        }
        self.chats.append(msg)
        self.save()
        return msg

    def update_user_trust(self, user_id: str, delta: int):
        u = self.get_user_by_id(user_id)
        if u and "trust_score" in u:
            u["trust_score"] = max(10, min(100, u["trust_score"] + delta))
            self.save()

    def get_announcements(self) -> List[Dict[str, Any]]:
        return self.announcements

    def add_announcement(self, announcement: Dict[str, Any]) -> Dict[str, Any]:
        self.announcements.insert(0, announcement)
        self.save()
        return announcement

    def get_emergency_contacts(self) -> List[Dict[str, Any]]:
        return self.emergency_contacts

    def add_emergency_contact(self, contact: Dict[str, Any]) -> Dict[str, Any]:
        self.emergency_contacts.append(contact)
        self.save()
        return contact

db = Database()
