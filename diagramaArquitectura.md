# Diagrama de Arquitectura - DigitalCV

## Arquitectura General

```mermaid
flowchart TB
    subgraph Frontend["Frontend - React + Vite"]

        subgraph Portfolio["Página Portfolio - 10 ventanas"]
            subgraph CVWindows["Secciones CV"]
                Welcome[Welcome]
                Profile[Profile]
                Education[Education]
                Experience[Experience]
                TechSkills[Tech Skills]
                SoftSkills[Soft Skills]
                Languages[Languages]
                PortfolioW[Portfolio]
            end
            subgraph Interactive["Interactivas"]
                Contact[Contact]
                Chat[Chat Kusanagi]
            end
        end

        subgraph Dashboard["Dashboard Admin - 9 ventanas"]
            subgraph Analytics["Analytics"]
                Stats[Stats]
                RecentVisitors[Recent Visitors]
                MapWindow[Map]
                ChatAnalytics[Chat Analytics]
            end
            subgraph JobBoards["Job Boards"]
                Remotive[Remotive Jobs]
                Arbeitnow[Arbeitnow Jobs]
                Jsearch[JSearch Jobs]
                Jobicy[Jobicy Jobs]
            end
            Login[Login Page]
        end

        subgraph Effects["Efectos 3D - 6 efectos"]
            Rain[Rain]
            Matrix[Matrix]
            Parallax[Parallax]
            Lensflare[Lensflare]
            Cube[Cube]
            Smoke[Smoke]
        end
    end

    subgraph Backend["Backend - FastAPI"]
        subgraph Routers["Routers"]
            AuthRouter["auth"]
            AnalyticsRouter["analytics"]
            ChatRouter["chat"]
            JobsRouter["jobs"]
        end

        subgraph Services["Services"]
            ChatService[Chatbot Service]
            GeoService[Geolocation Service]
            EmailService[Email Service]
        end
    end

    subgraph External["APIs Externas"]
        Groq["Groq API - Llama 3"]
        IPInfo[IPInfo API]
        RemotiveAPI[Remotive API]
        ArbeitnowAPI[Arbeitnow API]
        JsearchAPI[JSearch API]
        JobicyAPI[Jobicy API]
    end

    subgraph Database["PostgreSQL"]
        Users[(users)]
        Visitors[(visitors)]
        ChatQ[(chat_questions)]
    end

    %% Portfolio connections
    Portfolio -->|Track Visit| AnalyticsRouter
    Chat -->|POST chat send| ChatRouter
    Contact -->|Send email| EmailService

    %% Dashboard Analytics connections
    Login -->|POST auth token| AuthRouter
    Stats -->|GET stats| AnalyticsRouter
    RecentVisitors -->|GET stats| AnalyticsRouter
    MapWindow -->|GET map-data| AnalyticsRouter
    ChatAnalytics -->|GET chat stats| AnalyticsRouter

    %% Dashboard Jobs connections
    Remotive -->|GET jobs| JobsRouter
    Arbeitnow -->|GET jobs| JobsRouter
    Jsearch -->|GET jobs| JobsRouter
    Jobicy -->|GET jobs| JobsRouter

    %% Backend to Database
    AuthRouter --> Users
    AnalyticsRouter --> Visitors
    AnalyticsRouter --> ChatQ
    ChatRouter --> ChatQ

    %% Backend to Services
    ChatRouter --> ChatService
    AnalyticsRouter --> GeoService

    %% Services to External APIs
    ChatService --> Groq
    GeoService --> IPInfo
    JobsRouter --> RemotiveAPI
    JobsRouter --> ArbeitnowAPI
    JobsRouter --> JsearchAPI
    JobsRouter --> JobicyAPI

    %% Auth flow
    AuthRouter -.->|JWT Token| Dashboard
```

## Detalle de Ventanas

### Portfolio (10 ventanas)

```mermaid
flowchart LR
    subgraph Portfolio["Pagina Portfolio"]
        subgraph CV["Contenido CV - Sin backend"]
            Welcome[Welcome]
            Profile[Profile]
            Education[Education]
            Experience[Experience]
            TechSkills[Tech Skills]
            SoftSkills[Soft Skills]
            Languages[Languages]
            PortfolioW[Portfolio]
        end

        subgraph WithBackend["Con Backend"]
            Contact[Contact]
            Chat[Chat Kusanagi]
        end
    end

    subgraph Backend["Backend"]
        ChatEndpoint["POST chat send"]
        TrackEndpoint["POST analytics track"]
        EmailService[Email Service]
    end

    subgraph DB["PostgreSQL"]
        ChatQ[(chat_questions)]
        Visitors[(visitors)]
    end

    Portfolio -->|Al cargar| TrackEndpoint
    TrackEndpoint --> Visitors
    Chat --> ChatEndpoint
    ChatEndpoint --> ChatQ
    Contact --> EmailService
```

### Dashboard (9 ventanas)

