# Yoga Studio Valentina - Gemini Instructions

Keep this file in the project root. It provides core rules for Gemini models interacting with this codebase in future iterations or exports.

## 🚀 Development Guidelines

- **Style Theme Consistency:** Keep the elegant, peaceful, and clean "Yoga Studio" design. Use deep slates paired with sage and emerald shades (`#059669`, `#064e3b`, `#d1fae5`, slate grays). Keep touch targets large and accessible (minimum 44px).
- **Asset Portability:** Maintain `base: './'` in `vite.config.ts` to keep assets functional when migrating between local development, Google Run, and GitHub Pages.
- **Interactive Recharts:** Retain custom interactive elements on Recharts bars and axes. If you update the administrator dashboard, ensure filters bound to Recharts state (`chartSelectedInstructor` toggling values on click) are preserved.
- **Dependencies:** All imports must follow React 19 standards. Icons are strictly from `lucide-react`. Motion sequences must import from `motion` (using `"motion"`).

## 📊 Summary of Active Files
- `/src/App.tsx` - App-wide portal orchestrator & role coordinator.
- `/src/components/LoginScreen.tsx` - Portal-ready secure login screen.
- `/src/components/AdminDashboard.tsx` - Core metrics panel, interactive instructor/reservation filtering bars, student list, and class manager.
- `/src/components/InstructorPortal.tsx` - Specific view for scheduling, attendance tracking, and individual class sessions.
- `/src/components/StudentPortal.tsx` - Real-time seat reservation screen, visual class schedule grids, and pass balance indicators.
- `/src/firebase.ts` - Client config for Firestore database integration.
