import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "../utils/axios";
import "../App.css";
import "./UserProfile.css";
import Loading from "../components/Loading";
import { useNotification } from "../hooks/useNotification";
import NotificationModal from "../components/NotificationModal";
import { getUserFromStorage } from "../utils/localStorage";

const UserProfile = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [user, setUser] = useState(null);

    // Profile form state
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    // Preferences form state
    const [preferences, setPreferences] = useState({
        preferredDifficulty: "medium",
        studyTime: "afternoon",
        favoriteCategories: []
    });

    // Privacy form state
    const [privacy, setPrivacy] = useState({
        profileVisibility: "public",
        showOnlineStatus: true,
        allowFriendRequests: true,
        showProgressToFriends: true
    });

    // Security form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const { notification, showSuccess, showError, hideNotification } = useNotification();

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            // Add cache-busting query params to ensure fresh data
            const timestamp = Date.now();
            const [profileRes, userRes] = await Promise.all([
                axios.get(`/api/users/profile?_t=${timestamp}`),
                axios.get(`/api/users/me?_t=${timestamp}`)
            ]);

            // profileRes.data is normalized to { profile } by axios interceptor
            // userRes.data is the user object directly (not using sendSuccess)
            const profileData = profileRes.data?.profile || profileRes.data;
            const userData = userRes.data;

            setProfile(profileData);
            setUser(userData);
            setName(profileData.name || "");
            setBio(profileData.bio || "");
            setAvatarUrl(profileData.avatarUrl || "");

            if (profileData.preferences) {
                setPreferences({
                    preferredDifficulty: profileData.preferences.preferredDifficulty || "medium",
                    studyTime: profileData.preferences.studyTime || "afternoon",
                    favoriteCategories: profileData.preferences.favoriteCategories || []
                });
            }

            if (profileData.social?.privacy) {
                setPrivacy({
                    profileVisibility: profileData.social.privacy.profileVisibility || "public",
                    showOnlineStatus: profileData.social.privacy.showOnlineStatus !== undefined
                        ? profileData.social.privacy.showOnlineStatus
                        : true,
                    allowFriendRequests: profileData.social.privacy.allowFriendRequests !== undefined
                        ? profileData.social.privacy.allowFriendRequests
                        : true,
                    showProgressToFriends: profileData.social.privacy.showProgressToFriends !== undefined
                        ? profileData.social.privacy.showProgressToFriends
                        : true
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            showError("Failed to load profile");
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await axios.put("/api/users/profile", {
                name,
                bio,
                avatarUrl
            });
            showSuccess("Profile updated successfully");
            fetchProfile();
        } catch (error) {
            console.error("Error updating profile:", error);
            showError(error.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            await axios.put("/api/users/preferences", {
                preferredDifficulty: preferences.preferredDifficulty,
                studyTime: preferences.studyTime
            });
            showSuccess("Preferences updated successfully");
            // Force refresh profile data by clearing any local cache and refetching
            await fetchProfile();
        } catch (error) {
            console.error("Error updating preferences:", error);
            showError(error.response?.data?.message || "Failed to update preferences");
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrivacy = async () => {
        setSaving(true);
        try {
            await axios.put("/api/users/privacy", privacy);
            showSuccess("Privacy settings updated successfully");
            fetchProfile();
        } catch (error) {
            console.error("Error updating privacy:", error);
            showError(error.response?.data?.message || "Failed to update privacy settings");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showError("New passwords do not match");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            showError("Password must be at least 6 characters");
            return;
        }

        setSaving(true);
        try {
            await axios.put("/api/users/password", {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            showSuccess("Password changed successfully");
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
        } catch (error) {
            console.error("Error changing password:", error);
            showError(error.response?.data?.message || "Failed to change password");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to delete your account? This action cannot be undone."
        );

        if (!confirmed) return;

        const password = window.prompt("Please enter your password to confirm account deletion:");

        if (!password) return;

        setSaving(true);
        try {
            await axios.delete("/api/users/account", {
                data: { password }
            });
            showSuccess("Account deleted successfully");
            localStorage.clear();
            navigate("/login");
        } catch (error) {
            console.error("Error deleting account:", error);
            showError(error.response?.data?.message || "Failed to delete account");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading fullScreen={true} />;

    const tabs = [
        { id: "profile", label: "Profile", icon: "👤" },
        { id: "preferences", label: "Preferences", icon: "⚙️" },
        { id: "privacy", label: "Privacy", icon: "🔒" },
        { id: "security", label: "Security", icon: "🛡️" },
        { id: "account", label: "Account", icon: "📋" }
    ];

    return (
        <motion.div
            className="user-profile-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="profile-header">
                <div className="profile-avatar-section">
                    <div className="avatar-container">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={name} className="avatar-image" />
                        ) : (
                            <div className="avatar-placeholder">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="profile-info">
                        <h1 className="profile-name">{name}</h1>
                        <p className="profile-email">{user?.email}</p>
                        <div className="profile-badges">
                            <span className="role-badge">{user?.role || "user"}</span>
                            <span className="level-badge">Level {profile?.stats?.level || 1}</span>
                        </div>
                    </div>
                </div>

                {profile?.stats && (
                    <div className="profile-stats">
                        <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="stat-icon">📚</div>
                            <div className="stat-value">{profile.stats.completedQuizzes || 0}</div>
                            <div className="stat-label">Quizzes</div>
                        </motion.div>
                        <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="stat-icon">🏆</div>
                            <div className="stat-value">{profile.stats.badges || 0}</div>
                            <div className="stat-label">Badges</div>
                        </motion.div>
                        <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="stat-icon">⭐</div>
                            <div className="stat-value">{profile.stats.totalXP || 0}</div>
                            <div className="stat-label">XP</div>
                        </motion.div>
                        <motion.div
                            className="stat-item"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="stat-icon">🔥</div>
                            <div className="stat-value">{profile.stats.loginStreak || 0}</div>
                            <div className="stat-label">Day Streak</div>
                        </motion.div>
                    </div>
                )}
            </div>

            <div className="profile-tabs">
                {tabs.map((tab, index) => (
                    <motion.button
                        key={tab.id}
                        className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </motion.button>
                ))}
            </div>

            <div className="profile-content">
                {activeTab === "profile" && (
                    <motion.div
                        className="profile-tab-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2>Profile Information</h2>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about yourself..."
                                rows={4}
                            />
                        </div>
                        <div className="form-group">
                            <label>Avatar URL</label>
                            <input
                                type="url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>
                        <button
                            className="save-btn"
                            onClick={handleSaveProfile}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Profile"}
                        </button>
                    </motion.div>
                )}

                {activeTab === "preferences" && (
                    <motion.div
                        className="profile-tab-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2>Learning Preferences</h2>
                        <div className="form-group">
                            <label>Preferred Difficulty</label>
                            <select
                                value={preferences.preferredDifficulty}
                                onChange={(e) => setPreferences(prev => ({
                                    ...prev,
                                    preferredDifficulty: e.target.value
                                }))}
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Preferred Study Time</label>
                            <select
                                value={preferences.studyTime}
                                onChange={(e) => setPreferences(prev => ({
                                    ...prev,
                                    studyTime: e.target.value
                                }))}
                            >
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                                <option value="night">Night</option>
                            </select>
                        </div>
                        <button
                            className="save-btn"
                            onClick={handleSavePreferences}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Preferences"}
                        </button>
                    </motion.div>
                )}

                {activeTab === "privacy" && (
                    <motion.div
                        className="profile-tab-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2>Privacy Settings</h2>
                        <div className="form-group">
                            <label>Profile Visibility</label>
                            <select
                                value={privacy.profileVisibility}
                                onChange={(e) => setPrivacy(prev => ({
                                    ...prev,
                                    profileVisibility: e.target.value
                                }))}
                            >
                                <option value="public">Public</option>
                                <option value="friends">Friends Only</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={privacy.showOnlineStatus}
                                    onChange={(e) => setPrivacy(prev => ({
                                        ...prev,
                                        showOnlineStatus: e.target.checked
                                    }))}
                                />
                                Show Online Status
                            </label>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={privacy.allowFriendRequests}
                                    onChange={(e) => setPrivacy(prev => ({
                                        ...prev,
                                        allowFriendRequests: e.target.checked
                                    }))}
                                />
                                Allow Friend Requests
                            </label>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={privacy.showProgressToFriends}
                                    onChange={(e) => setPrivacy(prev => ({
                                        ...prev,
                                        showProgressToFriends: e.target.checked
                                    }))}
                                />
                                Show Progress to Friends
                            </label>
                        </div>
                        <button
                            className="save-btn"
                            onClick={handleSavePrivacy}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Privacy Settings"}
                        </button>
                    </motion.div>
                )}

                {activeTab === "security" && (
                    <motion.div
                        className="profile-tab-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2>Change Password</h2>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm(prev => ({
                                    ...prev,
                                    currentPassword: e.target.value
                                }))}
                                placeholder="Enter current password"
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({
                                    ...prev,
                                    newPassword: e.target.value
                                }))}
                                placeholder="Enter new password (min 6 characters)"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm(prev => ({
                                    ...prev,
                                    confirmPassword: e.target.value
                                }))}
                                placeholder="Confirm new password"
                            />
                        </div>
                        <button
                            className="save-btn"
                            onClick={handleChangePassword}
                            disabled={saving}
                        >
                            {saving ? "Changing..." : "Change Password"}
                        </button>
                    </motion.div>
                )}

                {activeTab === "account" && (
                    <motion.div
                        className="profile-tab-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2>Account Settings</h2>
                        <div className="account-section">
                            <h3>Theme Preferences</h3>
                            <p className="section-description">
                                Current theme: {user?.selectedTheme || "Default"}
                            </p>
                            <button
                                className="secondary-btn"
                                onClick={() => navigate("/themes")}
                            >
                                Manage Themes →
                            </button>
                        </div>

                        <div className="account-section danger-section">
                            <h3>Danger Zone</h3>
                            <p className="section-description">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>
                            <button
                                className="danger-btn"
                                onClick={handleDeleteAccount}
                                disabled={saving}
                            >
                                {saving ? "Deleting..." : "Delete Account"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
            />
        </motion.div>
    );
};

export default UserProfile;
