# Frontend — Developer Context

## Stack
React 19 + Vite 7 + react-router-dom 7 + Three.js + tsparticles + Chart.js + Leaflet + i18next

## Project Layout
```
src/
  components/
    Background/     — 6 visual effects (Rain, Matrix, Parallax, Lensflare, Cube, Smoke)
    Dashboard/      — 13 admin dashboard windows:
      StatsWindow, MapWindow, ChatAnalyticsWindow, RecentVisitorsWindow
      JobBoardTabbedWindow (12 sources in tabs), JobMarketAnalyticsWindow, BookmarkedJobsWindow
      JSearchLiveWindow, SalaryAnalyticsWindow, JobFilterWindow (unified search)
      SavedSearchesWindow, KanbanWindow, AIJobMatchWindow (embeddings + LLM)
      JobCardExtras.jsx — Shared freshness badges + company research popover
    Windows/        — 12 portfolio windows:
      WelcomeWindow, ProfileWindow, EducationWindow (timeline), ExperienceWindow (timeline)
      TechSkillsWindow (bars + radar), LanguagesWindow, PortfolioWindow
      ContactWindow, SoftSkillsWindow, AchievementsWindow, FitMatrixWindow (skills heatmap)
      TerminalWindow (easter egg), FloatingWindow (shell for all windows)
    UI/             — Toast, Tooltip
    ErrorBoundary.jsx
    ProtectedRoute.jsx
  hooks/
    usePortfolioData.js       — Fetches /portfolio-data.json (static, no backend)
    useDashboardData.js       — Parallel-fetches all dashboard API endpoints (returns warnings for failed sources)
    useSSENotifications.js    — Fetch-based SSE with Bearer auth for real-time notifications (new_visitor, new_chat, new_jobs)
    useDraggable.js           — Mouse drag for FloatingWindow
    useResizable.js           — 8-direction resize for FloatingWindow
    useTypewriter.js          — Character-by-character animation
    useVisitorTracking.js     — POSTs to /analytics/track once per session
    useWindowLayout.js        — Animates windows into minimized grid on mount (3/2/1 cols responsive)
    useJobBoardControls.js    — Shared sort, pagination, cache age badge for job boards
    useKanban.js              — Kanban pipeline state management and CRUD
  context/
    AuthContext.jsx    — JWT auth (access + refresh tokens), login/logout, authenticatedFetch (auto-logout on 401, auto-refresh)
    WindowContext.jsx  — Global window state (position, size, z-index, minimize/maximize, activeWindowId for focus indicator)
    ThemeContext.jsx   — 3 themes (cyan/silver/amber), 6 backgrounds, persisted to localStorage
  pages/
    LoginPage.jsx      — i18n-enabled login form
    DashboardPage.jsx  — Admin dashboard with 13 windows + theme controls
  i18n/
    index.js           — i18next config with LanguageDetector
    locales/en.json    — English translations (~250 keys)
    locales/es.json    — Spanish translations (~250 keys)
    locales/fr.json    — French translations
    locales/de.json    — German translations
    locales/ja.json    — Japanese translations
    locales/it.json    — Italian translations
  styles/              — CSS files (base, windows-content, floating-window, dashboard, chat, login, etc.)
  config/
    api.js             — Backend URL centralized (reads VITE_API_BASE_URL, fallback: http://127.0.0.1:8001)
    jobSources.js      — Centralized registry for all 12 job sources (key, color, urlPath, normalize, skillsField, alwaysRemote)
  App.jsx              — Portfolio page with 12 lazy-loaded windows + Ctrl+`/Ctrl+ñ terminal toggle
  main.jsx             — Router setup, providers (Theme, Auth, ErrorBoundary)
```

## Routing
```
/           → App.jsx (public portfolio, 12 windows)
/login      → LoginPage
/dashboard  → DashboardPage (requires auth via ProtectedRoute, 13 windows)
*           → redirect to /
```

## Key Patterns

### FloatingWindow (shell for all windows)
Every window (portfolio and dashboard) renders inside `FloatingWindow`. It provides:
- Dragging via `useDraggable` (CSS transitions only on box-shadow/border-color/opacity/width/height — never `transition: all`)
- 8-direction resizing via `useResizable`
- Minimize/maximize/fit-to-content buttons
- Z-index management + active window glow via `WindowContext` (`activeWindowId`)
- Accessibility: `role="dialog"`, `aria-label`, `tabIndex={0}`, Escape to minimize

### API Calls
- **Portfolio data**: Static JSON at `public/portfolio-data.json` (no backend)
- **Dashboard data**: Uses `authenticatedFetch()` from `AuthContext` (adds JWT header, auto-logout on 401)
- **Visitor tracking**: `useVisitorTracking` hook, fires once per session

### Backend URL
Centralized in `src/config/api.js`. Reads `VITE_API_BASE_URL` env var, fallback: `http://127.0.0.1:8001`.
Imported by: `AuthContext.jsx`, `useDashboardData.js`, `useVisitorTracking.js`

### i18n
Use `const { t } = useTranslation()` then `t('key')` for translatable text.
Locale files: `src/i18n/locales/{en,es,fr,de,ja,it}.json`.
Keys: `welcome.*`, `chat.*`, `contact.*`, `skills.*`, `windows.*`, `app.*`, `error.*`, `login.*`, `dashboard.*`, `terminal.*`

### Code Splitting (vite.config.js)
Manual chunks: `vendor-react`, `vendor-three`, `vendor-particles`, `vendor-charts`, `vendor-maps`
Warning limit: 700KB (Three.js core is ~522KB, lazy-loaded)

### External Assets (loaded at runtime)
- AWS S3 — Smoke texture for `SmokeEffect.jsx`
- Unsplash — Cube textures for `CubeEffect.jsx`
- Leaflet CDN — Map marker icons
- OpenStreetMap — Map tiles

### Job Board Features (shared across all 12 sources)
- Sort (4 options), pagination (20/page), cache age badge via `useJobBoardControls`
- Freshness badges: <24h green "New", <72h cyan, >72h hidden
- Company research: click company → popover with LinkedIn/Glassdoor/Crunchbase links
- Skills matching: multi-factor score badge (% match) on each card
- Favorites: localStorage-based bookmarks + BookmarkedJobsWindow

## Running Tests
```bash
npx vitest run       # single run
npx vitest           # watch mode
```

## Easter Egg
- Ctrl+` (primary) or Ctrl+ñ (fallback) toggles the Terminal window (`TerminalWindow.jsx`)
- Commands: help, about, skills, experience, education, ls, cat <file>, whoami, ping, sudo hire_me, history, clear
- Fake filesystem maps filenames to portfolio data commands
- All strings are i18n-ready via `terminal.*` keys

## Window Layout Behavior
- On page load, all windows animate into a minimized grid (3 cols desktop, 2 tablet, 1 mobile)
- No layout persistence — fresh arrangement every load
- Minimized windows reposition on window resize (debounced 250ms)
- Toast "Click on any window to explore!" after animation completes

## Notes
- AuthContext validates JWT `exp` claim on mount, auto-clears expired tokens. Refresh tokens auto-renew access tokens
- useDashboardData returns `warnings` array for failed API sources (no longer silently swallows errors)
- All previous known gaps (i18n in dashboard, centralized backend URL, job source duplication) have been resolved
- Job source registry: `config/jobSources.js` is the single source of truth. To add a new source, only add an entry there
- Background effects (Three.js/Canvas) use mount-only effects with `eslint-disable` — adding theme as dependency would destroy/recreate the entire 3D scene
