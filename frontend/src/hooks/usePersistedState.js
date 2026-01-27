import { useState, useEffect } from 'react';

/**
 * Custom hook that combines useState with localStorage persistence
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value if not found in localStorage
 * @returns {[any, Function]} - [state, setState] similar to useState
 */
export const usePersistedState = (key, initialValue) => {
    const [state, setState] = useState(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved !== null) {
                // Try to parse as JSON, fallback to string
                try {
                    return JSON.parse(saved);
                } catch {
                    return saved;
                }
            }
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
        }
        return initialValue;
    });

    useEffect(() => {
        try {
            if (state === null || state === undefined) {
                localStorage.removeItem(key);
            } else {
                const valueToStore = typeof state === 'string' ? state : JSON.stringify(state);
                localStorage.setItem(key, valueToStore);
            }
        } catch (error) {
            console.error(`Error saving to localStorage key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
};

/**
 * Specialized hook for persisted number state (for pagination)
 * @param {string} key - localStorage key
 * @param {number} initialValue - Initial page number (default: 1)
 * @returns {[number, Function]} - [currentPage, setCurrentPage]
 */
export const usePersistedPage = (key, initialValue = 1) => {
    const [page, setPage] = useState(() => {
        try {
            const saved = parseInt(localStorage.getItem(key), 10);
            return saved && !isNaN(saved) ? saved : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, page.toString());
        } catch (error) {
            console.error(`Error saving to localStorage key "${key}":`, error);
        }
    }, [key, page]);

    return [page, setPage];
};
