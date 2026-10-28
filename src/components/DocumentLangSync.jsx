// Componente mínimo, sin salida visual, que mantiene sincronizado el
// atributo "lang" del documento. Se monta una vez en main.jsx, fuera de las
// rutas — ver useSyncDocumentLang para el porqué.

import useSyncDocumentLang from '../hooks/useSyncDocumentLang';

const DocumentLangSync = () => {
    useSyncDocumentLang();
    return null;
};

export default DocumentLangSync;
