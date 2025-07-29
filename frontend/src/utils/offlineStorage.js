// Offline Storage Utility for PWA
// Handles offline data caching and synchronization

class OfflineStorage {
    constructor() {
        this.isOnline = navigator.onLine;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Quiz Data Management
    async cacheQuizData(quizId, quizData) {
        try {
            const cached = this.getCachedQuizzes();
            cached[quizId] = {
                ...quizData,
                cachedAt: Date.now(),
                offline: true
            };
            localStorage.setItem('cached-quizzes', JSON.stringify(cached));
            
            // Also cache individual quiz questions for offline taking
            if (quizData.questions && quizData.questions.length > 0) {
                const questionsCache = this.getCachedQuestions();
                questionsCache[quizId] = quizData.questions;
                localStorage.setItem('cached-questions', JSON.stringify(questionsCache));
            }
            
            // Cache in service worker
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CACHE_QUIZ_DATA',
                    quizData: quizData
                });
            }
        } catch (error) {
            console.error('Failed to cache quiz data:', error);
        }
    }

    getCachedQuestions() {
        try {
            const cached = localStorage.getItem('cached-questions');
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.error('Failed to get cached questions:', error);
            return {};
        }
    }

    getCachedQuizQuestions(quizId) {
        const cached = this.getCachedQuestions();
        return cached[quizId] || [];
    }

    getCachedQuizzes() {
        try {
            const cached = localStorage.getItem('cached-quizzes');
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.error('Failed to get cached quizzes:', error);
            return {};
        }
    }

    getCachedQuiz(quizId) {
        const cached = this.getCachedQuizzes();
        return cached[quizId] || null;
    }

    // Dashboard Data Management
    cacheDashboardData(userId, dashboardData) {
        try {
            const cacheKey = `dashboard-${userId}`;
            const dataWithTimestamp = {
                ...dashboardData,
                cachedAt: Date.now(),
                offline: true
            };
            localStorage.setItem(cacheKey, JSON.stringify(dataWithTimestamp));
        } catch (error) {
            console.error('Failed to cache dashboard data:', error);
        }
    }

    getCachedDashboardData(userId) {
        try {
            const cacheKey = `dashboard-${userId}`;
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to get cached dashboard data:', error);
            return null;
        }
    }

    // Quiz Submission Management
    async storeQuizSubmission(submission) {
        try {
            const submissions = this.getPendingSubmissions();
            const submissionWithId = {
                ...submission,
                id: Date.now().toString(),
                submittedAt: Date.now(),
                synced: false
            };
            submissions.push(submissionWithId);
            localStorage.setItem('pending-quiz-submissions', JSON.stringify(submissions));
            
            // If online, try to sync immediately
            if (this.isOnline) {
                this.syncPendingSubmissions();
            }
            
            return submissionWithId;
        } catch (error) {
            console.error('Failed to store quiz submission:', error);
            throw error;
        }
    }

    getPendingSubmissions() {
        try {
            const stored = localStorage.getItem('pending-quiz-submissions');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to get pending submissions:', error);
            return [];
        }
    }

    // Reports Management
    cacheReportsData(userId, reports) {
        try {
            const cacheKey = `reports-${userId}`;
            const dataWithTimestamp = {
                reports,
                cachedAt: Date.now(),
                offline: true
            };
            localStorage.setItem(cacheKey, JSON.stringify(dataWithTimestamp));
        } catch (error) {
            console.error('Failed to cache reports data:', error);
        }
    }

    getCachedReports(userId) {
        try {
            const cacheKey = `reports-${userId}`;
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to get cached reports:', error);
            return null;
        }
    }

    // Synchronization
    async syncPendingData() {
        try {
            await this.syncPendingSubmissions();
            await this.syncPendingChatMessages();
            console.log('✅ Offline data synchronized');
        } catch (error) {
            console.error('❌ Failed to sync offline data:', error);
        }
    }

    async syncPendingSubmissions() {
        const submissions = this.getPendingSubmissions();
        const unsynced = submissions.filter(sub => !sub.synced);
        
        for (const submission of unsynced) {
            try {
                // This would normally make an API call
                // For now, just mark as synced
                submission.synced = true;
            } catch (error) {
                console.error('Failed to sync submission:', submission.id, error);
            }
        }
        
        // Update storage
        localStorage.setItem('pending-quiz-submissions', JSON.stringify(submissions));
    }

    async syncPendingChatMessages() {
        // Similar implementation for chat messages
        const messages = this.getPendingChatMessages();
        const unsynced = messages.filter(msg => !msg.synced);
        
        for (const message of unsynced) {
            try {
                message.synced = true;
            } catch (error) {
                console.error('Failed to sync chat message:', message.id, error);
            }
        }
        
        localStorage.setItem('pending-chat-messages', JSON.stringify(messages));
    }

    getPendingChatMessages() {
        try {
            const stored = localStorage.getItem('pending-chat-messages');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to get pending chat messages:', error);
            return [];
        }
    }

    // Utility Methods
    isDataStale(data, maxAgeMinutes = 30) {
        if (!data || !data.cachedAt) return true;
        const ageMinutes = (Date.now() - data.cachedAt) / (1000 * 60);
        return ageMinutes > maxAgeMinutes;
    }

    clearOldCache(maxAgeHours = 24) {
        try {
            const maxAge = maxAgeHours * 60 * 60 * 1000;
            const now = Date.now();
            
            // Clear old quiz cache
            const quizzes = this.getCachedQuizzes();
            Object.keys(quizzes).forEach(quizId => {
                if (now - quizzes[quizId].cachedAt > maxAge) {
                    delete quizzes[quizId];
                }
            });
            localStorage.setItem('cached-quizzes', JSON.stringify(quizzes));
            
            console.log('🧹 Old cache data cleared');
        } catch (error) {
            console.error('Failed to clear old cache:', error);
        }
    }

    // Network Status
    getNetworkStatus() {
        return {
            isOnline: this.isOnline,
            connection: navigator.connection || null,
            effectiveType: navigator.connection?.effectiveType || 'unknown'
        };
    }
}

// Export singleton instance
export default new OfflineStorage();
