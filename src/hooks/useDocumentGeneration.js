import { useState, useCallback } from 'react';
import { BACKEND_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const logger = {
    warn: (...args) => { if (import.meta.env.DEV) console.warn('[useDocumentGeneration]', ...args); },
};

/**
 * Hook for AI document generation (CV + cover letter).
 * Manages generation state per application and provides download functions.
 */
export default function useDocumentGeneration() {
    const { authenticatedFetch } = useAuth();
    const [documents, setDocuments] = useState({});
    const [generating, setGenerating] = useState(new Set());
    const [error, setError] = useState(null);

    const generate = useCallback(async (applicationId, options = {}) => {
        setGenerating(prev => new Set(prev).add(applicationId));
        setError(null);
        try {
            const resp = await authenticatedFetch(`${BACKEND_URL}/api/v1/cv-generation/generate`, {
                method: 'POST',
                body: JSON.stringify({
                    application_id: applicationId,
                    language: options.language || 'en',
                    include_cv: options.includeCv !== false,
                    include_cover_letter: options.includeCoverLetter !== false,
                }),
            });
            const data = await resp.json();
            setDocuments(prev => ({
                ...prev,
                [applicationId]: {
                    cv: data.cv_document,
                    coverLetter: data.cover_letter_document,
                    generationTimeMs: data.generation_time_ms,
                },
            }));
            return data;
        } catch (err) {
            setError(err.message || 'Generation failed');
            throw err;
        } finally {
            setGenerating(prev => {
                const next = new Set(prev);
                next.delete(applicationId);
                return next;
            });
        }
    }, [authenticatedFetch]);

    const fetchDocuments = useCallback(async (applicationId) => {
        try {
            const resp = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/cv-generation/?application_id=${applicationId}`
            );
            const docs = await resp.json();
            const cv = docs.find(d => d.doc_type === 'cv') || null;
            const coverLetter = docs.find(d => d.doc_type === 'cover_letter') || null;
            setDocuments(prev => ({
                ...prev,
                [applicationId]: { cv, coverLetter },
            }));
            return { cv, coverLetter };
        } catch (err) {
            logger.warn('Failed to fetch documents', err);
            return null;
        }
    }, [authenticatedFetch]);

    const getDocumentsFor = useCallback((applicationId) => {
        return documents[applicationId] || null;
    }, [documents]);

    const downloadPdf = useCallback(async (docId, filename) => {
        try {
            const resp = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/cv-generation/${docId}/pdf`
            );
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'document.pdf';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            logger.warn('Failed to download PDF', err);
        }
    }, [authenticatedFetch]);

    const downloadJson = useCallback(async (docId, filename) => {
        try {
            const resp = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/cv-generation/${docId}`
            );
            const data = await resp.json();
            const content = JSON.parse(data.content);
            const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'document.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            logger.warn('Failed to download JSON', err);
        }
    }, [authenticatedFetch]);

    const deleteDocument = useCallback(async (docId, applicationId) => {
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/cv-generation/${docId}`, {
                method: 'DELETE',
            });
            if (applicationId) {
                setDocuments(prev => {
                    const copy = { ...prev };
                    delete copy[applicationId];
                    return copy;
                });
            }
        } catch (err) {
            logger.warn('Failed to delete document', err);
        }
    }, [authenticatedFetch]);

    const isGenerating = useCallback((applicationId) => {
        return generating.has(applicationId);
    }, [generating]);

    return {
        generate,
        fetchDocuments,
        getDocumentsFor,
        downloadPdf,
        downloadJson,
        deleteDocument,
        isGenerating,
        generatingSet: generating,
        documents,
        error,
    };
}
