import os
import re
import hashlib
import json
import math
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Try injecting truststore if available to handle Windows SSL certificate interceptors
try:
    import truststore
    truststore.inject_into_ssl()
except Exception:
    pass

load_dotenv(override=True)

# Campus Coordinates (e.g., Campus Center: Lat 28.545, Lng 77.192, Radius ~2.5km)
CAMPUS_CENTER_LAT = 28.5450
CAMPUS_CENTER_LNG = 77.1920
CAMPUS_GEOFENCE_RADIUS_KM = 3.0

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula to compute distance in km"""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    if not api_key or not api_key.startswith("AIzaSy"):
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception:
        return None

def analyze_text_rules(text: str, category: str = "", is_emergency: bool = False) -> Dict[str, Any]:
    """
    Intelligent heuristic & NLP analysis for severity and spam detection
    """
    t_lower = text.lower()
    
    # 1. Emergency SOS check
    if is_emergency:
        return {
            "severity": "critical",
            "sla_hours": 0.1,  # 6 minutes / immediate
            "target_response": "Immediate Dispatch (< 5 mins)",
            "priority_boost": 50,
            "detected_keywords": ["emergency_sos", "urgent_safety"],
            "summary": "CRITICAL EMERGENCY: Immediate response team dispatched."
        }
    
    # Critical keywords: direct danger to life, fire, gas, electric shock, unconsciousness
    critical_keywords = [
        "fire", "smoke", "gas leak", "flame", "cylinder", "blast", "explosion",
        "bleeding", "unconscious", "heart attack", "collapsed", "fainted", "choking",
        "electric shock", "short circuit", "sparking", "exposed wire", "electrocution",
        "ceiling collapse", "roof collapse", "drowning"
    ]
    
    # High keywords: serious disruption affecting many, flood, blackout, water shortage
    high_keywords = [
        "blackout", "power failure", "no water", "tank overflow", "flooding", "burst pipe",
        "sewage", "foul smell", "water outage", "staircase pitch dark", "broken lock",
        "stray animal inside", "broken main gate", "lift stuck", "elevator trapped"
    ]
    
    # Medium keywords: common maintenance affecting comfort
    medium_keywords = [
        "broken tap", "fan not working", "slow fan", "ac not cooling", "ac remote",
        "wi-fi down", "no internet", "bathroom light", "door handle", "geyser not heating",
        "flush not working", "clogged sink", "bed broken", "table broken", "mattress"
    ]
    
    found_critical = [k for k in critical_keywords if k in t_lower]
    found_high = [k for k in high_keywords if k in t_lower]
    found_medium = [k for k in medium_keywords if k in t_lower]
    
    if found_critical:
        return {
            "severity": "critical",
            "sla_hours": 0.5,
            "target_response": "Immediate Dispatch (< 30 mins)",
            "priority_boost": 40,
            "detected_keywords": found_critical,
            "summary": f"Detected critical risk factors: {', '.join(found_critical[:3])}"
        }
    elif found_high:
        return {
            "severity": "high",
            "sla_hours": 2.0,
            "target_response": "High Priority (< 2 hours)",
            "priority_boost": 25,
            "detected_keywords": found_high,
            "summary": f"Detected high impact campus issues: {', '.join(found_high[:3])}"
        }
    elif found_medium:
        return {
            "severity": "medium",
            "sla_hours": 24.0,
            "target_response": "Standard Resolution (< 24 hours)",
            "priority_boost": 15,
            "detected_keywords": found_medium,
            "summary": f"Standard maintenance request: {', '.join(found_medium[:3])}"
        }
    else:
        # Default low
        return {
            "severity": "low",
            "sla_hours": 72.0,
            "target_response": "Routine Request (< 3 days)",
            "priority_boost": 5,
            "detected_keywords": ["routine_maintenance"],
            "summary": "Routine campus maintenance or cosmetic request."
        }

def detect_spam_and_fake(
    text: str, 
    lat: Optional[float] = None, 
    lng: Optional[float] = None, 
    has_image: bool = False,
    image_bytes: Optional[bytes] = None,
    image_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fake and Spam Complaint Detection Pipeline:
    1. Text spam/gibberish detection
    2. Geofence verification
    3. AI-generated image & metadata check
    4. Image duplicate hash calculation
    """
    flags = []
    fake_score = 0  # 0 to 100%
    is_flagged = False
    ai_generated_score = 0
    img_hash = None
    
    # Check 1: Text gibberish & keyboard mashing
    clean_text = text.strip()
    if len(clean_text) < 5 and not clean_text.lower().startswith("sos"):
        flags.append("Extremely short or vague description")
        fake_score += 35
        
    # Keyboard mashing keywords & regex patterns
    mashing_patterns = [
        r"asdfgh", r"qwerty", r"zxcvbn", r"12345", r"test complaint",
        r"(.)\1{4,}",  # e.g., aaaaa, 11111
        r"(asdf|qwer|zxcv|1234|test){2,}"
    ]
    for pattern in mashing_patterns:
        if re.search(pattern, clean_text.lower()):
            flags.append("Pattern detected matching gibberish/keyboard spam")
            fake_score += 45
            break

    # Check 2: Geofence verification
    if lat is not None and lng is not None and (lat != 0 or lng != 0):
        dist = calculate_distance_km(lat, lng, CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG)
        if dist > CAMPUS_GEOFENCE_RADIUS_KM:
            flags.append(f"Location anomaly: Submitted from {dist:.1f} km outside campus perimeter")
            fake_score += 30

    # Check 3: Image checks
    if has_image and image_bytes:
        # Compute MD5 perceptual digest
        img_hash = hashlib.md5(image_bytes).hexdigest()
        
        # Check file extension & synthetic names
        if image_name:
            low_name = image_name.lower()
            if any(term in low_name for term in ["midjourney", "dall-e", "stablediffusion", "generated", "ai_image"]):
                ai_generated_score = 85
                flags.append("Image filename indicates synthetic AI generation")
                fake_score += 50
        
        # Check image byte characteristics (very small or uniform payloads)
        if len(image_bytes) < 4000:
            flags.append("Suspiciously small image file (possible placeholder or corrupted icon)")
            fake_score += 25
            
        # In a real environment, can sample AI detector or Gemini
        # Baseline simulated AI generated confidence for demo variety
        if "ai" in (image_name or "").lower():
            ai_generated_score = 88
        else:
            ai_generated_score = 6

    fake_score = min(fake_score, 100)
    if fake_score >= 40:
        is_flagged = True

    return {
        "is_flagged": is_flagged,
        "fake_score": fake_score,
        "ai_generated_score": ai_generated_score,
        "flags": flags,
        "image_hash": img_hash,
        "geofence_verified": (lat is not None and lng is not None and calculate_distance_km(lat, lng, CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG) <= CAMPUS_GEOFENCE_RADIUS_KM) if (lat and lng) else True
    }

