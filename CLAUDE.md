# Frontend — Developer Context

## Stack
React 19 + Vite 7 + react-router-dom 7 + Three.js + tsparticles + Chart.js + Leaflet + i18next

## Project Layout
```
src/
  components/
    Background/     — 6 visual effects (Rain, Matrix, Parallax, Lensflare, Cube, Smoke)
    Dashboard/      — 12 admin dashboard windows + layout components:
      StatsWindow, MapWindow, ChatAnalyticsWindow, RecentVisitorsWindow
      JobBoardTabbedWindow (12 sources in tabs), JobMarketAnalyticsWindow
      SelectedOffersPanel (Kanban pipeline + document preview)
      JSearchLiveWindow, JobFilterWindow (unified search)
      SavedSearchesWindow, AIJobMatchWindow (embeddings + LLM + title translation)
      HeatmapWindow (interaction heatmap canvas + engagement Chart.js graphs)
      KanbanBoard.jsx — Drag-and-drop pipeline (saved/applied/interview/offer/rejected)
      DocumentPreview.jsx — CV/Cover Letter preview with tabs + PDF/JSON download
      DesktopDashboardContent.jsx — Desktop floating windows layout
      MobileDashboardLayout.jsx — Mobile tabbed layout
      dashboardConstants.js — Shared tab definitions + page size constants (JOBS_PAGE_SIZE, AI_MATCH_PAGE_SIZE)
      JobCardExtras.jsx — Shared freshness badges + company research popover
    Windows/        — 11 portfolio windows:
      WelcomeWindow, ProfileWindow, EducationWindow (timeline), ExperienceWindow (timeline)
      TechSkillsWindow (bars + radar + skills gap), LanguagesWindow, PortfolioWindow
      ContactWindow, SoftSkillsWindow, AchievementsWindow
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
    useInteractionTracking.js — Captures clicks + window focus events, batches via sendBeacon every 10s
    useHeatmapData.js         — Fetches heatmap + engagement stats from dashboard (authenticatedFetch)
    useWindowLayout.js        — Animates windows into minimized grid on mount (3/2/1 cols responsive, named constants)
    useJobBoardControls.js    — Shared sort, pagination, cache age badge for job boards
    useJobApplication.js      — Shared handleApply/handleSave + appliedIds/savedIds tracking (used by 4 dashboard windows)
    useDocumentGeneration.js  — AI CV/Cover Letter generation lifecycle (generate, fetch, download PDF/JSON)
    useTerminalCommands.js    — Terminal command dispatch via registry (builds context, delegates to terminalCommands.js)
    useSavedSearches.js       — Extracted from SavedSearchesWindow: saved searches state + API logic
    useKanban.js              — Kanban pipeline state management and CRUD
    useJobFilter.js           — Extracted from JobFilterWindow: filters state, search/clear/save callbacks
    useJSearchLive.js         — Extracted from JSearchLiveWindow: form state, cooldown, search handler
    useUnifiedSearch.js       — Extracted from UnifiedJobSearchWindow: query/filters, debounced search, pagination
    useSkillsGap.js           — Skills gap: aggregates missing skills from AI match, toggle add/remove to CV
    useIsMobile.js            — Responsive breakpoint detection (mobile vs desktop)
  context/
    AuthContext.jsx    — JWT auth (access + refresh tokens), login/logout, authenticatedFetch (auto-logout on 401, auto-refresh)
    WindowContext.jsx  — Split: WindowStateContext (windows, activeWindowId) + WindowCallbacksContext (11 stable callbacks). Backward-compatible useWindowContext() wrapper. Dispatches window-focused/window-blurred CustomEvents on activeWindowId change
    ThemeContext.jsx   — 3 themes (cyan/silver/amber), 6 backgrounds, persisted to localStorage
  pages/
    LoginPage.jsx      — i18n-enabled login form
    DashboardPage.jsx  — Orchestrator: delegates to DesktopDashboardContent or MobileDashboardLayout
  i18n/
    index.js           — i18next config with LanguageDetector
    locales/en.json    — English translations (~250 keys)
    locales/es.json    — Spanish translations (~250 keys)
    locales/fr.json    — French translations
    locales/de.json    — German translations
    locales/ja.json    — Japanese translations
    locales/it.json    — Italian translations
  styles/              — CSS files (base, floating-window, dashboard-layout, dashboard-forms, dashboard-jobboard,
                         dashboard-job-extras, windows-profile-contact, windows-skills, windows-education-experience,
                         windows-portfolio, chat, login, kanban, ai-match, cv-generation, document-preview, mobile, etc.)
  config/
    api.js             — Backend URL centralized (reads VITE_API_BASE_URL, fallback: http://127.0.0.1:8001)
    jobSources.js      — Centralized registry for all 12 job sources (key, color, urlPath, normalize, skillsField, alwaysRemote)
    terminalCommands.js — Command registry: 19 handlers as (args, ctx) => lines[] + ASCII_BANNER
  App.jsx              — Portfolio page with 12 lazy-loaded windows + Ctrl+`/Ctrl+ñ terminal toggle
  main.jsx             — Router setup, providers (Theme, Auth, ErrorBoundary)
