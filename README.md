# DigitalCV - Frontend

Este es el frontend del proyecto DigitalCV, un portfolio interactivo con un estilo cyberpunk que mola bastante. Basicamente es una web donde puedo mostrar mi curriculum de una forma diferente, con ventanas flotantes que puedes arrastrar y redimensionar como si fuera un sistema operativo.

## De que va esto

La idea es tener un portfolio que no sea aburrido. En vez de una pagina tipica con secciones, aqui tienes ventanas que puedes mover por la pantalla, minimizar, maximizar... Como si fuera Windows pero con un rollo mas futurista. Ademas tiene un efecto de lluvia 3D de fondo que queda muy guay.

## Que tiene

- **Ventanas flotantes**: Puedes arrastrarlas, cambiarles el tamaño, minimizarlas y maximizarlas
- **Efecto de lluvia 3D**: Un fondo animado con Three.js que se mueve con el raton
- **Chatbot**: Un asistente que responde preguntas sobre mi (se conecta al backend)
- **Dashboard privado**: Una zona donde puedo ver estadisticas de visitas, un mapa con la ubicacion de los visitantes y ofertas de trabajo de APIs externas
- **Diseno responsive**: Funciona tanto en el ordenador como en el movil

## Las ventanas del portfolio

- Perfil con mi foto y descripcion
- Habilidades tecnicas
- Habilidades blandas
- Idiomas
- Educacion
- Experiencia laboral
- Proyectos
- Contacto
- Chat con el bot

## Las ventanas del dashboard

- Estadisticas de visitas
- Mapa de visitantes
- Ofertas de trabajo de Jobicy
- Ofertas de trabajo de Remotive
- Visitantes recientes

## Como arrancarlo

Primero instalas las dependencias:

```bash
npm install
```

Y luego lo ejecutas en modo desarrollo:

```bash
npm run dev
```

Se abrira en http://localhost:5173

## Para produccion

Si quieres generar los archivos para subir a un servidor:

```bash
npm run build
```

Los archivos se generan en la carpeta `dist`.

## Tecnologias que uso

- **React** - Para hacer los componentes
- **Vite** - Para que vaya rapido el desarrollo
- **Three.js** - Para el efecto de lluvia 3D
- **React Router** - Para la navegacion entre paginas
- **Leaflet** - Para el mapa de visitantes
- **CSS puro** - Sin frameworks, todo hecho a mano

## Estructura de carpetas

```
src/
  components/       # los componentes de react
    Background/     # el efecto de lluvia
    Dashboard/      # ventanas del dashboard
    UI/             # cosas como toasts y tooltips
    Windows/        # las ventanas flotantes
  context/          # el estado global de la app
  hooks/            # hooks personalizados
  pages/            # las paginas principales
  styles/           # los estilos css
```

## El backend

Este frontend se conecta a un backend en FastAPI que esta en otra carpeta. El backend gestiona:
- Autenticacion con JWT
- Estadisticas de visitas
- El chatbot con IA
- Conexion con APIs de ofertas de empleo

## Variables de entorno

Puedes crear un archivo `.env` con:

```
VITE_API_BASE_URL=http://localhost:8001
```

Si no lo pones, por defecto usa localhost:8001.
