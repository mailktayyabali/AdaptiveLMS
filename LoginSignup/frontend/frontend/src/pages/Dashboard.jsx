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
    const [initialLoading, setInitialLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination, Sorting & Search States
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(5);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    // Debounce search input by 300ms
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 300);

        return () => clearTimeout(handler);
    }, [search]);

    // Load initial role data
    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        const loadRoleData = async () => {
            try {
                let endpoint = 'user-data';
                if (user.role === 'admin') endpoint = 'admin-data';
                else if (user.role === 'manager') endpoint = 'manager-data';

                const data = await fetchRoleData(endpoint);
                setRoleData(data);
            } catch (err) {
                setError(err.message || 'Failed to fetch dashboard data');
            } finally {
                setInitialLoading(false);
            }
        };

        loadRoleData();
    }, [user, navigate]);

    // Fetch users smoothly when page, limit, sortBy, sortOrder, or debouncedSearch changes
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        const loadAdminUsers = async () => {
            setTableLoading(true);
            try {
                const usersData = await fetchUsers({ page, limit, sortBy, sortOrder, search: debouncedSearch });
                setUsers(usersData.users || []);
                setTotalPages(usersData.totalPages || 1);
                setTotalUsers(usersData.totalUsers || 0);
            } catch (err) {
                setError(err.message || 'Failed to fetch users');
            } finally {
                setTableLoading(false);
            }
        };

        loadAdminUsers();
    }, [user, page, limit, sortBy, sortOrder, debouncedSearch]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const handleRoleChange = async (userId, newRole) => {
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

    const getRoleBadgeClass = (role) => {
        if (role === 'admin') return 'role-badge badge-admin';
        if (role === 'manager') return 'role-badge badge-manager';
        return 'role-badge badge-user';
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) return <span className="sort-icon">↕</span>;
        return sortOrder === 'asc' ? <span className="sort-icon">▲</span> : <span className="sort-icon">▼</span>;
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

                {initialLoading ? (
                    <div className="loading-message">Loading...</div>
                ) : (
                    <>
                        {/* Admin Users Table */}
                        {user.role === 'admin' && (
                            <div className="users-table-container">
                                <div className="table-controls">
                                    <h3>Manage Users ({totalUsers})</h3>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, username..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="search-input"
                                    />
                                </div>

                                <table 
                                    className="users-table"
                                    style={{
                                        opacity: tableLoading ? 0.6 : 1,
                                        transition: 'opacity 0.2s ease-in-out'
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th onClick={() => handleSort('name')} className="sortable-header">
                                                Name {renderSortIcon('name')}
                                            </th>
                                            <th onClick={() => handleSort('email')} className="sortable-header">
                                                Email {renderSortIcon('email')}
                                            </th>
                                            <th onClick={() => handleSort('username')} className="sortable-header">
                                                Username {renderSortIcon('username')}
                                            </th>
                                            <th onClick={() => handleSort('role')} className="sortable-header">
                                                Current Role {renderSortIcon('role')}
                                            </th>
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

                                {/* Pagination Controls */}
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total <strong>{totalUsers}</strong> users)
                                    </div>
                                    <div className="pagination-buttons">
                                        <label htmlFor="limit-select" className="pagination-info">Per Page:</label>
                                        <select
                                            id="limit-select"
                                            value={limit}
                                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                            className="limit-select"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </select>
                                        <button
                                            disabled={page <= 1 || tableLoading}
                                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                            className="page-btn"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={page >= totalPages || tableLoading}
                                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                            className="page-btn"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}