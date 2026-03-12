# SGOD School Permit System

A web-based school permit management system developed for the **Schools Governance and Operations Division (SGOD)** of the **Department of Education (DepEd) – Cabuyao, Laguna**.

This system enables SGOD staff to efficiently register, monitor, and manage government permits issued to private schools within the Cabuyao City Schools Division.

---

## Features

- **School Registration** – Register regular or homeschool programs with full permit details
- **OCR Permit Extraction** – Automatically extract permit information from uploaded PDF/image documents
- **Interactive School Map** – View all registered schools on a geocoded interactive map (Leaflet + OpenStreetMap)
- **School Directory** – Browse and search schools in card or list view
- **Permit History Tracking** – Track yearly permit renewals per school
- **Branch/Campus Labels** – Differentiate multiple branches of the same school
- **Status Management** – Track Operational, For Renewal, and Not Operational schools
- **Trash Bin** – Soft-delete with 30-day retention and restore capability
- **PDF Report Export** – Generate permit reports filtered by school year and status
- **Notification System** – In-app notifications for system events
- **Audit Log** – Track all create, update, and delete actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Mapping | Leaflet + react-leaflet |
| Backend | FastAPI (Python 3.13) |
| OCR | PyPDF2 + PyMuPDF |
| Geocoding | geopy (Nominatim / OpenStreetMap) |
| Reports | openpyxl |

---

## Getting Started

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The frontend runs at `http://localhost:5173` and the backend API at `http://localhost:8000`.

---

## Project Structure

```
SGOD/
├── src/                  # React frontend
│   └── app/
│       ├── components/   # UI components
│       ├── contexts/     # React context (schools, notifications, audit log)
│       └── data/         # Type definitions and mock data
├── backend/              # FastAPI backend
│   └── app/
│       ├── main.py       # API endpoints (OCR, geocode, reports)
│       └── services/     # OCR, geocoding, reporting services
└── public/               # Static assets
```

---

## Author

**Juriella Mae C. Santos** ([@Ketsuchiha](https://github.com/Ketsuchiha))

Developed for the **Schools Governance and Operations Division (SGOD)**
**DepEd Schools Division of Cabuyao City, Laguna, Philippines**