```

## Routing
```
/           → App.jsx (public portfolio, 11 windows)
/login      → LoginPage
/dashboard  → DashboardPage (requires auth via ProtectedRoute, 12 windows)
*           → redirect to /
```

## Design Principles (PRIORITY)
Every change must preserve or improve adherence to SRP, Cohesion, Low Coupling, and Readability:

- **Components**: Render UI only. Extract logic (state, effects, handlers) to custom hooks. Target <150 lines per component.
- **Hooks**: One concern per hook. `useJobApplication` handles apply logic, `useTerminalCommands` handles terminal logic. Don't mix unrelated state.
- **No duplicated logic**: If 2+ components share behavior (handleApply, sort/pagination), extract to a shared hook.
- **Registry pattern**: `jobSources.js` is the single source of truth for job sources. `terminalCommands.js` is the registry for terminal commands. Colors, endpoints, normalizers — all there. Never duplicate source metadata in components.
- **Named constants**: No magic numbers in layout/animation code. Use named constants (see `useWindowLayout.js`, `dashboardConstants.js`).
- **CSS**: Never `transition: all` — always list specific properties. Use shared CSS classes from `dashboard-forms.css` for form elements in dashboard windows. Keep selectors specific and colocated with their component.
- **File size**: Target <200 lines per component, <300 lines per hook. If larger, split by responsibility.

## Key Patterns

### FloatingWindow (shell for all windows)
Every window (portfolio and dashboard) renders inside `FloatingWindow`. It provides:
- Desktop: Dragging via `useDraggable`, 8-direction resize via `useResizable`, minimize/maximize/fit-to-content
- Mobile: Collapsible sections (accordion) with expand/collapse toggle
- Z-index management + active window glow via `WindowContext` (`activeWindowId`)
- CSS transitions only on box-shadow/border-color/opacity/width/height — never `transition: all`
- `backdrop-filter: none` during drag (`.dragging` class) for smooth performance
- Accessibility: `role="dialog"`, `aria-labelledby`, `role="heading" aria-level="2"` on titles, `tabIndex`, Escape to minimize
- Mobile accessibility: `role="button"`, `aria-expanded`, `aria-labelledby`, keyboard Enter/Space toggle

### API Calls
- **Portfolio data**: Static JSON at `public/portfolio-data.json` (no backend)
- **Dashboard data**: Uses `authenticatedFetch()` from `AuthContext` (adds JWT header, auto-logout on 401)
- **Visitor tracking**: `useVisitorTracking` hook, fires once per session
- **Interaction tracking**: `useInteractionTracking` hook, captures clicks + window focus, batches via `sendBeacon` every 10s

### Backend URL
Centralized in `src/config/api.js`. Reads `VITE_API_BASE_URL` env var, fallback: `http://127.0.0.1:8001`.
Imported by: `AuthContext.jsx`, `useDashboardData.js`, `useVisitorTracking.js`

### i18n
Use `const { t } = useTranslation()` then `t('key')` for translatable text.
Locale files: `src/i18n/locales/{en,es,fr,de,ja,it}.json`.
Keys: `welcome.*`, `chat.*`, `contact.*`, `skills.*`, `windows.*`, `app.*`, `error.*`, `login.*`, `dashboard.*`, `terminal.*`, `dashboard.cvGeneration.*`, `dashboard.aiMatch.*`, `dashboard.heatmap.*`

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
- Pipeline: Backend-synced job pipeline via KanbanBoard (saved → applied → interview → offer → rejected) + AI CV/Cover Letter generation
- Title translation: Batch-translate non-EN/ES titles to English via Groq LLM in AIJobMatchWindow (with "Translated" badge + original title tooltip)

## Running Tests
```bash
npx vitest run       # single run
npx vitest           # watch mode
```

## Easter Egg
- Ctrl+` (primary) or Ctrl+ñ (fallback) toggles the Terminal window (`TerminalWindow.jsx`)
- 19 commands defined in `config/terminalCommands.js` registry: help, about, skills, experience, education, ls, cat, whoami, ping, sudo, history, clear, theme, lang, background, date, neofetch, matrix, version
- Fake filesystem maps filenames to portfolio data commands
- All strings are i18n-ready via `terminal.*` keys

## Window Layout Behavior
- On page load, all windows animate into a minimized grid (3 cols desktop, 2 tablet, 1 mobile)
- No layout persistence — fresh arrangement every load
- Minimized windows reposition on window resize (debounced 250ms)
- Toast "Click on any window to explore!" after animation completes

## Notes
- AuthContext validates JWT `exp` claim on mount, auto-clears expired tokens. Proactive session expiry checks token every 60s, auto-refreshes or logs out. Refresh tokens auto-renew access tokens
- useDashboardData normalizes jobs at fetch time (stores in `._normalized` field), eliminating O(2400) render-time operations
- WindowContext is split into `WindowStateContext` + `WindowCallbacksContext` — consumers using only callbacks don't re-render on state changes. Use `useWindowContext()` for backward compat, or `useWindowState()`/`useWindowCallbacks()` for granular access
- ErrorBoundary wraps each Suspense group in dashboard (overview, map, analytics, jobs) — one failure doesn't crash the entire dashboard
- CSP meta tag in `index.html` restricts script-src, style-src, connect-src, etc.
- `ThemeContext` exposes 8 CSS custom properties: `--theme-primary`, `--theme-primary-rgb`, `--theme-secondary`, `--theme-background`, `--theme-text`, `--theme-text-highlight`, `--theme-border`, `--theme-border-light`
- Job source registry: `config/jobSources.js` is the single source of truth. To add a new source, only add an entry there
- Background effects (Three.js/Canvas) use mount-only effects with `eslint-disable` — adding theme as dependency would destroy/recreate the entire 3D scene
