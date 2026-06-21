<div align="center">

# 🔥 FireGuard Nexus

### AI-Powered Wildfire Early Warning & Response Platform

*Detect. Score. Simulate. Respond. — before a human ever has to make the call.*

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Docker](https://img.shields.io/badge/deploy-Docker-2496ED)

</div>

---

> 🛰️ **One Incident. Many eyes.** Every module — detection, risk, simulation, impact, reporting — reads and writes the *same* record, streamed live over a single WebSocket. No human relay between stages.

---

## 📑 Table of Contents

| | | |
|---|---|---|
| 🔥 [Why This Exists](#-why-this-exists) | 🏗️ [Architecture](#️-architecture) | 🧩 [Pipeline Modules](#-pipeline-modules) |
| 📊 [Damage Algorithm](#-damage-estimation-algorithm) | 🛠️ [Tech Stack](#️-tech-stack) | 🔌 [WebSocket Contract](#-websocket-contract) |
| 🚀 [Getting Started](#-getting-started) | 🧱 [Build Order](#-build-order) | 🛡️ [Security](#️-security) |
| ⚠️ [Limitations](#️-limitations--todo) | | |

---

## 🔥 Why This Exists

> Wildfires move faster than the people fighting them.

By the time someone spots smoke and calls it in, the fire has already chosen a direction. The bottleneck isn't *detection* — cameras and satellites can see fire almost instantly. The real gap is everything **after**: confirming it's real, scoring how dangerous it is, predicting where it spreads, and getting that into a responder's hands fast enough to matter.

Most existing tools solve one slice of this in isolation — a detector here, a risk dashboard there — each a standalone demo with no shared state. **FireGuard Nexus unifies the whole pipeline around a single shared record instead.**

---

## 🏗️ Architecture

```
        Ingestion ──┐
   (upload/webcam/   │
    stream/satellite)│
                      ▼
                 Detection (YOLOv8)
                      │
                      ▼
               ┌─── 🔥 INCIDENT ───┐
               │    (shared row)    │
   Risk Engine ┤                    ├ Simulation
    (XGBoost)  │                    │ (cellular automaton)
               │                    │
               └─── Impact Engine ──┘
                      │
                      ▼
              Report Generator (template NLG)
                      │
                      ▼
            WebSocket  →  /ws/live  →  📡 Dashboard
```

Every module reads from and writes to the same `Incident` row. Nothing is recomputed; nothing waits on a human to relay data between stages.

<details>
<summary>🗂️ <strong>The Shared Incident Object</strong> — click to expand</summary>

```
Incident
├─ id, lat, lng, timestamp
├─ confidence, status
├─ source: upload | webcam | stream | satellite
├─ RiskScore        (foreign key → Incident)
├─ SimulationFrame  (foreign key → Incident)
├─ ImpactEstimate   (foreign key → Incident)
└─ Report           (foreign key → Incident)
```

Detection creates the row. Every other module attaches to it. The report is simply the finished record, formatted for a human.

</details>

---

## 🧩 Pipeline Modules

| # | Module | What it does |
|:-:|--------|---------------|
| 01 | 🗄️ **Database** | `Incident`, `RiskScore`, `SimulationFrame`, `ImpactEstimate`, `Report` tables |
| 02 | 📥 **Input Ingestion** | Upload, webcam, livestream (`yt-dlp`), NASA FIRMS satellite poll |
| 03 | 🎯 **Detection** | YOLOv8 + temporal confirmation (5 consecutive frames) |
| 04 | 📈 **Risk Engine** | XGBoost on weather + vegetation + time → 0–100 score |
| 05 | 🌬️ **Spread Simulation** | Wind-biased cellular automaton, +10/30/60/180 min |
| 06 | 💥 **Impact Engine** | Formula-based trees / wildlife / CO2 / dollar-damage estimate |
| 07 | 📝 **Report Generator** | Template-based NLG — no live LLM call |
| 08 | 🐳 **Docker Compose** | FastAPI + PostgreSQL, single `docker compose up` |

---

## 📊 Damage Estimation Algorithm

> ⚙️ **Deterministic, not learned.** Every figure traces back to the burned-area polygon produced by the simulation.

```python
burned_hectares      = polygon_area_m2 / 10_000

trees_lost           = burned_hectares × avg_tree_density_per_hectare
wildlife_affected    = burned_hectares × avg_wildlife_density_per_hectare
CO2_tons             = burned_hectares × biomass_per_hectare \
                         × combustion_factor × carbon_fraction × (44 / 12)
dollar_damage        = burned_hectares × estimated_value_per_hectare
```

📌 All per-hectare constants are cited from regional forestry/ecological inventory data in code comments — not measured live. This keeps the engine **fully auditable**: every number traces to the exact constant that produced it, with zero risk of a model inventing a figure it was never trained on.

---

## 🛠️ Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| 🌐 API | **FastAPI** | Fast, and shares Python with every AI library — no translation layer |
| 🎯 Detection | **YOLOv8** | Industry-standard real-time detection; pre-trained on fire/smoke, fine-tuned not trained from scratch |
| 📈 Risk scoring | **XGBoost** | Millisecond inference, interpretable feature importances, built for tabular weather data |
| 🌬️ Spread simulation | **Cellular automaton** | Same physics-based approach as real wildfire-modeling tools — no black box |
| 🛰️ Satellite data | **NASA FIRMS API** | Independent hotspot detection, works with zero cameras nearby |
| 📹 Live ingestion | **yt-dlp + OpenCV** | Turns any public livestream into a 24/7 fire-watch feed |
| 🗄️ Database | **Supabase (PostgreSQL)** | Hosted Postgres, free tier, single source of truth per Incident |
| ⚡ Realtime | **WebSocket** (`/ws/live`) | Push updates the instant each stage finishes — no polling |
| 📝 Reporting | **Template NLG** | Deterministic, hallucination-free, no inference latency |

---

## 🔌 WebSocket Contract

Every module pushes through `/ws/live` in the same envelope:

```json
{
  "type": "...",
  "incident_id": "...",
  "data": { ... }
}
```

| Type | Meaning |
|------|---------|
| 🆕 `detection_new` | Confirmed Incident created |
| 📈 `risk_update` | XGBoost score + feature importances |
| 🌬️ `simulation_frame` | Each spread polygon as computed |
| 💥 `impact_update` | Trees / wildlife / CO2 / dollar estimate |
| 📝 `report_ready` | Filled report template available |
| 🛰️ `satellite_hotspot` | NASA FIRMS hotspot point |

---

## 🚀 Getting Started

```bash
git clone <repo-url>
cd fireguard-nexus
docker compose up
```

This brings up the `api` (FastAPI) and `db` (PostgreSQL 16) services. A `frontend` stub service is left open for UI development.

---

## 🧱 Build Order

```
DB → Ingestion → WebSocket contract (dummy data) → Risk → Simulation → Impact → Report → Docker
```

The WebSocket contract is built and tested against fake messages of every type **before** the AI modules are finished, so frontend work is never blocked on model development.

---

## 🛡️ Security

<details>
<summary><strong>Click to expand security measures</strong></summary>

| Area | Control |
|------|---------|
| 🔑 Auth | Bearer-token (JWT/API key) on every mutating endpoint; role-scoped read/write tokens |
| 📂 Uploads | Magic-byte/MIME validation before files reach OpenCV/YOLOv8; size & rate caps |
| 🗄️ Database | Parameterized queries + Postgres Row-Level Security as defense-in-depth |
| 🔌 WebSocket | Authenticated handshake; server is the sole broadcaster, clients can't inject |
| 🔐 Secrets | Env vars / secrets manager only — never committed or baked into images |
| 🌐 Network | TLS-only, DB port never exposed, CORS allow-listed |
| 🚦 Rate limiting | Token-bucket limits on ingestion endpoints to block flooding/spoofing |
| 📜 Audit trail | Every Incident write logged with actor, timestamp, and source |

</details>

---

## ⚠️ Limitations / TODO

- [ ] Risk model trained on a small synthetic dataset — real historical fire/weather data needed
- [ ] Vegetation density is currently a static/mock dataset for v1
- [ ] Impact estimates use regional averages, not live ground-truth measurement

---

<div align="center">

**FastAPI · PostgreSQL · YOLOv8 · XGBoost · WebSocket · Docker**

*Built for the moment between "spotted" and "understood."* 🔥

</div>
