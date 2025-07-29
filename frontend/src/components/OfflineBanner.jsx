// Offline Status Banner Component
import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './OfflineBanner.css';

const OfflineBanner = () => {
    const { isOnline, connectionType, isSlowConnection } = useNetworkStatus();

    if (isOnline && !isSlowConnection) {
        return null; // Don't show banner when online with good connection
    }

    return (
        <div className={`offline-banner ${isOnline ? 'slow-connection' : 'offline'}`}>
            <div className="offline-banner-content">
                <div className="offline-icon">
                    {isOnline ? '🐌' : '📴'}
                </div>
                <div className="offline-text">
                    <span className="offline-status">
                        {isOnline ? 'Slow Connection' : 'You\'re Offline'}
                    </span>
                    <span className="offline-message">
                        {isOnline 
                            ? `Connection: ${connectionType}. Some features may be slower.`
                            : 'Limited features available. Data will sync when connection is restored.'
                        }
                    </span>
                </div>
                {!isOnline && (
                    <button 
                        className="retry-connection-btn"
                        onClick={() => window.location.reload()}
                        title="Retry connection"
                    >
                        🔄
                    </button>
                )}
            </div>
        </div>
    );
};

export default OfflineBanner;
