// Única definición de cuándo la web usa el diseño "compacto" (secciones
// apiladas con scroll, pestañas en el panel) en vez del de escritorio
// (ventanas flotantes). La evalúa useIsMobile.js y la refleja en
// <html data-layout="compact|desktop"> para que el CSS no tenga que repetirla.
//
// DT-208: antes el único criterio era el ancho (768 px), y un móvil en
// horizontal (850-930 px), una tablet o el modo "Sitio de escritorio" del
// navegador (~980 px simulados) caían en el escritorio: ventanas diminutas,
// botones de 12 px y sin scroll. Ahora una pantalla táctil sin ratón también
// es compacta hasta 1024 px.

// Por debajo de este ancho el diseño es compacto aunque haya ratón.
export const MOBILE_BREAKPOINT = 768;

// Hasta este ancho, una pantalla táctil sin ratón también es compacta.
export const TOUCH_COMPACT_BREAKPOINT = 1024;

// `(hover: none) and (pointer: coarse)` = el dispositivo principal de entrada
// es un dedo, no un ratón. Es el mismo par que ya usan las hojas de estilo.
export const COMPACT_LAYOUT_QUERY =
    `(max-width: ${MOBILE_BREAKPOINT}px), `
    + `((max-width: ${TOUCH_COMPACT_BREAKPOINT}px) and (hover: none) and (pointer: coarse))`;

export const LAYOUT_ATTRIBUTE = 'data-layout';
export const LAYOUT_COMPACT = 'compact';
export const LAYOUT_DESKTOP = 'desktop';
