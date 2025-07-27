import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axios';
import './GroupSettingsModal.css';

const GroupSettingsModal = ({ group, isOpen, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        name: group?.name || '',
        description: group?.description || '',
        category: group?.category || '',
        maxMembers: group?.maxMembers || 50,
        tags: group?.tags || []
    });
    const [newTag, setNewTag] = useState('');
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        'Mathematics', 'Science', 'History', 'Literature', 'Geography',
        'Computer Science', 'Languages', 'Arts', 'Sports', 'General'
    ];

    // Reset form when group changes
    React.useEffect(() => {
        if (group) {
            setFormData({
                name: group.name || '',
                description: group.description || '',
                category: group.category || '',
                maxMembers: group.maxMembers || 50,
                tags: group.tags || []
            });
            setError('');
        }
    }, [group]);

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError('');
    }, []);

    const addTag = () => {
        const tag = newTag.trim();
        if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || formData.name.trim().length < 3) {
            setError('Group name must be at least 3 characters long');
            return;
        }

        if (formData.maxMembers < (group?.members?.length || 1)) {
            setError(`Maximum members cannot be less than current member count (${group?.members?.length || 1})`);
            return;
        }

        try {
            setUpdating(true);
            const response = await axios.put(`/api/study-groups/${group._id}`, {
                name: formData.name.trim(),
                description: formData.description.trim(),
                category: formData.category.trim(),
                maxMembers: parseInt(formData.maxMembers),
                tags: formData.tags
            });

            if (onUpdate) {
                onUpdate(response.data.studyGroup);
            }
            
            onClose();
        } catch (error) {
            console.error('Error updating group:', error);
            setError(error.response?.data?.message || 'Failed to update group settings');
        } finally {
            setUpdating(false);
        }
    };

    if (!isOpen || !group) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="group-settings-modal"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h2>Group Settings</h2>
                        <button className="close-btn" onClick={onClose}>
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="settings-form">
                        {error && (
                            <motion.div
                                className="error-message"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {error}
                                <button 
                                    type="button" 
                                    onClick={() => setError('')}
                                    className="error-close"
                                >
                                    ×
                                </button>
                            </motion.div>
                        )}

                        <div className="form-group">
                            <label>Group Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Enter group name"
                                required
                                minLength={3}
                                maxLength={100}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Describe your study group..."
                                rows={3}
                                maxLength={500}
                            />
                            <small>{formData.description.length}/500 characters</small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Max Members</label>
                                <input
                                    type="number"
                                    value={formData.maxMembers}
                                    onChange={(e) => handleInputChange('maxMembers', e.target.value)}
                                    min={group?.members?.length || 1}
                                    max={100}
                                />
                                <small>Current: {group?.members?.length || 0} members</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Tags (up to 5)</label>
                            <div className="tags-input">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Add a tag..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    disabled={formData.tags.length >= 5}
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    disabled={!newTag.trim() || formData.tags.includes(newTag.trim()) || formData.tags.length >= 5}
                                    className="add-tag-btn"
                                >
                                    Add
                                </button>
                            </div>
                            
                            {formData.tags.length > 0 && (
                                <div className="tags-list">
                                    {formData.tags.map(tag => (
                                        <span key={tag} className="form-tag">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="remove-tag"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="current-stats">
                            <h4>Current Group Stats</h4>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-value">{group?.members?.length || 0}</span>
                                    <span className="stat-label">Members</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{group?.stats?.totalQuizzes || 0}</span>
                                    <span className="stat-label">Quizzes Shared</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{group?.activities?.length || 0}</span>
                                    <span className="stat-label">Activities</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="cancel-btn" 
                                onClick={onClose}
                                disabled={updating}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="save-btn"
                                disabled={updating}
                            >
                                {updating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GroupSettingsModal;
