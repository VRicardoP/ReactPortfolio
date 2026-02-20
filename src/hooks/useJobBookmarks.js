import { useState, useCallback } from 'react';

const STORAGE_KEY = 'job-bookmarks';

const loadBookmarks = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

const saveBookmarks = (bookmarks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
};

/**
 * Hook for managing bookmarked jobs in localStorage.
 * Each bookmark stores: { id, title, company, url, source, savedAt }
 */
const useJobBookmarks = () => {
    const [bookmarks, setBookmarks] = useState(loadBookmarks);

    const isBookmarked = useCallback((jobId) => {
        return bookmarks.some(b => b.id === jobId);
    }, [bookmarks]);

    const toggleBookmark = useCallback((job) => {
        setBookmarks(prev => {
            const exists = prev.some(b => b.id === job.id);
            let next;
            if (exists) {
                next = prev.filter(b => b.id !== job.id);
            } else {
                next = [...prev, {
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    url: job.url,
                    source: job.source,
                    savedAt: new Date().toISOString(),
                }];
            }
            saveBookmarks(next);
            return next;
        });
    }, []);

    const removeBookmark = useCallback((jobId) => {
        setBookmarks(prev => {
            const next = prev.filter(b => b.id !== jobId);
            saveBookmarks(next);
            return next;
        });
    }, []);

    return { bookmarks, isBookmarked, toggleBookmark, removeBookmark };
};

export default useJobBookmarks;