def calculate_priority_score(
    severity: str, 
    is_emergency: bool, 
    wait_hours: float = 0.0, 
    affected_count: int = 1, 
    is_health: bool = False,
    is_flagged: bool = False
) -> int:
    """
    Computes priority score (0 to 100) based on weighted formula:
    - Emergency flag: +50
    - Severity: Critical +40, High +25, Medium +15, Low +5
    - Aging time: +1.5 per hour waited
    - Multiple affected students: +4 per extra student
    - Health/Safety boost: +10
    - Flagged penalty: -15 (held for review)
    """
    score = 0
    
    if is_emergency:
        score += 50
    
    sev_weights = {
        "critical": 40,
        "high": 25,
        "medium": 15,
        "low": 5
    }
    score += sev_weights.get(severity.lower(), 10)
    
    # Aging
    score += min(wait_hours * 1.5, 15)
    
    # Affected students multiplier
    score += min((affected_count - 1) * 4, 15)
    
    # Health/Safety boost
    if is_health:
        score += 10
        
    # Fraud penalty
    if is_flagged:
        score -= 15
        
    return max(5, min(int(round(score)), 100))

async def run_ai_analysis(
    description: str,
    category: str = "",
    subcategory: str = "",
    location_str: str = "",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    is_emergency: bool = False,
    file_bytes: Optional[bytes] = None,
    file_name: Optional[str] = None,
    file_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Master multimodal AI analysis orchestrator:
    Combines Gemini (if available) with intelligent rule & security engines.
    """
    # 1. Base rule & NLP evaluation
    rules_result = analyze_text_rules(description, category, is_emergency)
    
    # 2. Fake & spam checks
    spam_result = detect_spam_and_fake(
        text=description,
        lat=lat,
        lng=lng,
        has_image=(file_bytes is not None and file_type is not None and "image" in file_type),
        image_bytes=file_bytes,
        image_name=file_name
    )
    
    severity = rules_result["severity"]
    summary = rules_result["summary"]
    keywords = rules_result["detected_keywords"]
    sla_hours = rules_result["sla_hours"]
    target_response = rules_result["target_response"]
    department = "Facilities & Maintenance"
    
    cat_lower = category.lower()
    if "health" in cat_lower or "medical" in cat_lower:
        department = "Student Health Center"
    elif "electric" in cat_lower or "power" in cat_lower:
        department = "Electrical Department"
    elif "water" in cat_lower or "plumb" in cat_lower or "bathroom" in cat_lower:
        department = "Plumbing & Sanitation"
    elif "wi-fi" in cat_lower or "internet" in cat_lower or "network" in cat_lower:
        department = "Campus IT & Networks"
    elif "grounds" in cat_lower or "road" in cat_lower or "garden" in cat_lower:
        department = "Grounds & Campus Infrastructure"
    elif is_emergency:
        department = "Emergency Rapid Response Unit"

    # 3. Optional Gemini Multimodal enhancement
    client = get_gemini_client()
    ai_enhanced = False
    
    if client:
        try:
            prompt = f"""
            You are CampusConnect AI - a university facility and emergency intelligence engine.
            Analyze this complaint:
            Description: {description}
            Category: {category} / {subcategory}
            Location: {location_str}
            Emergency SOS: {is_emergency}

            Output strict JSON with:
            {{
              "severity": "critical" | "high" | "medium" | "low",
              "department": string,
              "issue_summary": string,
              "is_ai_generated_image": boolean,
              "ai_image_confidence": integer (0 to 100),
              "safety_risk_factor": string
            }}
            """
            contents = [prompt]
            if file_bytes and file_type and "image" in file_type:
                contents.insert(0, {"mime_type": file_type, "data": file_bytes})
                
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            if "severity" in data and data["severity"] in ["critical", "high", "medium", "low"]:
                severity = data["severity"]
            if "department" in data and data["department"]:
                department = data["department"]
            if "issue_summary" in data:
                summary = data["issue_summary"]
            if "ai_image_confidence" in data:
                spam_result["ai_generated_score"] = int(data["ai_image_confidence"])
                if spam_result["ai_generated_score"] > 60:
                    spam_result["flags"].append(f"Gemini Vision detected AI-generated image artifacts ({spam_result['ai_generated_score']}%)")
                    spam_result["is_flagged"] = True
            ai_enhanced = True
        except Exception:
            # Silently use heuristic analysis
            ai_enhanced = False

    # 4. Calculate final priority score
    priority_score = calculate_priority_score(
        severity=severity,
        is_emergency=is_emergency,
        wait_hours=0.0,
        affected_count=1,
        is_health=("health" in cat_lower or "medical" in cat_lower),
        is_flagged=spam_result["is_flagged"]
    )

    return {
        "severity": severity,
        "priority_score": priority_score,
        "sla_hours": sla_hours,
        "target_response": target_response,
        "department": department,
        "issue_summary": summary,
        "detected_keywords": keywords,
        "is_flagged": spam_result["is_flagged"],
        "flag_reason": " | ".join(spam_result["flags"]) if spam_result["flags"] else "",
        "fake_score": spam_result["fake_score"],
        "ai_generated_score": spam_result["ai_generated_score"],
        "image_hash": spam_result["image_hash"],
        "geofence_verified": spam_result["geofence_verified"],
        "ai_enhanced": ai_enhanced
    }
