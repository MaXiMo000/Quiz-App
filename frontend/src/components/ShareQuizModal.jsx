import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './ShareQuizModal.css';

const ShareQuizModal = ({ quiz, isOpen, onClose, onShare }) => {
    const [userGroups, setUserGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);

    const handleShare = useCallback(async () => {
        if (selectedGroups.length === 0) {
            alert('Please select at least one group to share with.');
            return;
        }

        try {
            setSharing(true);

            // Share with each selected group
            const sharePromises = selectedGroups.map(groupId =>
                axios.post(`/api/study-groups/${groupId}/share-quiz`, {
                    quizId: quiz._id,
                    message: message.trim() || `Shared "${quiz.title}" quiz`
                })
            );

            await Promise.all(sharePromises);

            if (onShare) {
                onShare(selectedGroups.length);
            }

            // Reset form
            setSelectedGroups([]);
            setMessage('');
            onClose();

        } catch (error) {
            console.error('Error sharing quiz:', error);
            alert('Failed to share quiz. Please try again.');
        } finally {
            setSharing(false);
        }
    }, [selectedGroups, quiz, message, onShare, onClose]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Escape': () => {
            if (isOpen && !sharing) {
                onClose();
            }
        },
        'Enter': (e) => {
            if (isOpen && !sharing && selectedGroups.length > 0) {
                const target = e.target;
                const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                if (!isInputElement) {
                    e.preventDefault();
                    handleShare();
                }
            }
        },
    }, [isOpen, sharing, selectedGroups.length, handleShare]);

    useEffect(() => {
        if (isOpen) {
            fetchUserGroups();
            setMessage(`Check out this "${quiz?.title}" quiz!`);
        }
    }, [isOpen, quiz]);

    const fetchUserGroups = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/study-groups');
            setUserGroups(response.data.studyGroups || []);
        } catch (error) {
            console.error('Error fetching user groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGroupToggle = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-quiz-modal-title"
            >
                <motion.div
                    className="share-quiz-modal"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h2 id="share-quiz-modal-title">Share Quiz with Study Groups</h2>
                        <button className="close-btn" onClick={onClose} aria-label="Close share quiz modal" disabled={sharing}>
                            ×
                        </button>
                    </div>

                    <div className="modal-content">
                        <div className="quiz-info">
                            <h3>{quiz?.title}</h3>
                            <div className="quiz-meta">
                                <span className="category-tag">{quiz?.category}</span>
                                <span className="questions-count">{quiz?.questions?.length || 0} questions</span>
                            </div>
                        </div>

                        <div className="message-section">
                            <label htmlFor="share-message">Message (optional)</label>
                            <textarea
                                id="share-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a message for your group members..."
                                maxLength={200}
                                aria-label="Message for group members"
                                aria-describedby="message-char-count"
                            />
                            <small id="message-char-count">{message.length}/200 characters</small>
                        </div>

                        <div className="groups-section">
                            <h4>Select Study Groups:</h4>
                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Loading your study groups...</p>
                                </div>
                            ) : userGroups.length === 0 ? (
                                <div className="empty-state">
                                    <p>You're not a member of any study groups yet.</p>
                                    <button
                                        className="create-group-btn"
                                        onClick={() => {
                                            onClose();
                                            // Navigate to study groups page
                                            window.location.href = '/study-groups';
                                        }}
                                        aria-label="Create or join a study group"
                                    >
                                        Create or Join a Group
                                    </button>
                                </div>
                            ) : (
                                <div className="groups-list">
                                    {userGroups.map(group => (
                                        <motion.div
                                            key={group._id}
                                            className={`group-item ${selectedGroups.includes(group._id) ? 'selected' : ''}`}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => handleGroupToggle(group._id)}
                                            role="checkbox"
                                            aria-checked={selectedGroups.includes(group._id)}
                                            aria-label={`Select ${group.name} study group`}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleGroupToggle(group._id);
                                                }
                                            }}
                                        >
                                            <div className="group-avatar" aria-hidden="true">
                                                {group.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="group-info">
                                                <h5>{group.name}</h5>
                                                <p>{group.category} • {group.members?.length || 0} members</p>
                                            </div>
                                            <div className="checkbox">
                                                <div className={`checkbox-indicator ${selectedGroups.includes(group._id) ? 'checked' : ''}`}>
                                                    {selectedGroups.includes(group._id) && (
                                                        <span className="check-icon" aria-hidden="true">✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="cancel-btn" onClick={onClose} disabled={sharing} aria-label="Cancel sharing quiz">
                            Cancel
                        </button>
                        <button
                            className="share-btn"
                            onClick={handleShare}
                            disabled={sharing || selectedGroups.length === 0}
                            aria-label={sharing ? 'Sharing quiz' : selectedGroups.length === 0 ? 'Select groups to share' : `Share with ${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''}`}
                            aria-busy={sharing}
                        >
                            {sharing ? 'Sharing...' :
                             selectedGroups.length === 0 ? 'Select groups to share' :
                             `Share with ${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ShareQuizModal;
