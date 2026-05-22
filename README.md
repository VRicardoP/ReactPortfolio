# Portfolio Frontend

Interactive developer portfolio for Vicente Pau, live at [vicentepau.is-a.dev](https://vicentepau.is-a.dev).

Built with a desktop OS metaphor: draggable, resizable floating windows, 6 immersive 3D backgrounds, an AI chatbot, and a private admin dashboard with job aggregation and AI-powered tools.

## Features

### Portfolio (public)

- **Floating window system** — drag, resize (8 directions), minimize, maximize, fit-to-content, z-index management
- **6 interactive backgrounds** — Rain (Three.js), Matrix (Canvas 2D), Parallax (tsparticles), Lensflare (Three.js), Cube (Three.js), Smoke (Three.js)
- **3 color themes** — Cyan, Silver, Amber — persisted to localStorage
- **11 portfolio windows** — Welcome, Profile, Soft Skills, Education, Experience, Languages, Tech Skills, Portfolio, Achievements, Chat, Terminal (easter egg)
- **AI Chatbot** — Kusanagi assistant powered by Groq, responds in the visitor's language
- **Internationalization** — 6 locales: English, Spanish, French, German, Italian, Japanese
- **Visitor tracking** — geolocation and device data sent to backend once per session
- **Interaction heatmap** — click and focus events batched via `sendBeacon` every 10s

### Dashboard (admin only)

- **Analytics** — visitor stats, interactive map, chat statistics, interaction heatmap
- **Job Board** — 12 job API sources in a tabbed interface with sort, pagination, and cache age badges
- **Unified Search** — cross-source job search with filters and debounced queries
- **AI Job Match** — sentence-transformers + Groq LLM re-ranking against CV profile; Skills Gap tab shows missing skills
- **Kanban Pipeline** — drag-and-drop job application tracker (saved → applied → interview → offer → rejected)
- **AI CV / Cover Letter** — generate, preview, and download PDF/JSON documents adapted to each job offer
- **Saved Searches** — store and re-run job search configurations
- **SSE Notifications** — real-time alerts for new visitors, chat messages, and job cache updates

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + Vite 7 |
| 3D / Canvas | Three.js |
| Particles | tsparticles |
| Maps | React-Leaflet + OpenStreetMap |
| Charts | Chart.js + react-chartjs-2 |
| Routing | React Router v7 |
| State | React Context API (split state/callbacks) |
| i18n | react-i18next (6 locales) |
| Testing | Vitest + @testing-library/react (313 tests) |
| E2E | Playwright (17 tests) |
| Styles | Pure CSS (no CSS-in-JS) |
| Hosting | Cloudflare Pages |

## Getting Started

```bash
# Clone and enter the directory
git clone https://github.com/VRicardoP/ReactPortfolio.git
cd ReactPortfolio/frontend

# Install dependencies
npm install

# Configure environment (optional — defaults to http://127.0.0.1:8001)
cp .env.example .env
# Set VITE_API_BASE_URL to your backend URL

# Start development server
npm run dev
```

Opens at `http://localhost:5173`

### Production Build

```bash
npm run build
# Output in dist/
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://127.0.0.1:8001` |

> When deploying to Cloudflare Pages, set `VITE_API_BASE_URL` in the project's environment variables and trigger a new deployment.

## Testing

```bash
# Unit + integration tests
npx vitest run

# E2E tests (requires production build)
npm run build
npx playwright test
```

## Project Structure

```
frontend/
├── public/
│   ├── portfolio-data.json   # Static portfolio data (fallback)
│   └── _redirects            # Cloudflare Pages SPA routing
├── src/
│   ├── components/
│   │   ├── Background/       # 6 visual effects
│   │   ├── Dashboard/        # 12 admin windows
│   │   ├── Windows/          # 11 portfolio windows
│   │   └── UI/               # Toast, Tooltip
│   ├── config/
│   │   ├── api.js            # Centralized backend URL
│   │   ├── jobSources.js     # Registry for all 12 job sources
│   │   └── terminalCommands.js # Terminal command registry (19 commands)
│   ├── context/
│   │   ├── AuthContext.jsx   # JWT auth + authenticatedFetch
│   │   ├── WindowContext.jsx # Split state/callbacks context
│   │   └── ThemeContext.jsx  # Theme + background
│   ├── hooks/                # 20+ custom hooks
│   ├── i18n/                 # react-i18next + 6 locale files
│   ├── pages/                # LoginPage, DashboardPage
│   └── styles/               # CSS files per component/feature
├── e2e/                      # Playwright E2E tests
├── .env.example
├── vite.config.js
└── vitest.config.js
```

## Performance

- All 25 windows lazy-loaded via `React.lazy` + `Suspense`
- Manual Vite chunks: `vendor-react`, `vendor-three`, `vendor-particles`, `vendor-charts`, `vendor-maps`
- Main bundle: ~210KB gzipped
- `WindowContext` split into state and callbacks contexts — callback consumers don't re-render on state changes
- Job data normalized at fetch time, eliminating O(2400) render-time operations
- `backdrop-filter` removed during drag via `.dragging` class for smooth 60fps performance
