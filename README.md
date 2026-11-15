
# GlacierWatch

> **Earth Ecosystem Trend Detective · Nepal Himalaya**  
> _Real-time Glacial Lake Outburst Flood (GLOF) intelligence, climate trend detection, and downstream hydrodynamic hazard modeling._

GlacierWatch is an end-to-end monitoring and early-warning intelligence platform designed for the high-altitude Nepal Himalaya (including **Tsho Rolpa**, **Imja Tsho**, and **Thulagi Lake**). By combining **NASA satellite observations**, **40-year climate reanalysis**, **hydrodynamic dam-breach physics (Froehlich)**, and **Copernicus 3D terrain routing**, GlacierWatch separates long-term climate signals from weather noise and pinpoints downstream exposure for vulnerable mountain communities.

---

## Project Overview & Architecture

- **Climate Reanalysis Engine:** Ingests daily 40-year records (1985–2025) of 2-meter air temperature (`T2M`) and precipitation (`PRECTOTCORR`) from **NASA POWER** at NASA Langley Research Center. Applies non-parametric **Mann-Kendall trend tests** with **Hamed-Rao serial correlation adjustments** and **Theil-Sen slope estimators** to detect real climatic warming trends.
- **Multi-Decadal Lake Delineation:** Uses **USGS / NASA Landsat (Collection 2 Level-2)** and **ESA Sentinel-2 (L2A)** via the **Microsoft Planetary Computer STAC API** with automated Modified Normalized Difference Water Index (MNDWI) segmentation to track lake surface expansion across 1990–2026.
- **Moraine Breach & Hydrodynamics:** Simulates peak breach discharge ($Q_p$) through Froehlich dam-breach empirical relationships and routes outburst flows along Digital Elevation Models (**Copernicus DEM GLO-30**).
- **Downstream Exposure & Critical Assets:** Maps flood arrival times, peak flood heights, and vulnerable settlements, bridges, and hydropower infrastructure along downstream river corridors via **OpenStreetMap**.
- **Interactive 3D UI & Narrative Scrollytelling:** High-performance React, TypeScript, Mapbox GL 3D, and interactive scrollytelling visualizer.

---
## Getting Started

### Prerequisites

- **Python 3.10+** (Python 3.11 or 3.12 recommended)
- **Node.js 18+** and **npm**
- A free [Mapbox Access Token](https://account.mapbox.com/) for the 3D map basemap and terrain.

---

### 1. Setting up the Backend

1. **Navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**

   ```bash
   # On macOS/Linux:
   python3 -m venv .venv
   source .venv/bin/activate

   # On Windows:
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **(Optional) Pre-warm NASA POWER cache:**

   ```bash
   python -m scripts.warm_cache
   ```

5. **Start the FastAPI backend server:**

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   - The API server will be live at `http://localhost:8000`
   - Interactive Swagger documentation is available at `http://localhost:8000/docs`

---

### 2. Setting up the Frontend

1. **Open a new terminal and navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set your Mapbox token:

   ```env
   VITE_MAPBOX_TOKEN=pk.your_actual_mapbox_token_here
   VITE_API_URL=http://localhost:8000
   ```

3. **Install Node modules:**

   ```bash
   npm install
   ```

4. **Run the frontend development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173` to explore the dashboard.

---

## Repository Structure

```text
├── backend/
│   ├── app/                    # FastAPI application, climate analytics & breach simulation
│   │   ├── main.py             # API endpoints (/api/lakes, /api/trends, /api/simulate, etc.)
│   │   ├── power.py            # NASA POWER API client & local caching
│   │   ├── trends.py           # Mann-Kendall & Theil-Sen statistical tests
│   │   ├── breach.py           # Froehlich dam-breach peak discharge calculation
│   │   ├── melt.py             # Positive degree-day (PDD) glacier melt scenarios
│   │   └── risk.py             # Analytical Hierarchy Process (AHP) risk scoring
│   ├── pipelines/              # STAC, satellite extraction & DEM routing scripts
│   │   ├── extract_lakes.py    # Multi-decadal Landsat/Sentinel lake extraction
│   │   ├── nrt_monitor.py      # Near-real-time satellite monitoring pipeline
│   │   ├── drainage_from_dem.py# Flow routing over Copernicus DEM
│   │   └── flood_Areas.py      # Downstream flood corridor hazard mapping
│   ├── data/                   # Master GeoJSON files, cached DEMs, and flood vectors
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── src/                    # React 18 + Vite + Tailwind CSS frontend
│   │   ├── detective/          # Guided climate trend detective & lake explorer
│   │   ├── components/         # Mapbox viewer, risk gauges, flood scrubber, modals
│   │   └── lib/                # API client and statistical charting utilities
│   ├── package.json
│   └── vite.config.ts
│
└── glacierwatch-motion/        # Cinematic scroll-driven story experience
```

---

##  Data Sources & Attributions

GlacierWatch is built entirely with open data and open-source scientific libraries:

- **NASA POWER Project (NASA Langley Research Center):** Daily air temperature (`T2M`) and precipitation (`PRECTOTCORR`) records (1985–2025). Funded through NASA Earth Science / Applied Science Program (`https://power.larc.nasa.gov`).
- **USGS / NASA Landsat Program:** Landsat Collection 2 Level-2 Surface Reflectance (1990–2018) for historical lake perimeter change (`https://landsat.gsfc.nasa.gov`).
- **ESA Copernicus Sentinel-2:** Sentinel-2 MSI Level-2A imagery (2018–2026) for near-real-time monitoring (`https://browser.dataspace.copernicus.eu`).
- **Copernicus Global DEM (COP-DEM-GLO-30):** 30-meter global elevation models for hydrological path tracing (`https://spacedata.copernicus.eu`).
- **Microsoft Planetary Computer STAC API:** Planetary-scale cloud data discovery and STAC access (`https://planetarycomputer.microsoft.com`).
- **OpenStreetMap Contributors:** Downstream infrastructure, road networks, and settlement assets (`https://www.openstreetmap.org`).

---


