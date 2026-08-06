import { ProfileContext } from '../context/ProfileContext.jsx';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRoleData, fetchUsers, assignRoleToUser, fetchAllPermissions, updateUserPermissions, fetchRoles, updateRolePermissions, createRole } from '../services/authServices.js';
import { toast } from 'react-toastify';
import TicketManagement from '../components/TicketManagement.jsx';

export default function Dashboard() {
    const { user, logout } = useContext(ProfileContext);
    const navigate = useNavigate();
    const [roleData, setRoleData] = useState(null);
    const [users, setUsers] = useState([]);
    const [permissionsMap, setPermissionsMap] = useState({});
    const [roles, setRoles] = useState([]);
    const [newRoleData, setNewRoleData] = useState({
        name: '',
        description: '',
        canCreateTicket: false,
        canReadTicket: true,
        canUpdateTicket: false,
        canDeleteTicket: false
    });
    const [creatingRole, setCreatingRole] = useState(false);
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

    const [activeTab, setActiveTab] = useState('tickets');

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
                const [usersData, permData, rolesData] = await Promise.all([
                    fetchUsers({ page, limit, sortBy, sortOrder, search: debouncedSearch }),
                    fetchAllPermissions().catch(() => ({ success: false })),
                    fetchRoles().catch(() => ({ success: false }))
                ]);
                setUsers(usersData.users || []);
                setTotalPages(usersData.totalPages || 1);
                setTotalUsers(usersData.totalUsers || 0);

                if (permData && permData.success) {
                    setPermissionsMap(permData.permissions || {});
                }
                if (rolesData && rolesData.success) {
                    setRoles(rolesData.roles || []);
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch users');
            } finally {
                setTableLoading(false);
            }
        };

        loadAdminUsers();
    }, [user, page, limit, sortBy, sortOrder, debouncedSearch]);

    const loadRoles = async () => {
        try {
            const data = await fetchRoles();
            if (data && data.success) {
                setRoles(data.roles || []);
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
        }
    };

    useEffect(() => {
        if (user && user.role === 'admin') {
            loadRoles();
        }
    }, [user, activeTab]);

    const handleRolePermissionToggle = async (roleName, field, currentValue) => {
        try {
            const targetRole = roles.find(r => r.name === roleName);
            const currentPerms = targetRole?.permissions || {};
            const updatedValue = !currentValue;
            const updatedPerms = {
                canCreateTicket: currentPerms.canCreateTicket ?? false,
                canReadTicket: currentPerms.canReadTicket ?? true,
                canUpdateTicket: currentPerms.canUpdateTicket ?? false,
                canDeleteTicket: currentPerms.canDeleteTicket ?? false,
                [field]: updatedValue
            };

            const response = await updateRolePermissions(roleName, updatedPerms);
            if (response.success && response.role) {
                setRoles(prev => prev.map(r => r.name === roleName ? response.role : r));
                toast.success(`Role '${roleName}' permissions updated!`, { theme: "dark", position: "top-center" });
            }
        } catch (err) {
            setError(err.message || 'Failed to update role permission');
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRoleData.name.trim()) return;

        setCreatingRole(true);
        setError('');
        try {
            const response = await createRole(newRoleData);
            if (response.success && response.role) {
                setRoles(prev => [...prev, response.role]);
                toast.success(`Role '${response.role.name}' created successfully!`, { theme: "dark", position: "top-center" });
                setNewRoleData({
                    name: '',
                    description: '',
                    canCreateTicket: false,
                    canReadTicket: true,
                    canUpdateTicket: false,
                    canDeleteTicket: false
                });
            }
        } catch (err) {
            setError(err.message || 'Failed to create role');
            toast.error(err.message || 'Failed to create role', { theme: "dark", position: "top-center" });
        } finally {
            setCreatingRole(false);
        }
    };

    const handlePermissionToggle = async (userId, field, currentValue) => {
        try {
            const userPerm = permissionsMap[userId] || {};
            const updatedValue = !currentValue;
            const updatedPerm = { ...userPerm, [field]: updatedValue };

            // Optimistic update
            setPermissionsMap(prev => ({ ...prev, [userId]: updatedPerm }));

            const response = await updateUserPermissions(userId, {
                canCreateTicket: updatedPerm.canCreateTicket ?? false,
                canReadTicket: updatedPerm.canReadTicket ?? true,
                canUpdateTicket: updatedPerm.canUpdateTicket ?? false,
                canDeleteTicket: updatedPerm.canDeleteTicket ?? false
            });

            if (response.success && response.permission) {
                setPermissionsMap(prev => ({ ...prev, [userId]: response.permission }));
            }
        } catch (err) {
            setError(err.message || 'Failed to update user permission');
            const permData = await fetchAllPermissions().catch(() => ({ success: false }));
            if (permData && permData.success) {
                setPermissionsMap(permData.permissions || {});
            }
        }
    };

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
        if (role === 'admin') return 'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-purple-700 text-white';
        if (role === 'manager') return 'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-600 text-white';
        return 'inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-600 text-white';
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) return <span className="ml-1 text-xs opacity-60">↕</span>;
        return sortOrder === 'asc' ? <span className="ml-1 text-xs">▲</span> : <span className="ml-1 text-xs">▼</span>;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
            {/* Header */}
            <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md text-white px-6 md:px-10 py-5 shadow-xl flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                    Dashboard
                </h1>
                <button
                    onClick={handleLogout}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-md text-sm font-semibold transition-all shadow-md hover:-translate-y-0.5 cursor-pointer"
                >
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="p-4 md:p-10 max-w-7xl mx-auto">
                <div className="bg-white p-6 md:p-8 rounded-xl mb-8 shadow-xl border-l-4 border-indigo-500">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome, {user.name}!</h2>
                    <p className="text-slate-600 text-base">Role: <strong className="text-indigo-600 font-semibold">{user.role.toUpperCase()}</strong></p>
                </div>

                {error && (
                    <div className="text-red-700 p-4 bg-red-100 border-l-4 border-red-500 rounded-md mb-6 font-medium">
                        {error}
                    </div>
                )}

                {initialLoading ? (
                    <div className="text-center py-10 text-xl font-semibold text-white">Loading...</div>
                ) : (
                    <>
                        {/* Tab Switcher */}
                        <div className="flex gap-3 mb-6 overflow-x-auto">
                            <button
                                className={`px-6 py-3 text-sm font-semibold rounded-lg backdrop-blur-sm transition-all cursor-pointer ${
                                    activeTab === 'tickets'
                                        ? 'bg-white text-slate-900 shadow-lg font-bold'
                                        : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
                                }`}
                                onClick={() => setActiveTab('tickets')}
                            >
                                Support Tickets
                            </button>
                            {user.role === 'admin' && (
                                <>
                                    <button
                                        className={`px-6 py-3 text-sm font-semibold rounded-lg backdrop-blur-sm transition-all cursor-pointer ${
                                            activeTab === 'users'
                                                ? 'bg-white text-slate-900 shadow-lg font-bold'
                                                : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
                                        }`}
                                        onClick={() => setActiveTab('users')}
                                    >
                                        User Management
                                    </button>
                                    <button
                                        className={`px-6 py-3 text-sm font-semibold rounded-lg backdrop-blur-sm transition-all cursor-pointer ${
                                            activeTab === 'roles'
                                                ? 'bg-white text-slate-900 shadow-lg font-bold'
                                                : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
                                        }`}
                                        onClick={() => setActiveTab('roles')}
                                    >
                                        Role Permissions (RBAC)
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Tickets Tab Content */}
                        {activeTab === 'tickets' && <TicketManagement />}

                        {/* Dynamic Roles & Permissions Matrix Tab Content */}
                        {activeTab === 'roles' && user.role === 'admin' && (
                            <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl overflow-x-auto">
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 border-b-2 border-indigo-500 pb-2 mb-2">
                                        Dynamic Role Permissions (RBAC)
                                    </h3>
                                    <p className="text-slate-600 text-sm">
                                        Create new roles and modify their permissions dynamically in MongoDB with zero hardcoded rules.
                                    </p>
                                </div>

                                {/* Create New Role Form Card */}
                                <div className="bg-slate-50 border border-indigo-200 p-5 rounded-xl mb-6 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-800 mb-3">
                                        Create New Custom Role
                                    </h4>
                                    <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. supervisor, editor, admin"
                                                value={newRoleData.name}
                                                onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                                                required
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                                            <input
                                                type="text"
                                                placeholder="Role description..."
                                                value={newRoleData.description}
                                                onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Permissions</label>
                                            <div className="flex items-center gap-2 text-xs font-medium pt-2 text-slate-700">
                                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newRoleData.canCreateTicket}
                                                        onChange={(e) => setNewRoleData({ ...newRoleData, canCreateTicket: e.target.checked })}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>Create</span>
                                                </label>
                                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newRoleData.canReadTicket}
                                                        onChange={(e) => setNewRoleData({ ...newRoleData, canReadTicket: e.target.checked })}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>Read</span>
                                                </label>
                                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newRoleData.canUpdateTicket}
                                                        onChange={(e) => setNewRoleData({ ...newRoleData, canUpdateTicket: e.target.checked })}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>Update</span>
                                                </label>
                                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newRoleData.canDeleteTicket}
                                                        onChange={(e) => setNewRoleData({ ...newRoleData, canDeleteTicket: e.target.checked })}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>Delete</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={creatingRole}
                                                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-md text-sm font-semibold transition-all shadow cursor-pointer"
                                            >
                                                {creatingRole ? 'Creating...' : '+ Create Role'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                            <th className="p-4 text-left font-semibold">Role Name</th>
                                            <th className="p-4 text-left font-semibold">Description</th>
                                            <th className="p-4 text-center font-semibold">Role Ticket Permissions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {roles && roles.length > 0 ? (
                                            roles.map(r => (
                                                <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-slate-800 font-bold uppercase tracking-wide">
                                                        <span className={getRoleBadgeClass(r.name)}>
                                                            {r.name}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-600 text-xs">{r.description || 'System Role'}</td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs font-medium text-slate-700">
                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={r.permissions?.canCreateTicket ?? false}
                                                                    onChange={() => handleRolePermissionToggle(r.name, 'canCreateTicket', r.permissions?.canCreateTicket)}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Create</span>
                                                            </label>

                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={r.permissions?.canReadTicket ?? true}
                                                                    onChange={() => handleRolePermissionToggle(r.name, 'canReadTicket', r.permissions?.canReadTicket)}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Read</span>
                                                            </label>

                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={r.permissions?.canUpdateTicket ?? false}
                                                                    onChange={() => handleRolePermissionToggle(r.name, 'canUpdateTicket', r.permissions?.canUpdateTicket)}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Update</span>
                                                            </label>

                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={r.permissions?.canDeleteTicket ?? false}
                                                                    onChange={() => handleRolePermissionToggle(r.name, 'canDeleteTicket', r.permissions?.canDeleteTicket)}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Delete</span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="text-center py-8 text-slate-500">No roles configured</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Admin Users Table Tab Content */}
                        {activeTab === 'users' && user.role === 'admin' && (
                            <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl overflow-x-auto">
                                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                                    <h3 className="text-xl font-bold text-slate-800 border-b-2 border-indigo-500 pb-2">
                                        Manage Users ({totalUsers})
                                    </h3>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, username..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="px-4 py-2 border-2 border-indigo-500 rounded-lg text-sm w-full sm:w-72 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                    />
                                </div>

                                <table 
                                    className="w-full border-collapse text-sm"
                                    style={{
                                        opacity: tableLoading ? 0.6 : 1,
                                        transition: 'opacity 0.2s ease-in-out'
                                    }}
                                >
                                    <thead>
                                        <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                            <th onClick={() => handleSort('name')} className="p-4 text-left font-semibold cursor-pointer hover:bg-white/10 transition-colors">
                                                Name {renderSortIcon('name')}
                                            </th>
                                            <th onClick={() => handleSort('email')} className="p-4 text-left font-semibold cursor-pointer hover:bg-white/10 transition-colors">
                                                Email {renderSortIcon('email')}
                                            </th>
                                            <th onClick={() => handleSort('username')} className="p-4 text-left font-semibold cursor-pointer hover:bg-white/10 transition-colors">
                                                Username {renderSortIcon('username')}
                                            </th>
                                            <th onClick={() => handleSort('role')} className="p-4 text-left font-semibold cursor-pointer hover:bg-white/10 transition-colors">
                                                Current Role {renderSortIcon('role')}
                                            </th>
                                            <th className="p-4 text-center font-semibold">Assign Role</th>
                                            <th className="p-4 text-center font-semibold">Ticket Permissions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {users && users.length > 0 ? (
                                            users.map(u => (
                                                <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-slate-800 font-medium">{u.name}</td>
                                                    <td className="p-4 text-slate-600">{u.email}</td>
                                                    <td className="p-4 text-slate-600">{u.username}</td>
                                                    <td className="p-4">
                                                        <span className={getRoleBadgeClass(u.role)}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                            className="px-3 py-2 border-2 border-indigo-500 rounded-md text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all min-w-[140px]"
                                                        >
                                                            {Array.from(new Set(['user', 'manager', 'admin', ...roles.map(r => r.name.toLowerCase())])).map(rName => (
                                                                <option key={rName} value={rName}>{rName.toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs font-medium text-slate-700">
                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={permissionsMap[u._id]?.canCreateTicket ?? (u.role === 'admin' || u.role === 'manager')}
                                                                    onChange={() => handlePermissionToggle(u._id, 'canCreateTicket', permissionsMap[u._id]?.canCreateTicket ?? (u.role === 'admin' || u.role === 'manager'))}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Create</span>
                                                            </label>

                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={permissionsMap[u._id]?.canReadTicket ?? true}
                                                                    onChange={() => handlePermissionToggle(u._id, 'canReadTicket', permissionsMap[u._id]?.canReadTicket ?? true)}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Read</span>
                                                            </label>

                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={permissionsMap[u._id]?.canUpdateTicket ?? (u.role === 'admin' || u.role === 'manager')}
                                                                    onChange={() => handlePermissionToggle(u._id, 'canUpdateTicket', permissionsMap[u._id]?.canUpdateTicket ?? (u.role === 'admin' || u.role === 'manager'))}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Update</span>
                                                            </label>

                                                            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={permissionsMap[u._id]?.canDeleteTicket ?? (u.role === 'admin' || u.role === 'manager')}
                                                                    onChange={() => handlePermissionToggle(u._id, 'canDeleteTicket', permissionsMap[u._id]?.canDeleteTicket ?? (u.role === 'admin' || u.role === 'manager'))}
                                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span>Delete</span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center py-10 text-slate-500 text-base">
                                                    No users found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Pagination Controls */}
                                <div className="flex flex-wrap justify-between items-center mt-6 pt-4 border-t border-slate-200 gap-4">
                                    <div className="text-sm font-medium text-slate-600">
                                        Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total <strong>{totalUsers}</strong> users)
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label htmlFor="limit-select" className="text-sm font-medium text-slate-600">Per Page:</label>
                                        <select
                                            id="limit-select"
                                            value={limit}
                                            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                            className="px-3 py-1.5 border-2 border-indigo-500 rounded-md text-sm font-semibold bg-white text-slate-800 cursor-pointer"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </select>
                                        <button
                                            disabled={page <= 1 || tableLoading}
                                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-semibold transition-all cursor-pointer shadow"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={page >= totalPages || tableLoading}
                                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-semibold transition-all cursor-pointer shadow"
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