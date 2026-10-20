# BioSakhi 2.0

A single-page sanitation monitoring dashboard built with React, Tailwind CSS, Recharts, and FastAPI.

## Requirements
- Node.js 18+
- Python 3.10+

## Run the backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API docs: http://127.0.0.1:8000/docs

## Run the frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## Demo and hardware behavior
- The dashboard polls FastAPI every 3 seconds.
- While the backend is in demo mode, readings change gradually.
- Posting a reading to `POST /api/readings` switches the backend to hardware mode.
- Use `POST /api/demo` to return to simulated readings.
- The dashboard labels simulated readings as Demo Mode.

## Send readings from an ESP32
Send JSON to `http://YOUR_COMPUTER_LAN_IP:8000/api/readings` with this shape:
```json
{
  "temperature_c": 29.4,
  "ph": 7.1,
  "tank_level_pct": 62,
  "gas_ppm": 18,
  "sludge_level_pct": 34
}
```
Use the computer's LAN IP address, not `localhost`, in ESP32 firmware. Ensure the computer and ESP32 are on the same network and the firewall allows port 8000.

The API currently accepts readings as provided. Sensor calibration and conversion should be implemented and validated in the ESP32 firmware or a dedicated sensor-processing layer before using real measurements.

## API endpoints
- `GET /api/readings` returns the latest reading and connection metadata.
- `GET /api/history` returns recent chart points.
- `POST /api/readings` accepts a new sensor reading.
- `POST /api/demo` switches back to simulated readings.
- `GET /health` is a simple health check.
