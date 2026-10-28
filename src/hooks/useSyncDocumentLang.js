// Mantiene el atributo "lang" del documento sincronizado con el idioma
// elegido. Antes solo vivía en App.jsx (la portada pública), así que quien
// entraba directo a /login o /dashboard (el caso normal tras iniciar sesión)
// se quedaba con el "lang=en" estático del HTML sin importar el idioma real
// mostrado — un lector de pantalla pronunciaría el contenido con las reglas
// equivocadas (WCAG 3.1.1). Un solo hook, montado una vez para toda la app.

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const useSyncDocumentLang = () => {
    const { i18n } = useTranslation();

    useEffect(() => {
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);
};

export default useSyncDocumentLang;
