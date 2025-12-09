# DigitalCV - Frontend

Portfolio interactivo con estilo cyberpunk. Una web donde muestro mi curriculum de forma diferente, con ventanas flotantes arrastrables y redimensionables como si fuera un sistema operativo.

## Funcionalidades principales

### Sistema de ventanas flotantes

Las ventanas funcionan como un escritorio de sistema operativo:

- **Arrastrar**: Click en la barra de titulo y mueve libremente
- **Redimensionar**: 8 puntos de redimensionamiento (esquinas y lados)
- **Minimizar**: Se reduce a 40px de altura y se coloca en barra superior
- **Maximizar**: Pantalla completa o restaurar tamaño anterior
- **Ajustar al contenido**: Calcula el tamaño optimo automaticamente
- **Z-Index automatico**: Click en una ventana la trae al frente

### Efectos de fondo 3D

6 efectos visuales intercambiables:

| Efecto | Descripcion |
|--------|-------------|
| **Rain** | Lluvia 3D con Three.js (3000 gotas), camara interactiva con el raton |
| **Matrix** | Caracteres katakana/numeros cayendo estilo Matrix, Canvas 2D |
| **Parallax** | Particulas interactivas con tsparticles, conexiones visuales |
| **Lensflare** | 3000 cubos flotantes con efectos de lens flare, control de camara 6DOF |
| **Cube** | Cubo 3D con bordes redondeados y 20 barras de luz animadas |
| **Smoke** | 150 planos de humo rotando en 3D |

### Temas de colores

3 temas completos con paletas personalizadas:

- **Cyan**: Azul cian futurista (default)
- **Silver**: Gris elegante y corporativo
- **Amber**: Tonos dorados y calidos

Los temas se guardan en localStorage y cambian toda la interfaz al instante.

### Ventanas del portfolio

9 ventanas con informacion profesional:

1. **Welcome** - Tutorial de navegacion
2. **Profile** - Descripcion y contacto
3. **Soft Skills** - Habilidades blandas
4. **Education** - Historial educativo
5. **Experience** - Experiencia laboral
6. **Languages** - Idiomas
7. **Tech Skills** - Tecnologias
8. **Portfolio** - Proyectos realizados
9. **Chat (Kusanagi AI)** - Chatbot con IA

### Ventanas del dashboard (privado)

8 ventanas con analiticas y ofertas de empleo:

1. **Stats** - Total visitantes, paises, ciudades, top 5 paises
2. **Recent Visitors** - Ultimos visitantes
3. **Map** - Mapa interactivo con ubicaciones de visitantes (Leaflet)
4. **Chat Analytics** - Estadisticas del chatbot (4 pestanas con graficos)
5. **Jobicy Jobs** - Ofertas de empleo API Jobicy
6. **Remotive Jobs** - Ofertas de empleo API Remotive
7. **Arbeitnow Jobs** - Ofertas de empleo API Arbeitnow
8. **JSearch Jobs** - Ofertas de empleo API JSearch

### Chatbot Kusanagi AI

- Chat en tiempo real con backend
- Indicador "typing" mientras responde
- Auto-scroll y auto-focus
- Enter para enviar, Shift+Enter para saltos de linea

### Sistema de autenticacion

- Login con JWT tokens
- Rutas protegidas para el dashboard
- Token en localStorage con auto-logout en expiracion

### Tracking de visitantes

- Registro automatico de visitas (una por sesion)
- Datos: URL, referrer, user agent
- Geolocalizacion para el mapa

## Optimizaciones de rendimiento

- **Lazy Loading**: Componentes se cargan solo cuando se necesitan
- **React.memo**: Evita re-renders innecesarios
- **useMemo/useCallback**: Calculos y funciones memoizadas
- **DOM directo**: Drag y resize fluidos sin re-renders
- **requestAnimationFrame**: Animaciones a 60fps
- **Cleanup**: Liberacion de memoria en efectos 3D

## Como arrancarlo

Instala las dependencias:

```bash
npm install
```

Ejecuta en modo desarrollo:

```bash
npm run dev
```

Se abre en http://localhost:5173

## Para produccion

```bash
npm run build
```

Los archivos se generan en la carpeta `dist`.

## Tecnologias

| Categoria | Tecnologia |
|-----------|------------|
| Framework | React 18 + Vite |
| 3D | Three.js |
| Particulas | tsparticles |
| Mapas | React-Leaflet + OpenStreetMap |
| Graficos | Chart.js + react-chartjs-2 |
| Routing | React Router |
| Estado | React Context API |
| Estilos | CSS puro (sin frameworks) |

## Estructura de carpetas

```
src/
  components/
    Background/     # efectos de fondo (Rain, Matrix, Parallax, etc)
    Dashboard/      # ventanas del dashboard
    UI/             # Toast, Tooltip
    Windows/        # ventanas flotantes del portfolio
  context/          # AuthContext, ThemeContext, WindowContext
  hooks/            # useDraggable, useResizable, useTypewriter, etc
  pages/            # HomePage, LoginPage, DashboardPage
  styles/           # estilos CSS
```

## APIs externas

El frontend consume:

- **OpenStreetMap** - Tiles para mapas
- **Leaflet CDN** - Iconos de marcadores
- **AWS S3** - Texturas (humo)
- **Unsplash** - Texturas para cubos 3D

## El backend

Este frontend se conecta a un backend en FastAPI que gestiona:

- Autenticacion JWT
- Estadisticas y geolocalizacion de visitas
- Chatbot con IA
- Proxy a APIs de ofertas de empleo (Jobicy, Remotive, Arbeitnow, JSearch)
- Analytics del chat

## Variables de entorno

Archivo `.env`:

```
VITE_API_BASE_URL=http://localhost:8001
```

Si no se configura, usa localhost:8001 por defecto.
