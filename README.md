<div align="center">
  <img src="/Users/vikaskr/.gemini/antigravity/brain/756aa1e2-457d-43c2-a12f-53617d048742/vitalis_banner_1779190004449.png" alt="Vitalis AI Banner" width="100%">

  # ✨ Vitalis AI
  **The Intelligent Healthcare Ecosystem**

  [![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=flat&logo=next.js)](https://nextjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Three.js](https://img.shields.io/badge/Three.js-3D-black?style=flat&logo=three.js)](https://threejs.org/)
  [![Gemini AI](https://img.shields.io/badge/AI-Gemini_2.0-blue?style=flat)](https://deepmind.google/technologies/gemini/)
  
  *Empowering users with AI-driven symptom triage, health monitoring, and emergency support.*
  
  > ⚠️ **Disclaimer:** Educational demo only. Not a replacement for a licensed medical professional.

</div>

<br/>

## 🌟 Overview

**Vitalis AI** is a state-of-the-art healthcare assistance platform designed to bridge the gap between patients and medical guidance. By leveraging natural language processing and advanced AI, Vitalis AI helps users understand their symptoms, access triage recommendations, and monitor their overall well-being.

<div align="center">
  <img src="/Users/vikaskr/.gemini/antigravity/brain/756aa1e2-457d-43c2-a12f-53617d048742/triage_mockup_1779190041177.png" alt="Triage Mockup" width="80%">
</div>

---

## 🚀 Key Features

- 🧠 **AI Triage Assistant:** Describe symptoms in plain language and get instant, intelligent care recommendations.
- 🚨 **Emergency Safety System:** Critical symptom patterns automatically trigger 108 ambulance guidance and red-flag alerts.
- 🧘 **Mental Health Screening:** Dedicated mental wellness check (inspired by PHQ-2 & GAD-2) seamlessly integrated into the triage flow.
- 🫀 **Biological Dashboard & 3D Visualization:** Monitor simulated biometrics and explore interactive 3D human body models using Three.js.
- 🌍 **Multilingual & Offline Support:** Designed for accessibility with Hindi and Kannada support, plus an offline fallback rule engine for low-connectivity regions.
- 📱 **Report Sharing & Telehealth:** Easily share medical summaries via WhatsApp and launch Zoom consultations.

---

## 📂 Project Structure

A clean, modular monorepo architecture separating the modern frontend from the powerful AI backend.

```text
aifusion-main/
├── frontend/                 # Next.js 15 Frontend Application
│   ├── src/
│   │   ├── app/              # App Router (Pages & Layouts)
│   │   ├── components/       # Reusable UI Components
│   │   └── lib/              # Utilities & API Clients
│   ├── public/               # Static Assets
│   ├── package.json          # Frontend Dependencies
│   └── tailwind.config.ts    # Tailwind CSS Configuration
│
├── backend/                  # FastAPI Python Backend
│   ├── main.py               # Core API & Gemini AI Integration
│   ├── triage_severity.py    # Rule-based fallback triage logic
│   ├── requirements.txt      # Python Dependencies
│   └── .env.example          # Environment Variables Template
│
├── start.ps1                 # Windows Startup Script
└── README.md                 # Project Documentation
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript | Modern, high-performance UI |
| **Styling** | Tailwind CSS, Framer Motion | Responsive and animated design |
| **3D Graphics** | Three.js, React Three Fiber | Interactive body visualization |
| **Backend** | FastAPI (Python) | High-speed AI API endpoints |
| **AI Engine** | Google Gemini 2.0 Flash | Advanced natural language understanding |
| **Offline Safety**| Custom Rule System | Deterministic fallback when offline |

---

## 💻 How to Run the Project

Follow these steps to get Vitalis AI running on your local machine.

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- A Google Gemini API Key

### 1. Start the Backend

Open a terminal, navigate to the `backend` directory, and start the FastAPI server:

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt uvicorn

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run the server
uvicorn main:app --reload --port 8000
```
*The backend will be available at `http://localhost:8000`.*

### 2. Start the Frontend

Open another terminal, navigate to the `frontend` directory, and start the Next.js development server:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
*The frontend will be available at `http://localhost:3000`.*

---

## 💡 Innovation & Impact

Vitalis AI is built with **India-first healthcare usability** in mind. By combining physical and mental health triage with offline capabilities and multilingual support, it targets:
- Rural healthcare accessibility
- First-response emergency scenarios
- Underserved communities with low digital literacy

---

## 🔮 Future Scope
- **Hospital Integration:** FHIR standard integration for seamless EHR sync.
- **Wearables:** Real-time sensor integration for live biometric data.
- **Advanced NLP:** Broader multilingual support and more nuanced symptom extraction.
- **HIPAA/ABHA Compliance:** Secure cloud medical infrastructure for production deployment.

<div align="center">
  <br/>
  <i>Built with ❤️ for a healthier tomorrow.</i>
</div>
