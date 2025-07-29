// Network Detection Hook
import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [connectionType, setConnectionType] = useState(
        navigator.connection?.effectiveType || 'unknown'
    );

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            console.log('🌐 Network connection restored');
            
            // Show notification
            if ('serviceWorker' in navigator && 'Notification' in window) {
                new Notification('Connection Restored', {
                    body: 'Your internet connection has been restored. Syncing data...',
                    icon: '/quiz-img.png',
                    tag: 'network-status'
                });
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            console.log('📴 Network connection lost');
            
            // Show notification
            if ('serviceWorker' in navigator && 'Notification' in window) {
                new Notification('Connection Lost', {
                    body: 'You are now offline. Some features may not be available.',
                    icon: '/quiz-img.png',
                    tag: 'network-status'
                });
            }
        };

        const handleConnectionChange = () => {
            if (navigator.connection) {
                setConnectionType(navigator.connection.effectiveType);
            }
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        if (navigator.connection) {
            navigator.connection.addEventListener('change', handleConnectionChange);
        }

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            
            if (navigator.connection) {
                navigator.connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, []);

    return {
        isOnline,
        connectionType,
        isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g',
        isFastConnection: connectionType === '4g' || connectionType === '5g'
    };
};