```mermaid
flowchart LR
    subgraph Dashboard["Dashboard Admin"]
        subgraph Analytics["Analytics - 4 ventanas"]
            Stats[Stats]
            Recent[Recent Visitors]
            Map[Map]
            ChatStats[Chat Analytics]
        end

        subgraph Jobs["Job Boards - 4 ventanas"]
            Remotive[Remotive]
            Arbeitnow[Arbeitnow]
            Jsearch[JSearch]
            Jobicy[Jobicy]
        end

        Login[Login]
    end

    subgraph Backend["Backend - Rutas protegidas JWT"]
        AuthEndpoint["POST auth token"]
        StatsEndpoint["GET analytics stats"]
        MapEndpoint["GET analytics map-data"]
        ChatEndpoint["GET analytics chat stats"]
        RemotiveEndpoint["GET remotive-jobs"]
        ArbeitnowEndpoint["GET arbeitnow-jobs"]
        JsearchEndpoint["GET jsearch-jobs"]
        JobicyEndpoint["GET jobicy-jobs"]
    end

    subgraph DB["PostgreSQL"]
        Users[(users)]
        Visitors[(visitors)]
        ChatQ[(chat_questions)]
    end

    subgraph APIs["APIs Externas"]
        RemotiveAPI[Remotive]
        ArbeitnowAPI[Arbeitnow]
        JsearchAPI[JSearch]
        JobicyAPI[Jobicy]
    end

    Login --> AuthEndpoint
    AuthEndpoint --> Users

    Stats --> StatsEndpoint
    Recent --> StatsEndpoint
    StatsEndpoint --> Visitors

    Map --> MapEndpoint
    MapEndpoint --> Visitors

    ChatStats --> ChatEndpoint
    ChatEndpoint --> ChatQ

    Remotive --> RemotiveEndpoint --> RemotiveAPI
    Arbeitnow --> ArbeitnowEndpoint --> ArbeitnowAPI
    Jsearch --> JsearchEndpoint --> JsearchAPI
    Jobicy --> JobicyEndpoint --> JobicyAPI
```

## Flujo de Datos

```mermaid
sequenceDiagram
    participant V as Visitante
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL
    participant G as Groq API
    participant IP as IPInfo

    Note over V,IP: Flujo de Visita Nueva
    V->>F: Accede a la web
    F->>B: POST analytics track
    B->>IP: Geolocalización IP
    IP-->>B: País, Ciudad, Coords
    B->>DB: INSERT visitors
    B-->>F: OK

    Note over V,IP: Flujo del Chatbot
    V->>F: Pregunta al chat
    F->>B: POST chat send
    B->>G: Llama 3 + Contexto CV
    G-->>B: Respuesta IA
    B->>DB: INSERT chat_questions
    B-->>F: Respuesta
    F-->>V: Muestra respuesta

    Note over V,IP: Flujo Admin Dashboard
    V->>F: Login Dashboard
    F->>B: POST auth token
    B->>DB: Verifica users
    B-->>F: JWT Token
    F->>B: GET analytics stats con JWT
    B->>DB: SELECT visitors
    B-->>F: Estadísticas
```

## Resumen de Ventanas

| Página | Ventana | Interacción Backend | Endpoint |
|--------|---------|---------------------|----------|
| Portfolio | Welcome | No | - |
| Portfolio | Profile | No | - |
| Portfolio | Education | No | - |
| Portfolio | Experience | No | - |
| Portfolio | Tech Skills | No | - |
| Portfolio | Soft Skills | No | - |
| Portfolio | Languages | No | - |
| Portfolio | Portfolio | No | - |
| Portfolio | Contact | Sí - Email | Email Service |
| Portfolio | Chat Kusanagi | Sí | POST chat send |
| Dashboard | Login | Sí | POST auth token |
| Dashboard | Stats | Sí | GET analytics stats |
| Dashboard | Recent Visitors | Sí | GET analytics stats |
| Dashboard | Map | Sí | GET analytics map-data |
| Dashboard | Chat Analytics | Sí | GET analytics chat stats |
| Dashboard | Remotive Jobs | Sí | GET remotive-jobs |
| Dashboard | Arbeitnow Jobs | Sí | GET arbeitnow-jobs |
| Dashboard | JSearch Jobs | Sí | GET jsearch-jobs |
| Dashboard | Jobicy Jobs | Sí | GET jobicy-jobs |

## Endpoints por Funcionalidad

| Componente Frontend | Endpoint Backend | Método | Descripción |
|---------------------|------------------|--------|-------------|
| Página principal | api v1 analytics track | POST | Registra visita |
| Chat Kusanagi | api v1 chat send | POST | Envía mensaje al chatbot |
| Remotive Jobs | api v1 remotive-jobs | GET | Ofertas Remotive |
| Arbeitnow Jobs | api v1 arbeitnow-jobs | GET | Ofertas Arbeitnow |
| JSearch Jobs | api v1 jsearch-jobs | GET | Ofertas JSearch |
| Jobicy Jobs | api v1 jobicy-jobs | GET | Ofertas Jobicy |
| Login Dashboard | api v1 auth token | POST | Autenticación JWT |
| Dashboard Stats | api v1 analytics stats | GET | Estadísticas admin |
| Dashboard Map | api v1 analytics map-data | GET | Datos mapa admin |
| Chat Analytics | api v1 analytics chat stats | GET | Stats chatbot admin |

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite, Three.js, JavaScript |
| Backend | FastAPI, Python 3.11, Uvicorn |
| Base de datos | PostgreSQL 15, SQLAlchemy, Alembic |
| Autenticación | JWT python-jose, bcrypt |
| IA Chatbot | Groq API Llama 3 |
| Geolocalización | IPInfo API |
| Despliegue | Docker, docker-compose |
