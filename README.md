<div align="center">

  <img src="public/favicon.svg" alt="ScheduleMaker Logo" width="80" height="80" />

  # ScheduleMaker • صانع الجداول

  **Intelligent Schedule Generator for Sultan Qaboos University**

  [![Version](https://img.shields.io/badge/version-2.0.0-black?style=for-the-badge)](https://github.com/Muhanad2004/ScheduleMaker/releases)
  [![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
  [![Status](https://img.shields.io/badge/Status-Stable-success?style=for-the-badge)](https://muhanad2004.github.io/ScheduleMaker/)

  [**View Live Demo**](https://muhanad2004.github.io/ScheduleMaker/)
  
  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#arabic">عربي</a>
  </p>

</div>

---

## ⚡ Overview

**ScheduleMaker** is a high-performance web application designed to solve the complex problem of course scheduling. It automates the process of finding conflict-free timetables for SQU students, transforming hours of manual trial-and-error into seconds of computation.

Recently updated to **v2.0**, the application features a refined monochrome design system, professional typography (IBM Plex Sans), and a lightweight, fast architecture.

## ✨ Key Features

### 🚀 Smart Scheduling
- **Automated Generation:** Instantly computes *every* valid schedule combination based on your selected courses.
- **Conflict Detection:** Identifies and filters out time conflicts automatically.
- **Custom Filters:** 
  - Block specific time slots (e.g., "No classes after 4 PM").
  - Filter by specific instructors.

### 🎨 Modern UI/UX (v2.0)
- **Monochrome Design System:** A clean, professional black & white aesthetic that minimizes distraction.
- **Bilingual Interface:** Seamless RTL/LTR switching between English and Arabic.
- **Responsive Layout:** Fully optimized for Desktop, Tablet, and Mobile.
- **Accessibility:** High-contrast elements, scalable typography, and keyboard navigation support.

### 📄 Powerful Export
- **PDF Generation:** High-fidelity A5 schedule exports using `jsPDF`.
- **Theme-Aware:** Schedules export with optimized pastel colors for readability.
- **Batch Export:** Download all possible schedule variations at once.

## 🛠 Tech Stack

Built with a focus on performance and maintainability:

| Category | Technology |
|----------|------------|
| **Core** | React 19, Vite 7 |
| **Styling** | CSS Variables (Theming), CSS Modules |
| **Icons** | Lucide React |
| **PDF Engine** | jsPDF, jspdf-autotable |
| **Data** | XLSX (Excel parsing) |
| **Fonts** | IBM Plex Sans (Latin), IBM Plex Sans Arabic |

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Muhanad2004/ScheduleMaker.git
   cd ScheduleMaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
```
The output will be in the `dist/` folder, ready for deployment.

## 📁 Project Structure

```bash
src/
├── components/       # UI Components (ScheduleViewer, FilterPanel, etc.)
├── utils/           # Core Logic (Scheduler engine, Time parsing)
├── assets/          # Static assets
├── App.jsx          # Main application layout & state
└── index.css        # Global styles & Design System variables
```

## <span id="arabic">🌐 نبذة عن المشروع</span>

**صانع الجداول** هو تطبيق ويب مصمم لطلاب جامعة السلطان قابوس لتسهيل عملية تسجيل المواد. يقوم التطبيق بإنشاء جميع جداول الدراسة الممكنة بناءً على المواد المختارة، مع مراعاة أوقات التعارض وتفضيلات المدرسين.

**المميزات الرئيسية:**
- واجهة مزدوجة اللغة (عربي / إنجليزي).
- إنشاء جداول خالية من التعارض تلقائياً.
- إمكانية حظر أوقات محددة أو اختيار مدرسين معينين.
- تصدير الجداول كملفات PDF عالية الجودة.
- تصميم عصري وسريع الاستجابة للهواتف والأجهزة اللوحية.

---

<div align="center">

**Created by Muhanad**

[![GitHub](https://img.shields.io/badge/GitHub-Muhanad2004-181717?style=flat&logo=github)](https://github.com/Muhanad2004)

</div>
