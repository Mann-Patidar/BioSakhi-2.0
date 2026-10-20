from datetime import datetime, timezone
from random import uniform
from threading import Lock
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="BioSakhi 2.0 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

lock = Lock()
demo_mode = True
last_received_at: Optional[datetime] = None

class SensorReading(BaseModel):
    temperature_c: float = Field(ge=-20, le=100)
    ph: float = Field(ge=0, le=14)
    tank_level_pct: float = Field(ge=0, le=100)
    gas_ppm: float = Field(ge=0, le=100000)
    sludge_level_pct: float = Field(ge=0, le=100)
    device_id: str = "biosakhi-esp32"

class ReadingResponse(SensorReading):
    timestamp: str
    demo_mode: bool
    device_online: bool
    last_updated: str

class HistoryPoint(BaseModel):
    time: str
    temperature_c: float
    ph: float
    tank_level_pct: float

class ComplaintCreate(BaseModel):
    name: str = ""
    village: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=240)
    category: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=8, max_length=3000)
    contact: str = Field(default="", max_length=40)
    created_at: Optional[str] = None
    status: str = "Open"
    priority: str = "Normal"

class ComplaintStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Open|Assigned|In progress|Resolved)$")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def initial_reading() -> dict:
    return {
        "temperature_c": 29.1,
        "ph": 7.2,
        "tank_level_pct": 54.0,
        "gas_ppm": 24.0,
        "sludge_level_pct": 31.0,
        "device_id": "biosakhi-demo",
        "timestamp": now_iso(),
    }

latest = initial_reading()
history: List[dict] = []
complaints: List[dict] = []
next_complaint_number = 1

def add_history(reading: dict) -> None:
    point = {
        "time": datetime.now().astimezone().strftime("%H:%M:%S"),
        "temperature_c": round(float(reading["temperature_c"]), 1),
        "ph": round(float(reading["ph"]), 2),
        "tank_level_pct": round(float(reading["tank_level_pct"]), 1),
    }
    history.append(point)
    del history[:-30]

for _ in range(8):
    add_history(latest)

def simulate_reading() -> dict:
    global latest
    with lock:
        latest = {
            "temperature_c": round(max(18, min(42, latest["temperature_c"] + uniform(-0.25, 0.25))), 1),
            "ph": round(max(5.0, min(9.5, latest["ph"] + uniform(-0.04, 0.04))), 2),
            "tank_level_pct": round(max(0, min(100, latest["tank_level_pct"] + uniform(-0.5, 0.8))), 1),
            "gas_ppm": round(max(0, latest["gas_ppm"] + uniform(-1.8, 2.2)), 1),
            "sludge_level_pct": round(max(0, min(100, latest["sludge_level_pct"] + uniform(-0.15, 0.25))), 1),
            "device_id": "biosakhi-demo",
            "timestamp": now_iso(),
        }
        add_history(latest)
        return dict(latest)

@app.get("/health")
def health():
    return {"status": "ok", "service": "BioSakhi 2.0 API"}

@app.get("/api/readings")
def get_readings():
    if demo_mode:
        reading = simulate_reading()
    else:
        reading = dict(latest)

    received = last_received_at
    online = demo_mode or (
        received is not None and (datetime.now(timezone.utc) - received).total_seconds() < 20
    )
    updated = reading.get("timestamp", now_iso())
    return {
        **reading,
        "demo_mode": demo_mode,
        "device_online": online,
        "last_updated": updated,
    }

@app.get("/api/history")
def get_history():
    return {"points": list(history[-30:]), "demo_mode": demo_mode}

@app.post("/api/readings")
def receive_reading(payload: SensorReading):
    global latest, demo_mode, last_received_at
    reading = payload.model_dump()
    reading["timestamp"] = now_iso()
    with lock:
        latest = reading
        demo_mode = False
        last_received_at = datetime.now(timezone.utc)
        add_history(latest)
    return {"accepted": True, "message": "Reading received", "timestamp": reading["timestamp"]}

@app.post("/api/demo")
def enable_demo():
    global demo_mode, last_received_at, latest
    with lock:
        demo_mode = True
        last_received_at = None
        latest = initial_reading()
        history.clear()
        for _ in range(8):
            add_history(latest)
    return {"demo_mode": True, "message": "Demo readings enabled"}


@app.get("/api/complaints")
def list_complaints():
    """Return complaints submitted to this running prototype API."""
    with lock:
        return {"complaints": list(reversed(complaints))}

@app.post("/api/complaints", status_code=201)
def create_complaint(payload: ComplaintCreate):
    """Create a complaint. Prototype records are held in memory, not a database."""
    global next_complaint_number
    complaint = payload.model_dump()
    complaint["id"] = f"BS-C-{next_complaint_number:04d}"
    complaint["created_at"] = complaint.get("created_at") or now_iso()
    complaint["status"] = "Open"
    with lock:
        next_complaint_number += 1
        complaints.append(complaint)
    return {"accepted": True, "complaint": complaint}

@app.patch("/api/complaints/{complaint_id}")
def update_complaint(complaint_id: str, payload: ComplaintStatusUpdate):
    """Allow the prototype worker view to update complaint status."""
    with lock:
        for complaint in complaints:
            if complaint["id"] == complaint_id:
                complaint["status"] = payload.status
                return {"updated": True, "complaint": complaint}
    raise HTTPException(status_code=404, detail="Complaint not found")
