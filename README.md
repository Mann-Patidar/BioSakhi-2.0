# BioSakhi 2.0 — Sanitation Operations Dashboard

React + Vite + Tailwind CSS + Recharts frontend with a FastAPI API. Includes sensor monitoring, device details, CSV export, a detailed downloadable maintenance guide, citizen complaint intake/status tracking, a village sanitation risk-map prototype, Swachh Passport pit lifecycle records, treatment-unit tracking, biochar filter monitoring, site assessments, and full English/Hindi interface translation, a detailed bilingual maintenance guide, and wrapping navigation tabs without a horizontal scrollbar.

## Requirements
- Node.js 18+
- Python 3.10+

## 1. Start the FastAPI backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API docs: http://127.0.0.1:8000/docs

## 2. Start the frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## Frontend navigation
- **Overview:** current readings, sensor trends, alerts, and CSV download.
- **Device details:** device ID, connectivity, latest readings and CSV export.
- **Swachh Passport:** pit switching/resting lifecycle, dosing records, sensor values, photo filenames, household confirmation and human-reviewed reuse status.
- **Treatment Unit:** module/media identity, inspections, media replacement and sample-linked inlet/outlet test records.
- **Biochar Filter:** filter and media batch tracking, maintenance history and inlet/outlet laboratory records held as Pending Verification.
- **Site assessment:** soil, reliable groundwater source/depth, drinking-water distance, lining condition, flood exposure and inspection history.
- **Maintenance guide:** detailed safety, sensor, treatment-media, pit-resting and site-protection guidance downloadable as a `.txt` file.
- **Complaints:** submit a report (for example, a broken water tap), track it, and update its status as a worker.
- **Village risk map:** schematic installation overview, risk filters and workload by village.

## Sensor API
`GET /api/readings` and `GET /api/history` are retained. The ESP32 can continue posting to `POST /api/readings`:
```json
{
  "temperature_c": 32.5,
  "ph": 7.2,
  "tank_level_pct": 65,
  "gas_ppm": 120,
  "sludge_level_pct": 40,
  "device_id": "biosakhi-esp32"
}
```
Use your computer's LAN IP in the ESP32 URL, not `localhost`. Keep the ESP32 and computer on the same network and allow port 8000 through the firewall.

## Complaint API added
- `GET /api/complaints` — list complaints.
- `POST /api/complaints` — submit a complaint.
- `PATCH /api/complaints/{complaint_id}` — update status (`Open`, `Assigned`, `In progress`, `Resolved`).

**Prototype limitation:** complaints are held in backend memory and will be lost when the backend restarts. This is useful for a hackathon demonstration, but production use requires a persistent database, official/worker authentication and role-based permissions, assignment notifications, privacy controls, and audit history. Anyone who can reach this prototype API can currently update a complaint status; do not expose it publicly as-is.

## Village Sanitation Risk Map limitations
The risk map currently uses illustrative sample installation records and schematic pin positions, not real GPS coordinates. Replace `installations` in `frontend/src/App.jsx` with registered installation records and coordinates. For a real geographic map, connect a mapping library (such as Leaflet) and a verified GIS dataset. Risk counts and workload must be backed by real inspection and maintenance records before official use.

## Safety and sensor notes
Sensor thresholds and the sample risk data are prototype defaults. Validate sensor type, calibration, placement and thresholds before operational use. Sensor values do not certify that a tank is safe or pathogen-free. Never enter septic tanks or pits; confined-space work must be done only by trained and authorized personnel.

## New prototype data storage and limitations
The Swachh Passport, Treatment Unit, Biochar Filter and Site Assessment records are stored in the browser's `localStorage`; they are not shared across users or devices and are not written to the FastAPI database. The photo and laboratory-report inputs currently record selected filenames only, not file bytes. Connect authenticated upload storage and persistent database models before using this for field operations.

The language selector switches the interface between English and Hindi, including navigation, page headings, form labels, buttons, select-option labels, status badges, maintenance instructions and the downloadable maintenance guide. The interface uses a local translation dictionary; review translations with a Hindi-speaking field user before public deployment. Additional languages should be added with reviewed dictionaries rather than machine-translating safety-critical guidance.

The requested Online badge is a prototype display state and must not be interpreted as proof that a physical ESP32 is connected. The separate FastAPI connection panel indicates whether the browser can reach the backend. Initial prototype readings are 32.5 °C, 65% tank level, 120 gas units and 40% sludge indicator. They are sample values unless confirmed from actual sensor posts.

Swachh Passport status is an administrative record, not a medical or environmental certification. Do not reuse pit contents based only on resting duration or sensor readings. Require the applicable local protocol, laboratory evidence where required, and qualified authorization. Laboratory results remain Pending Verification until reviewed.


## Latest frontend fixes

- Maintenance guide expanded to nine detailed field sections covering reporting, inspections, personal safety, device/sensor checks, tank/gas indicators, treatment units, biochar filters, Swachh Passport, site/water protection and task closure.
- Maintenance guide download follows the selected language (English or Hindi).
- Hindi mode translates interface strings and labels across the pages; select options keep their internal English values so form state/API behaviour remains stable.
- Main navigation wraps onto multiple lines on narrow screens and hides the horizontal scrollbar.
