import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { safeSession } from '../utils/safeStorage';
import downloadBlob from '../utils/downloadBlob';

const logger = {
    warn: (...args) => { if (import.meta.env.DEV) console.warn('[useDocumentGeneration]', ...args); },
};

/**
 * Maneja todo el ciclo de vida de los documentos generados por IA
 * (currículum y carta de presentación): pedir que se generen, consultarlos,
 * descargarlos en PDF o JSON, y borrarlos — cuidando que una respuesta
 * tardía del servidor nunca pise un cambio más reciente hecho en el navegador.
 *
 * Hook for AI document generation (CV + cover letter).
 * Manages generation state per application and provides download functions.
 */
export default function useDocumentGeneration() {
    const { authenticatedFetch } = useAuth();
    const { t } = useTranslation();
    const inFlight = useRef(new Set());
    const [documents, setDocuments] = useState({});
    const [generating, setGenerating] = useState(new Set());
    const [error, setError] = useState(null);

    // Guarda de generacion COMPARTIDA por los cuatro escritores del mapa
    // (`generate`, `fetchDocuments`, `fetchAllDocuments` y `deleteDocument`).
    // Aqui si se justifica una utilidad comun: los cuatro tienen el mismo
    // defecto y arreglar uno solo es el patron «fix aplicado a un tercio de las
    // puertas». Borrar es una escritura local como cualquier otra: lo que una
    // lectura anterior no puede pisar no es solo lo que se acaba de crear.
    //
    // La regla: una respuesta del servidor que SALIO antes de una escritura
    // local no puede pisarla, porque cuando el servidor la emitio todavia no
    // conocia lo que se acababa de generar. Fusionar mas hondo no basta —el
    // caso de "regenerar el CV" trae el MISMO campo con el valor viejo, y ahi la
    // fusion deja ganar al servidor—; hace falta saber QUE es mas reciente.
    // `tick` ordena los sucesos; `perApplication` recuerda cuando fue la ultima
    // escritura local de cada solicitud.
    const writesRef = useRef({ tick: 0, perApplication: {} });

    // Anota que se ha hecho un cambio local en los documentos de una
    // candidatura, para poder detectar después si una respuesta del servidor
    // ha llegado antes o después de ese cambio.
    const markLocalWrite = useCallback((applicationId) => {
        const w = writesRef.current;
        w.tick += 1;
        w.perApplication[applicationId] = w.tick;
    }, []);

    /** Sello a tomar ANTES de lanzar una lectura, para compararlo al volver. */
    const stampRead = useCallback(() => writesRef.current.tick, []);

    /** ¿Esta respuesta salio antes de la ultima escritura local de `applicationId`? */
    const isStaleFor = useCallback((stamp, applicationId) => (
        (writesRef.current.perApplication[applicationId] ?? 0) > stamp
    ), []);

    // Pide a la IA que genere el currículum y/o la carta de presentación
    // para una candidatura, evitando generarlos dos veces si ya hay una
    // petición en marcha.
    const generate = useCallback(async (applicationId, options = {}) => {
        if (inFlight.current.has(applicationId)) throw new Error(t('dashboard.cvGeneration.alreadyGenerating'));
        inFlight.current.add(applicationId);
        setGenerating(prev => new Set(prev).add(applicationId));
        setError(null);
        let operationKey;
        try {
            // Store only an opaque operation UUID, never CV/contact/content. A reload
            // after an ambiguous response must retry the SAME request identity.
            const intent = {
                application_id: applicationId,
                language: options.language || 'en',
                include_cv: options.includeCv !== false,
                include_cover_letter: options.includeCoverLetter !== false,
            };
            const key = 'document-operation:' + JSON.stringify(intent);
            operationKey = key;
            const operationId = safeSession.get(key) || crypto.randomUUID();
            safeSession.set(key, operationId); // unavailable storage => no HTTP
            const resp = await authenticatedFetch(`/api/v1/cv-generation/generate`, {
                method: 'POST',
                body: JSON.stringify({ ...intent, operation_id: operationId }),
            });
            const data = await resp.json();
            if (resp.status === 202 || data.status === 'pending') {
                throw new Error(t('dashboard.cvGeneration.deliveryPending'));
            }
            safeSession.remove(key); // explicit success only; next click is a new generation
            markLocalWrite(applicationId);
            setDocuments(prev => {
                // Reemplazar la entrada ENTERA borraba el documento que esta
                // llamada NO pidio regenerar: solo se pisa lo que se ha pedido.
                const entry = { ...prev[applicationId], generationTimeMs: data.generation_time_ms };
                if (options.includeCv !== false) entry.cv = data.cv_document;
                if (options.includeCoverLetter !== false) entry.coverLetter = data.cover_letter_document;
                return { ...prev, [applicationId]: entry };
            });
            return data;
        } catch (err) {
            // 410 is a CONFIRMED deleted generation, not an ambiguous timeout.
            // Report it; only the user's next explicit click starts a new operation.
            if (err.status === 410 && operationKey) safeSession.remove(operationKey);
            setError(err.message || 'Generation failed');
            throw err;
        } finally {
            inFlight.current.delete(applicationId);
            setGenerating(prev => {
                const next = new Set(prev);
                next.delete(applicationId);
                return next;
            });
        }
    }, [authenticatedFetch, markLocalWrite, t]);

    // Trae del servidor los documentos ya generados de una candidatura concreta.
    const fetchDocuments = useCallback(async (applicationId) => {
        // Es el camino de `SelectedOffersPanel.handleViewDocs`, que se dispara al
        // abrir la vista previa de la MISMA tarjeta que se esta generando: sin
        // guarda, reemplazaba la entrada entera y borraba los DOS documentos
        // recien generados.
        const stamp = stampRead();
        try {
            const resp = await authenticatedFetch(
                `/api/v1/cv-generation/?application_id=${applicationId}`
            );
            const docs = await resp.json();
            const cv = docs.find(d => d.doc_type === 'cv') || null;
            const coverLetter = docs.find(d => d.doc_type === 'cover_letter') || null;
            if (!isStaleFor(stamp, applicationId)) {
                setDocuments(prev => ({
                    ...prev,
                    [applicationId]: { cv, coverLetter },
                }));
            }
            return { cv, coverLetter };
        } catch (err) {
            logger.warn('Failed to fetch documents', err);
            return null;
        }
    }, [authenticatedFetch, stampRead, isStaleFor]);

    // Trae del servidor los documentos generados de TODAS las candidaturas.
    const fetchAllDocuments = useCallback(async () => {
        const stamp = stampRead();
        try {
            const resp = await authenticatedFetch(`/api/v1/cv-generation/`);
            const docs = await resp.json();
            const indexed = {};
            for (const doc of docs) {
                const appId = doc.application_id;
                if (!indexed[appId]) indexed[appId] = {};
                if (doc.doc_type === 'cv' && !indexed[appId].cv) indexed[appId].cv = doc;
                if (doc.doc_type === 'cover_letter' && !indexed[appId].coverLetter) indexed[appId].coverLetter = doc;
            }
            // Fusionar POR SOLICITUD, no reemplazarla: `generate` y
            // `fetchDocuments` escriben en este mismo mapa, y una generacion que
            // termina mientras este fetch vuela desaparecia de la vista pese a
            // estar ya en el servidor. Fusionar solo el primer nivel no basta:
            // el caso normal —la solicitud ya tenia CV y se genera la carta, o
            // al reves— es justo el de una solicitud que el servidor SI conoce,
            // cuya entrada se reemplazaba entera.
            // Y fusionar tampoco basta para el MISMO tipo: al regenerar el CV, la
            // respuesta trae `cv` con el valor VIEJO y la fusion deja ganar al
            // servidor. Por eso las solicitudes escritas localmente despues de
            // lanzar esta lectura se saltan enteras.
            setDocuments(prev => {
                const merged = { ...prev };
                for (const [appId, docs] of Object.entries(indexed)) {
                    if (isStaleFor(stamp, appId)) continue;
                    merged[appId] = { ...prev[appId], ...docs };
                }
                return merged;
            });
        } catch (err) {
            logger.warn('Failed to fetch all documents', err);
        }
    }, [authenticatedFetch, stampRead, isStaleFor]);

    // Devuelve los documentos ya guardados en memoria para una candidatura.
    const getDocumentsFor = useCallback((applicationId) => {
        return documents[applicationId] || null;
    }, [documents]);

    // Descarga un documento como fichero PDF.
    const downloadPdf = useCallback(async (docId, filename) => {
        try {
            const resp = await authenticatedFetch(
                `/api/v1/cv-generation/${docId}/pdf`
            );
            const blob = await resp.blob();
            downloadBlob(blob, filename || 'document.pdf');
        } catch (err) {
            logger.warn('Failed to download PDF', err);
        }
    }, [authenticatedFetch]);

    // Descarga un documento como fichero JSON (el dato tal cual).
    const downloadJson = useCallback(async (docId, filename) => {
        try {
            const resp = await authenticatedFetch(
                `/api/v1/cv-generation/${docId}`
            );
            const data = await resp.json();
            const content = JSON.parse(data.content);
            const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
            downloadBlob(blob, filename || 'document.json');
        } catch (err) {
            logger.warn('Failed to download JSON', err);
        }
    }, [authenticatedFetch]);

    // Borra un documento generado, tanto en el servidor como en memoria.
    const deleteDocument = useCallback(async (docId, applicationId) => {
        try {
            await authenticatedFetch(`/api/v1/cv-generation/${docId}`, {
                method: 'DELETE',
            });
            // Borrar es la CUARTA escritura local del mapa, y era la unica que
            // no se anotaba: una lectura lanzada ANTES del DELETE se seguia
            // considerando vigente y reinsertaba el documento ya borrado.
            // Se anota ANTES de tocar el mapa, para que ninguna respuesta que
            // ya volaba pueda colarse entre la anotacion y el borrado.
            // Sin `applicationId` no se mantiene estado local (contrato del
            // hook): no hay nada que proteger, y quien quiera que se mantenga
            // tiene que pasarlo.
            if (applicationId) {
                markLocalWrite(applicationId);
                setDocuments(prev => {
                    const entry = prev[applicationId];
                    if (!entry) return prev;
                    // El DELETE del servidor borra UN documento por su id, no la
                    // solicitud: retirar la entrada entera ocultaba el hermano que
                    // el servidor SI conserva. Se anula solo el campo cuyo id
                    // coincide, y la entrada se retira unicamente si no queda
                    // ninguno de los dos documentos.
                    const next = { ...entry };
                    if (next.cv?.id === docId) next.cv = null;
                    if (next.coverLetter?.id === docId) next.coverLetter = null;
                    const copy = { ...prev };
                    if (next.cv || next.coverLetter) copy[applicationId] = next;
                    else delete copy[applicationId];
                    return copy;
                });
            }
        } catch (err) {
            logger.warn('Failed to delete document', err);
        }
    }, [authenticatedFetch, markLocalWrite]);

    // Dice si en este momento se está generando un documento para esa candidatura.
    const isGenerating = useCallback((applicationId) => {
        return generating.has(applicationId);
    }, [generating]);

    // Retira únicamente la intención persistida que corresponde a una entrega
    // ya confirmada. El formato privado de las claves queda encapsulado aquí.
    const clearOperation = useCallback((operationId) => {
        for (const key of safeSession.keys()) {
            if (key.startsWith('document-operation:') && safeSession.get(key) === operationId) {
                safeSession.remove(key);
            }
        }
    }, []);

    return {
        generate,
        fetchDocuments,
        fetchAllDocuments,
        getDocumentsFor,
        downloadPdf,
        downloadJson,
        deleteDocument,
        clearOperation,
        isGenerating,
        generatingSet: generating,
        documents,
        error,
    };
}
