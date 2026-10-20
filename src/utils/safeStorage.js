// Lectura y escritura del almacenamiento del navegador que NUNCA lanza.
//
// DT-187: con las cookies y los datos de sitio bloqueados, Chromium no
// devuelve null: el propio acceso a `localStorage` lanza `SecurityError`. En
// `ThemeContext` eso ocurría dentro del inicializador de `useState`, es decir
// durante el primer render, así que el ErrorBoundary de la raíz se quedaba con
// toda la portada pública en blanco. En `AuthContext` la limpieza de claves
// heredadas corría ANTES del try, de modo que la promesa de arranque se
// rechazaba sin que nadie la atendiera y `setLoading(false)` no llegaba a
// ejecutarse: el panel se quedaba girando para siempre.
//
// Hay más sitios con el mismo riesgo (seguimiento de visitas e interacciones,
// generación de documentos, recuperación de entregas). Todos pasan por aquí
// para que una preferencia perdida no pueda tumbar una pantalla.

function almacen(tipo) {
    try {
        // Acceder a la propiedad ya puede lanzar; no basta con comprobar que exista.
        return window[tipo];
    } catch {
        return null;
    }
}

function leer(tipo, clave) {
    try {
        return almacen(tipo)?.getItem(clave) ?? null;
    } catch {
        return null;
    }
}

function escribir(tipo, clave, valor) {
    // Devuelve si se escribió DE VERDAD. El encadenamiento opcional no sirve
    // aquí: sin almacén no lanza nada y se habría dado por escrito.
    const s = almacen(tipo);
    if (!s) return false;
    try {
        s.setItem(clave, valor);
        return true;
    } catch {
        // Cuota agotada o almacenamiento bloqueado: se pierde la preferencia,
        // que es siempre preferible a romper la pantalla.
        return false;
    }
}

function borrar(tipo, clave) {
    const s = almacen(tipo);
    if (!s) return false;
    try {
        s.removeItem(clave);
        return true;
    } catch {
        return false;
    }
}

function claves(tipo) {
    try {
        const s = almacen(tipo);
        return s ? Object.keys(s) : [];
    } catch {
        return [];
    }
}

export const safeLocal = {
    get: (clave) => leer('localStorage', clave),
    set: (clave, valor) => escribir('localStorage', clave, valor),
    remove: (clave) => borrar('localStorage', clave),
    keys: () => claves('localStorage'),
};

export const safeSession = {
    get: (clave) => leer('sessionStorage', clave),
    set: (clave, valor) => escribir('sessionStorage', clave, valor),
    remove: (clave) => borrar('sessionStorage', clave),
    keys: () => claves('sessionStorage'),
};
