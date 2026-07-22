import { ProfileContext } from '../context/ProfileContext.jsx';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRoleData } from '../services/authServices.js';

export default function Dashboard() {
    const { user, logout } = useContext(ProfileContext);
    const navigate = useNavigate();
    const [roleData, setRoleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        const loadDashboardData = async () => {
            setLoading(true);
            setError('');
            try {
                let endpoint = 'user-data';
                if (user.role === 'admin') endpoint = 'admin-data';
                else if (user.role === 'manager') endpoint = 'manager-data';

                const data = await fetchRoleData(endpoint);
                setRoleData(data);
            } catch (err) {
                setError(err.message || 'Failed to fetch dashboard data');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user, navigate]);

    const handleLogout = () => {
        const confirmation = window.confirm('Are you sure you want to log out?');
        if (confirmation) {
            logout();
            navigate('/');
        }
    };

    if (!user) return null;

    // Get initial letter of name for avatar
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

    const getRoleBadgeClass = (role) => {
        if (role === 'admin') return 'role-badge badge-admin';
        if (role === 'manager') return 'role-badge badge-manager';
        return 'role-badge badge-user';
    };

    return (
        <div className="dashboard-container animate-fade-in">
            <header className="dashboard-header-bar">
                <div className="user-profile-summary">
                    <div className="dashboard-avatar">
                        {initial}
                    </div>
                    <div>
                        <h3>{user.name}</h3>
                        <p className="user-subtext">{user.email}</p>
                    </div>
                    <span className={getRoleBadgeClass(user.role)}>
                        {user.role.toUpperCase()}
                    </span>
                </div>
                <button onClick={handleLogout} className="btn-logout">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                    Logout
                </button>
            </header>

            <main className="dashboard-content">
                {loading ? (
                    <div className="dashboard-loading">
                        <div className="spinner"></div>
                        <p>Loading secure workspace...</p>
                    </div>
                ) : error ? (
                    <div className="status error-status">
                        <p><strong>Security Error:</strong> {error}</p>
                    </div>
                ) : (
                    <div className="role-specific-view">
                        <div className="welcome-banner">
                            <h2>{roleData?.message || 'Access Granted'}</h2>
                            <p>You have successfully authenticated using role-based access control.</p>
                        </div>

                        {/* Admin View */}
                        {user.role === 'admin' && roleData?.stats && (
                            <div className="admin-grid animate-scale-up">
                                <div className="metric-card bg-gradient-admin">
                                    <h4>Total Workspace Users</h4>
                                    <div className="metric-val">{roleData.stats.totalUsers}</div>
                                    <span className="metric-sub">Registered accounts</span>
                                </div>
                                <div className="metric-card bg-gradient-admin">
                                    <h4>Active Server Sessions</h4>
                                    <div className="metric-val">{roleData.stats.activeSessions}</div>
                                    <span className="metric-sub">Real-time connections</span>
                                </div>
                                <div className="metric-card bg-gradient-admin">
                                    <h4>System Health Status</h4>
                                    <div className="metric-val health-good">{roleData.stats.serverStatus}</div>
                                    <span className="metric-sub">All nodes operational</span>
                                </div>
                                <div className="admin-actions-card span-full">
                                    <h3>Administrative Actions</h3>
                                    <div className="admin-btn-group">
                                        <button className="btn-admin-action">Backup Server Database</button>
                                        <button className="btn-admin-action">Access Security Logs</button>
                                        <button className="btn-admin-action">User Management Console</button>
                                    </div>
                                    <div className="backup-timestamp">
                                        Last automated system backup: <code>{new Date(roleData.stats.lastBackup).toLocaleString()}</code>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Manager View */}
                        {user.role === 'manager' && roleData?.tasks && (
                            <div className="manager-view animate-scale-up">
                                <h3>Team Tasks & Operations</h3>
                                <div className="tasks-list">
                                    {roleData.tasks.map(task => (
                                        <div key={task.id} className="task-item">
                                            <div className="task-info">
                                                <span className="task-id">#{task.id}</span>
                                                <span className="task-title">{task.title}</span>
                                            </div>
                                            <span className={`task-badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="manager-controls">
                                    <button className="btn-manager-action">Create New Task</button>
                                    <button className="btn-manager-action">Generate Team Report</button>
                                </div>
                            </div>
                        )}

                        {/* User View */}
                        {user.role === 'user' && roleData?.announcements && (
                            <div className="user-view animate-scale-up">
                                <h3>Workspace Announcements</h3>
                                <div className="announcements-list">
                                    {roleData.announcements.map((announcement, idx) => (
                                        <div key={idx} className="announcement-item">
                                            <div className="announcement-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon">
                                                    <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <p className="announcement-text">{announcement}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="user-actions">
                                    <button className="btn-user-action">View Profile Settings</button>
                                    <button className="btn-user-action">Contact Support Team</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}