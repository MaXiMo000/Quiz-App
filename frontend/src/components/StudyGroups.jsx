import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';
import GroupSettingsModal from './GroupSettingsModal';
import './StudyGroups.css';

// Enhanced Quiz Activity Component
const QuizActivity = React.memo(({ activity, onTakeQuiz }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [quizDetails, setQuizDetails] = useState(null);
    const { showError } = useNotification();

    // Fetch basic quiz info when component mounts
    useEffect(() => {
        const fetchBasicQuizInfo = async () => {
            if (!activity.details?.quizId) return;
            
            try {
                const response = await axios.get(`/api/quizzes/${activity.details.quizId}`);
                setQuizDetails(response.data);
            } catch (error) {
                console.error('Error fetching basic quiz info:', error);
                showError('Unable to load quiz details');
            }
        };

        fetchBasicQuizInfo();
    }, [activity.details?.quizId, showError]);

    const togglePreview = async () => {
        setShowPreview(!showPreview);
    };

    return (
        <div className="quiz-activity">
            <div className="quiz-activity-header">
                <div className="quiz-activity-icon">📝</div>
                <div className="quiz-activity-info">
                    <div className="quiz-activity-title">
                        {quizDetails?.title || activity.details?.quizTitle || 'Shared Quiz'}
                    </div>
                    <div className="quiz-activity-meta">
                        Shared by {activity.user?.name || 'Unknown'} • {new Date(activity.timestamp).toLocaleDateString()}
                        {quizDetails && (
                            <span> • {quizDetails.questions?.length || 0} questions</span>
                        )}
                    </div>
                </div>
                <div className="quiz-activity-actions">
                    <button
                        className="take-quiz-btn"
                        onClick={() => onTakeQuiz(activity.details?.quizId)}
                    >
                        <span>Take Quiz</span>
                        <span>→</span>
                    </button>
                </div>
            </div>

            <div className="quiz-preview">
                <div className="quiz-preview-header">
                    <span className="quiz-preview-title">Quiz Details</span>
                    <button
                        className="toggle-preview-btn"
                        onClick={togglePreview}
                    >
                        {showPreview ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>

                {showPreview && (
                    <div className="quiz-questions-preview">
                        {!quizDetails ? (
                            <div className="loading-quiz-details">
                                <div className="spinner"></div>
                                Loading quiz details...
                            </div>
                        ) : (
                            <>
                                <div className="quiz-stats">
                                    <div className="quiz-stat">
                                        <span>📊</span>
                                        <span>{quizDetails.questions?.length || 0} Questions</span>
                                    </div>
                                    <div className="quiz-stat">
                                        <span>📚</span>
                                        <span>{quizDetails.category || 'General'}</span>
                                    </div>
                                    <div className="quiz-stat">
                                        <span>⏱️</span>
                                        <span>{quizDetails.duration ? `${quizDetails.duration} min` : 'No limit'}</span>
                                    </div>
                                    {quizDetails.averageScore > 0 && (
                                        <div className="quiz-stat">
                                            <span>⭐</span>
                                            <span>Avg: {Math.round(quizDetails.averageScore)}%</span>
                                        </div>
                                    )}
                                </div>
                                
                                {quizDetails.questions?.slice(0, 3).map((question, index) => (
                                    <div key={index} className="question-preview">
                                        <div className="question-text">
                                            Q{index + 1}: {question.question}
                                        </div>
                                        <div className="answers-preview">
                                            {question.options?.map((option, optIndex) => (
                                                <div 
                                                    key={optIndex} 
                                                    className={`answer-option ${option === question.correctAnswer ? 'correct' : ''}`}
                                                >
                                                    <span className="answer-label">
                                                        {String.fromCharCode(65 + optIndex)}:
                                                    </span>
                                                    <span>{option}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                
                                {quizDetails.questions?.length > 3 && (
                                    <div style={{ 
                                        textAlign: 'center', 
                                        color: 'var(--text-secondary)', 
                                        fontSize: '0.85em',
                                        marginTop: '12px',
                                        fontStyle: 'italic'
                                    }}>
                                        +{quizDetails.questions.length - 3} more questions...
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// Separate component to prevent re-renders
const CreateGroupModal = React.memo(({ 
    showCreateModal, 
    setShowCreateModal, 
    createForm, 
    setCreateForm, 
    categories, 
    createGroup, 
    addTag, 
    removeTag 
}) => {
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            setShowCreateModal(false);
        }
    };

    const handleNameChange = useCallback((e) => {
        setCreateForm(prev => ({...prev, name: e.target.value}));
    }, [setCreateForm]);

    const handleDescriptionChange = useCallback((e) => {
        setCreateForm(prev => ({...prev, description: e.target.value}));
    }, [setCreateForm]);

    const handleCategoryChange = useCallback((e) => {
        setCreateForm(prev => ({...prev, category: e.target.value}));
    }, [setCreateForm]);

    const handleMaxMembersChange = useCallback((e) => {
        const value = e.target.value;
        const numValue = value === '' ? '' : parseInt(value, 10);
        setCreateForm(prev => ({...prev, maxMembers: isNaN(numValue) ? 50 : numValue}));
    }, [setCreateForm]);

    const handlePrivateChange = useCallback((e) => {
        setCreateForm(prev => ({...prev, isPrivate: e.target.checked}));
    }, [setCreateForm]);

    return (
        <>
            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onClick={handleOverlayClick}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                    <div className="modal-header">
                        <h2>Create Study Group</h2>
                        <button
                            className="close-btn"
                            onClick={() => setShowCreateModal(false)}
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={createGroup} className="create-form">
                        <div className="form-group">
                            <label>Group Name *</label>
                            <input
                                type="text"
                                value={createForm.name}
                                onChange={handleNameChange}
                                placeholder="Enter group name"
                                required
                                minLength={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={createForm.description}
                                onChange={handleDescriptionChange}
                                placeholder="Describe your study group"
                                rows={3}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={createForm.category}
                                    onChange={handleCategoryChange}
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Max Members</label>
                                <input
                                    type="number"
                                    value={createForm.maxMembers}
                                    onChange={handleMaxMembersChange}
                                    min={2}
                                    max={100}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={createForm.isPrivate}
                                    onChange={handlePrivateChange}
                                />
                                Private Group (invite only)
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Tags</label>
                            <div className="tags-input">
                                <input
                                    type="text"
                                    placeholder="Add tags (press Enter)"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <div className="tags-list">
                                    {createForm.tags.map(tag => (
                                        <span key={tag} className="form-tag">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="create-btn">
                                Create Group
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </>
    );
});

// GroupCard component - moved outside to prevent hoisting issues
const GroupCard = React.memo(({ group, showJoin = false, showLeave = false, currentUserId, onViewDetails, onJoinGroup, onLeaveGroup, onOpenSettings }) => {
    // Ensure group and members exist
    if (!group) return null;
    
    // Check if current user is admin of this group
    const userMember = group.members?.find(member => {
        const memberId = member.user?._id || member.user;
        return memberId === currentUserId;
    });
    const isAdmin = userMember?.role === 'admin';

    return (
        <motion.div
            className="group-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}
        >
            <div className="group-header">
                <div className="group-avatar">
                    {group.name?.charAt(0).toUpperCase()}
                </div>
                <div className="group-basic-info">
                    <h3>{group.name}</h3>
                    <p className="group-category">{group.category}</p>
                </div>
                <div className="group-privacy">
                    {group.isPrivate ? '🔒' : '🌍'}
                    {isAdmin && (
                        <button
                            className="settings-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenSettings(group);
                            }}
                            title="Group Settings"
                        >
                            ⚙️
                        </button>
                    )}
                </div>
            </div>

            <div className="group-description">
                <p>{group.description || 'No description available'}</p>
            </div>

            <div className="group-tags">
                {group.tags?.map(tag => (
                    <span key={tag} className="group-tag">{tag}</span>
                ))}
            </div>

            <div className="group-stats">
                <div className="stat">
                    <span className="stat-value">{group.memberCount || group.members?.length || 0}</span>
                    <span className="stat-label">Members</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{group.maxMembers}</span>
                    <span className="stat-label">Max</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{group.stats?.totalQuizzes || 0}</span>
                    <span className="stat-label">Quizzes</span>
                </div>
            </div>

            <div className="group-actions">
                <button
                    className="view-details-btn"
                    onClick={() => onViewDetails(group._id)}
                >
                    View Details
                </button>
                {showJoin && (
                    <button
                        className="join-btn"
                        onClick={() => onJoinGroup(group._id)}
                    >
                        Join Group
                    </button>
                )}
                {showLeave && (
                    <button
                        className="leave-btn"
                        onClick={() => onLeaveGroup(group._id)}
                    >
                        Leave Group
                    </button>
                )}
            </div>
        </motion.div>
    );
});

const StudyGroups = () => {
    const navigate = useNavigate();
    const { showSuccess, showError, notification, hideNotification } = useNotification();
    
    // State declarations
    const [activeTab, setActiveTab] = useState('myGroups');
    const [myGroups, setMyGroups] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Create group form state
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        category: '',
        maxMembers: 50,
        isPrivate: false,
        tags: []
    });

    const categories = [
        'Mathematics', 'Science', 'History', 'Literature', 'Geography',
        'Computer Science', 'Languages', 'Arts', 'Sports', 'General'
    ];

    useEffect(() => {
        // Get current user ID from token or localStorage
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserId(payload.id);
            } catch (error) {
                console.error('Error parsing token:', error);
            }
        }
    }, []);

    const fetchMyGroups = useCallback(async () => {
        try {
            const response = await axios.get('/api/study-groups');
            setMyGroups(response.data.studyGroups || []);
        } catch (error) {
            console.error('Error fetching study groups:', error);
            showError('Failed to load study groups');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchMyGroups();
    }, [fetchMyGroups]);

    const searchGroups = useCallback(async () => {
        if (activeTab !== 'browse') return; // Only search when on browse tab
        
        setSearchLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('query', searchQuery);
            if (selectedCategory) params.append('category', selectedCategory);
            
            const response = await axios.get(`/api/study-groups/search?${params}`);
            setSearchResults(response.data.studyGroups || []);
        } catch (error) {
            console.error('Error searching groups:', error);
            showError('Failed to search groups');
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [searchQuery, selectedCategory, activeTab, showError]);

    useEffect(() => {
        if (activeTab === 'browse') {
            const timeoutId = setTimeout(() => {
                searchGroups();
            }, 300); // 300ms debounce
            
            return () => clearTimeout(timeoutId);
        }
    }, [activeTab, searchQuery, selectedCategory, searchGroups]);

    const createGroup = async (e) => {
        e.preventDefault();
        try {
            // Ensure maxMembers is a valid number
            const formData = {
                ...createForm,
                maxMembers: typeof createForm.maxMembers === 'number' && !isNaN(createForm.maxMembers) 
                    ? createForm.maxMembers 
                    : 50
            };
            
            const response = await axios.post('/api/study-groups', formData);
            setMyGroups([response.data.studyGroup, ...myGroups]);
            setShowCreateModal(false);
            setCreateForm({
                name: '',
                description: '',
                category: '',
                maxMembers: 50,
                isPrivate: false,
                tags: []
            });
            showSuccess('Study group created successfully!');
        } catch (error) {
            console.error('Error creating group:', error);
            const errorMessage = error.response?.data?.message || 'Failed to create group';
            showError(errorMessage);
        }
    };

    const joinGroup = async (groupId) => {
        try {
            await axios.post(`/api/study-groups/${groupId}/join`);
            fetchMyGroups();
            searchGroups(); // Refresh search results
            showSuccess('Successfully joined the study group!');
        } catch (error) {
            console.error('Error joining group:', error);
            const errorMessage = error.response?.data?.message || 'Failed to join group';
            showError(errorMessage);
        }
    };

    const leaveGroup = async (groupId) => {
        try {
            await axios.post(`/api/study-groups/${groupId}/leave`);
            fetchMyGroups();
            showSuccess('Left the study group successfully');
        } catch (error) {
            console.error('Error leaving group:', error);
            const errorMessage = error.response?.data?.message || 'Failed to leave group';
            showError(errorMessage);
        }
    };

    const viewGroupDetails = async (groupId) => {
        try {
            const response = await axios.get(`/api/study-groups/${groupId}`);
            setSelectedGroup(response.data.studyGroup);
        } catch (error) {
            console.error('Error fetching group details:', error);
            const errorMessage = error.response?.data?.message || 'Failed to load group details';
            showError(errorMessage);
        }
    };

    const addTag = (tag) => {
        if (tag && !createForm.tags.includes(tag)) {
            setCreateForm({
                ...createForm,
                tags: [...createForm.tags, tag.trim()]
            });
        }
    };

    const removeTag = (tagToRemove) => {
        setCreateForm({
            ...createForm,
            tags: createForm.tags.filter(tag => tag !== tagToRemove)
        });
    };

    const handleGroupUpdate = (updatedGroup) => {
        // Update the group in myGroups list
        setMyGroups(prev => 
            prev.map(group => 
                group._id === updatedGroup._id ? updatedGroup : group
            )
        );
        
        // Update selectedGroup if it's the same group
        if (selectedGroup?._id === updatedGroup._id) {
            setSelectedGroup(updatedGroup);
        }
    };

    const openGroupSettings = (group) => {
        setEditingGroup(group);
        setShowSettingsModal(true);
    };

    const handleQuizClick = (quizId) => {
        if (quizId) {
            navigate(`/user/test/${quizId}`);
        }
    };

    // Render functions
    const renderMyGroups = () => (
        <motion.div
            key="my-groups"
            className="tab-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <div className="groups-grid">
                {myGroups.length > 0 ? (
                    myGroups.map(group => (
                        <GroupCard
                            key={group._id}
                            group={group}
                            showLeave={true}
                            currentUserId={currentUserId}
                            onViewDetails={viewGroupDetails}
                            onJoinGroup={joinGroup}
                            onLeaveGroup={leaveGroup}
                            onOpenSettings={openGroupSettings}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <h3>No Study Groups Yet</h3>
                        <p>Join existing groups or create your own to start learning together!</p>
                        <button
                            className="primary-btn"
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create Your First Group
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );

    const renderBrowseGroups = () => (
        <motion.div
            key="browse-groups"
            className="tab-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <div className="browse-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search groups by name, description, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="category-filter">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {searchLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading groups...</p>
                </div>
            ) : (
                <div className="groups-grid">
                    {searchResults.length > 0 ? (
                        searchResults.map(group => (
                            <GroupCard
                                key={group._id}
                                group={group}
                                showJoin={true}
                                currentUserId={currentUserId}
                                onViewDetails={viewGroupDetails}
                                onJoinGroup={joinGroup}
                                onLeaveGroup={leaveGroup}
                                onOpenSettings={openGroupSettings}
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <h3>No Groups Found</h3>
                            <p>Try adjusting your search criteria or create a new group!</p>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );

    const GroupDetailsModal = () => (
        <AnimatePresence>
            {selectedGroup && (
                <motion.div
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedGroup(null)}
                >
                    <motion.div
                        className="modal-content group-details-modal"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>{selectedGroup.name}</h2>
                            <button
                                className="close-btn"
                                onClick={() => setSelectedGroup(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="group-details-content">
                            <div className="group-overview">
                                <div className="group-meta">
                                    <span>📚 {selectedGroup.category}</span>
                                    <span>👥 {selectedGroup.members?.length} members</span>
                                    <span>{selectedGroup.isPrivate ? '🔒 Private' : '🌍 Public'}</span>
                                </div>
                                <p>{selectedGroup.description}</p>
                            </div>

                            <div className="group-members">
                                <h3>Members</h3>
                                <div className="members-list">
                                    {selectedGroup.members?.map((member, index) => (
                                        <div key={member._id || `member-${index}`} className="member-item">
                                            <div className="member-avatar">
                                                {(member.user?.name || 'Unknown')?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="member-info">
                                                <span className="member-name">{member.user?.name || 'Unknown User'}</span>
                                                <span className="member-role">{member.role}</span>
                                            </div>
                                            <div className="member-stats">
                                                Level {member.user?.level || 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="group-activities">
                                <h3>Recent Activities</h3>
                                <div className="activities-list">
                                    {selectedGroup.activities?.slice(0, 10).map((activity, index) => {
                                        if (activity.type === 'quiz_shared' && activity.details?.quizId) {
                                            return (
                                                <QuizActivity
                                                    key={`activity-${index}-${activity.timestamp || Date.now()}`}
                                                    activity={activity}
                                                    onTakeQuiz={handleQuizClick}
                                                />
                                            );
                                        }
                                        
                                        return (
                                            <div key={`activity-${index}-${activity.timestamp || Date.now()}`} 
                                                 className="activity-item"
                                            >
                                                <div className="activity-icon">
                                                    {activity.type === 'member_joined' ? '👋' : '📊'}
                                                </div>
                                                <div className="activity-details">
                                                    <span className="activity-message">
                                                        {activity.details?.message || activity.details}
                                                    </span>
                                                    <span className="activity-time">
                                                        {new Date(activity.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {(!selectedGroup.activities || selectedGroup.activities.length === 0) && (
                                        <div style={{ 
                                            textAlign: 'center', 
                                            color: 'var(--text-secondary)', 
                                            padding: '20px',
                                            fontSize: '0.9em'
                                        }}>
                                            No recent activities
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="study-groups">
            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading study groups...</p>
                </div>
            )}

            <motion.div
                className="study-groups-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2>📚 Study Groups</h2>
                <p>Join or create study groups to learn together with other quiz enthusiasts!</p>
            </motion.div>

            {!loading && (
                <>
                    <div className="study-groups-tabs">
                        <button
                            className={`tab-button ${activeTab === 'myGroups' ? 'active' : ''}`}
                            onClick={() => setActiveTab('myGroups')}
                        >
                            My Groups ({myGroups.length})
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
                            onClick={() => setActiveTab('browse')}
                        >
                            Browse Groups
                        </button>
                <button
                    className="create-group-btn"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Create Group
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'myGroups' && renderMyGroups()}
                {activeTab === 'browse' && renderBrowseGroups()}
            </AnimatePresence>
                </>
            )}

            {/* Modals should always be available */}
            <CreateGroupModal 
                showCreateModal={showCreateModal}
                setShowCreateModal={setShowCreateModal}
                createForm={createForm}
                setCreateForm={setCreateForm}
                categories={categories}
                createGroup={createGroup}
                addTag={addTag}
                removeTag={removeTag}
            />
            <GroupDetailsModal />
            <GroupSettingsModal 
                group={editingGroup}
                isOpen={showSettingsModal}
                onClose={() => {
                    setShowSettingsModal(false);
                    setEditingGroup(null);
                }}
                onUpdate={handleGroupUpdate}
            />

            <NotificationModal
                notification={notification}
                onClose={hideNotification}
            />
        </div>
    );
};

export default StudyGroups;
