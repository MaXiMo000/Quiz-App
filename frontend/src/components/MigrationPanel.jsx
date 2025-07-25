import React, { useState } from 'react';
import axios from '../utils/axios';
import './MigrationPanel.css';

const MigrationPanel = () => {
    const [migrationStatus, setMigrationStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const runMigration = async () => {
        setLoading(true);
        setMigrationStatus('Starting migration...');
        
        try {
            const response = await axios.post('/api/migrate/quiz-difficulty');
            setMigrationStatus(`✅ Migration completed! Updated ${response.data.updatedCount} quizzes.`);
        } catch (error) {
            console.error('Migration failed:', error);
            setMigrationStatus(`❌ Migration failed: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="migration-panel">
            <h3>🔧 Database Migrations</h3>
            <p>Run this once to update existing quizzes with Phase 2 features</p>
            
            <button 
                onClick={runMigration} 
                disabled={loading}
                className="migration-btn"
            >
                {loading ? '⏳ Running Migration...' : '🚀 Update Quiz Difficulty Distribution'}
            </button>
            
            {migrationStatus && (
                <div className={`migration-status ${migrationStatus.includes('✅') ? 'success' : migrationStatus.includes('❌') ? 'error' : 'info'}`}>
                    {migrationStatus}
                </div>
            )}
        </div>
    );
};

export default MigrationPanel;
