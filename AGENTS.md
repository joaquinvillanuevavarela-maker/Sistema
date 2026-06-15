# Yoga Studio Valentina - Agent Instructions

Welcome! This file serves as a persistent context, prompt history, and technical spec backup for **Yoga Studio Valentina**. If you export this project and open it elsewhere (or continue working on it in a different session), this file informs subsequent AI models exactly what this project is, how it is built, and what development rules must be followed.

## 📋 Project Context & Purpose

- **Name:** Yoga Studio Valentina
- **Description:** A comprehensive, beautiful, modern real-time management system designed specifically for a Yoga Studio. It handles student registrations, class scheduling, packages/passes management, instructor portals, and high-fidelity analytical dashboards for Valentina (the administrator).
- **Current Aesthetic & Theme:** Calming, premium, high-integrity design. Fits the energy of a professional yoga studio perfectly. It balances slate/gray tones with fresh emerald/sage green accents (`#059669`, `#064e3b`, `#d1fae5`) for an eye-safe, polished experience.

---

## 🛠️ Tech Stack & Key Files

This application is built as a complete client-side single-page application (SPA) with integrated persistence:
- **Routing & Framework:** React (v19) & TypeScript, bundled via Vite.
- **Styling:** Tailwind CSS (v4) with standard module configuration (`@tailwindcss/vite`).
- **Icons:** Modern responsive icons exclusively from `lucide-react`.
- **Database / Backend:** Firebase Firestore & Authentication (`/src/firebase.ts`) for real-time bookings, user sessions, package updates, and metadata.
- **Charts:** Highly interactive charts using `recharts` (`BarChart`, `PieChart`, etc.) inside the admin dashboard.
- **Animations:** Fluid layout transitions and interactions using `motion` (imported from `motion/react` or `motion`).

### Component Roadmap
- `/src/App.tsx`: Main routing and portal switching engine (controls whether a user sees the Student, Instructor, Admin, or Login view based on Firestore roles.
- `/src/components/LoginScreen.tsx`: Secure visual portal supporting role-based authentication logins (Student, Instructor, Admin).
- `/src/components/AdminDashboard.tsx`: High-end metrics suite, booking trackers, class controller, instructor workload monitor, and advanced Recharts metrics with custom click filters.
- `/src/components/InstructorPortal.tsx`: Custom workspace for yoga instructors to see their schedules, marked attendees, and details.
- `/src/components/StudentPortal.tsx`: Smooth client interface where students can book classes, see their remaining class packages (pases), and track attendance history.
- `/src/types.ts`: Strictly typed data models for Classes, Bookings, Users (with role: 'admin' | 'instructor' | 'student'), Packages (active pases), and History logs.

---

## 🎯 Specific Implementation Safeguards & Customizations

When modifying or expanding intermediate parts of the code, never break these highly specific custom features:

1. **Dashboard Click-filters on Charts:**
   - In `AdminDashboard.tsx`, the main instructor reservation `BarChart` has interactive custom ticks and cells. 
   - Clicking on a bar or an instructor's text name on the horizontal XAxis filters the dashboard data to show *just* that instructor's classes (`chartSelectedInstructor` toggled between name and `'todos'`).
   - The fill colors of active cells dynamically transition to deep forest emerald (`#064e3b`) when selected, light pastel emerald (`#d1fae5`) when unfocused, or solid rich emerald (`#059669`) when unfiltered.
   - **Do not break this click-state interactive feedback loop.**

2. **GitHub Pages & Multi-Platform Compatibility:**
   - The app config contains `base: './'` in `vite.config.ts`.
   - This ensures all static asset paths (JS, CSS, images) remain strictly relative, meaning this site will run flawless on:
     - Google AI Studio's preview iframe
     - Local deployments (`npm run dev`)
     - Standard Cloud hosting
     - Standard GitHub Pages subfolders seamlessly without asset URL breakages.
   - **Keep `base: './'` configured.**

3. **Routing without External Server Dependencies:**
   - The React state is configured gracefully to switch portals dynamically based on the current firebase user role profile without hard breaks. Do not introduce custom Express backend routes unless specifically requested/required.

---

## 🕒 Prompt History & Evolution

Here is a summary of the key progression and user requests that shaped Yoga Studio Valentina, preserved for future context:

1. **Phase 1: Foundation & Firebase Rules**
   - Bootstrapped fully typed portals for Student, Instructor, and Admin workspaces.
   - Enabled real-time subscription synchronization, class pass reductions, and checkout rules.
2. **Phase 2: UI Visual Refinements & Layout Polish**
   - Replaced default charts with modern, customized Recharts components.
   - Adapted the colors to follow a peaceful, highly professional Yoga studio theme.
3. **Phase 3: Chart Interactions**
   - Implemented interactive custom elements (clickable horizontal labels and dynamic bar charts) inside the administrative panel allowing quick-filtering.
4. **Phase 4: Export Setup**
   - Configured Vite configuration rules (`base: './'`) enabling direct export to GitHub and GitHub Pages while upholding 100% functionality inside AI Studio and custom live previews.
