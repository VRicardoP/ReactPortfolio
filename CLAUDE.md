# Frontend — Developer Context

## Stack
React 19 + Vite 7 + react-router-dom 7 + Three.js + tsparticles + Chart.js + Leaflet + i18next

## Project Layout
```
src/
  components/
    Background/     — 6 visual effects (Rain, Matrix, Parallax, Lensflare, Cube, Smoke)
    Dashboard/      — 8 admin dashboard windows (Stats, Map, ChatAnalytics, RecentVisitors, 4 job boards)
    Windows/        — 10 portfolio windows (Welcome, Profile, Education, Experience, etc.)
    UI/             — Toast, Tooltip
    ErrorBoundary.jsx
    ProtectedRoute.jsx
  hooks/
    usePortfolioData.js    — Fetches /portfolio-data.json (static, no backend)
    useDashboardData.js    — Parallel-fetches all dashboard API endpoints
    useDraggable.js        — Mouse drag for FloatingWindow
    useResizable.js        — 8-direction resize for FloatingWindow
    useTypewriter.js       — Character-by-character animation
    useVisitorTracking.js  — POSTs to /analytics/track once per session
    useWindowLayout.js     — Positions windows in a row on mount
  context/
    AuthContext.jsx    — JWT auth, login/logout, authenticatedFetch (auto-logout on 401)
    WindowContext.jsx  — Global window state (position, size, z-index, minimize/maximize)
    ThemeContext.jsx   — 3 themes (cyan/silver/amber), 6 backgrounds, persisted to localStorage
  pages/
    LoginPage.jsx      — i18n-enabled login form
    DashboardPage.jsx  — Admin dashboard with all 8 windows + theme controls
  i18n/
    index.js           — i18next config with LanguageDetector
    locales/en.json    — English translations
    locales/es.json    — Spanish translations
  styles/              — CSS files (base, windows-content, floating-window, dashboard, chat, login, etc.)
  App.jsx              — Portfolio page with 10 lazy-loaded windows
  main.jsx             — Router setup, providers (Theme, Auth, ErrorBoundary)
```

## Routing
```
/           → App.jsx (public portfolio)
/login      → LoginPage
/dashboard  → DashboardPage (requires auth via ProtectedRoute)
*           → redirect to /
```

## Key Patterns

### FloatingWindow (shell for all windows)
Every window (portfolio and dashboard) renders inside `FloatingWindow`. It provides:
- Dragging via `useDraggable`
- 8-direction resizing via `useResizable`
- Minimize/maximize/fit-to-content buttons
- Z-index management via `WindowContext`

### API Calls
- **Portfolio data**: Static JSON at `public/portfolio-data.json` (no backend)
- **Dashboard data**: Uses `authenticatedFetch()` from `AuthContext` (adds JWT header, auto-logout on 401)
- **Visitor tracking**: `useVisitorTracking` hook, fires once per session

### Backend URL
Centralized in `src/config/api.js`. Reads `VITE_API_BASE_URL` env var, fallback: `http://127.0.0.1:8001`.
Imported by: `AuthContext.jsx`, `useDashboardData.js`, `useVisitorTracking.js`

### i18n
Use `const { t } = useTranslation()` then `t('key')` for translatable text.
Locale files: `src/i18n/locales/en.json` and `es.json`.
Keys: `welcome.*`, `chat.*`, `contact.*`, `skills.*`, `windows.*`, `app.*`, `error.*`, `login.*`, `dashboard.*`

### Code Splitting (vite.config.js)
Manual chunks: `vendor-react`, `vendor-three`, `vendor-particles`, `vendor-charts`, `vendor-maps`

### External Assets (loaded at runtime)
- AWS S3 — Smoke texture for `SmokeEffect.jsx`
- Unsplash — Cube textures for `CubeEffect.jsx`
- Leaflet CDN — Map marker icons
- OpenStreetMap — Map tiles

## Running Tests
```bash
npx vitest run       # single run
npx vitest           # watch mode
```

## Notes
- All previous known gaps (i18n in dashboard, centralized backend URL) have been resolved
- See root `DEUDA_TECNICA.md` for resolved technical debt details
