import { ProfileContext } from '../context/ProfileContext.jsx';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRoleData, fetchUsers, assignRoleToUser } from '../services/authServices.js';
import './Dashboard.css';

export default function Dashboard() {
    const { user, logout } = useContext(ProfileContext);
    const navigate = useNavigate();
    const [roleData, setRoleData] = useState(null);
    const [users, setUsers] = useState([]);
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
                if (user.role === 'admin'){
                    const usersData = await fetchUsers();
                    setUsers(usersData.users || usersData);
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch dashboard data');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user, navigate]);

    const handleRoleChange = async (userId, newRole) =>{
        try {
            const token = localStorage.getItem('token');
            const response = await assignRoleToUser(userId, newRole, token);
            const updatedUser = response.user || response;
            setUsers(users.map(u => u._id === userId ? updatedUser : u));
        } catch (err) {
            setError('Failed to update role');
        }
    };

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
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">
                <div className="welcome-card">
                    <h2>Welcome, {user.name}!</h2>
                    <p>Role: <strong>{user.role.toUpperCase()}</strong></p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {loading ? (
                    <div className="loading-message">Loading...</div>
                ) : (
                    <>
                        {/* Admin Users Table */}
                        {user.role === 'admin' && (
                            <div className="users-table-container">
                                <h3>Manage Users</h3>
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Username</th>
                                            <th>Current Role</th>
                                            <th>Assign Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users && users.length > 0 ? (
                                            users.map(u => (
                                                <tr key={u._id}>
                                                    <td>{u.name}</td>
                                                    <td>{u.email}</td>
                                                    <td>{u.username}</td>
                                                    <td>
                                                        <span className={getRoleBadgeClass(u.role)}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                            className="role-select"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="manager">Manager</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="no-users-message">
                                                    No users found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Role-specific data
                        {roleData && (
                            <div className="role-data-container">
                                <h3>Dashboard Data</h3>
                                <pre>{JSON.stringify(roleData, null, 2)}</pre>
                            </div>
                        )} */}
                    </>
                )}
            </div>
        </div>
    );
}