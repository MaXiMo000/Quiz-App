import { useState, useCallback } from 'react';

export const useNotification = () => {
    const [notification, setNotification] = useState({
        isOpen: false,
        message: '',
        type: 'info',
        autoClose: true
    });

    const showNotification = useCallback((message, type = 'info', autoClose = true) => {
        setNotification({
            isOpen: true,
            message,
            type,
            autoClose
        });
    }, []);

    const hideNotification = useCallback(() => {
        setNotification(prev => ({ ...prev, isOpen: false }));
    }, []);

    // Convenience methods for different types
    const showSuccess = useCallback((message, autoClose = true) => {
        showNotification(message, 'success', autoClose);
    }, [showNotification]);

    const showError = useCallback((message, autoClose = true) => {
        showNotification(message, 'error', autoClose);
    }, [showNotification]);

    const showWarning = useCallback((message, autoClose = true) => {
        showNotification(message, 'warning', autoClose);
    }, [showNotification]);

    const showInfo = useCallback((message, autoClose = true) => {
        showNotification(message, 'info', autoClose);
    }, [showNotification]);

    return {
        notification,
        showNotification,
        hideNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo
    };
};
