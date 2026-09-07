import { ProfileContext } from '../context/ProfileContext.jsx';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
        if (role === 'admin') return 'inline-flex items-center px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30';
        if (role === 'manager') return 'inline-flex items-center px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30';
        return 'inline-flex items-center px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) return <span className="ml-1 text-xs opacity-40">↕</span>;
        return sortOrder === 'asc' ? <span className="ml-1 text-xs text-indigo-400">▲</span> : <span className="ml-1 text-xs text-indigo-400">▼</span>;
    };

    return (
        <div className="min-h-screen text-slate-100 pb-16">
            {/* Top Sub-Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 flex flex-wrap justify-between items-center gap-4 border-b border-white/[0.08]">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white">
                        Workspace Console
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">Role-Based Access Control, ticket support, and user administration</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/profile"
                        className="scale-press px-4 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-full text-xs font-semibold transition-all border border-indigo-500/30 cursor-pointer"
                    >
                        My Profile
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="scale-press px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-full text-xs font-semibold transition-all border border-rose-500/30 cursor-pointer"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
                {/* Welcome Card */}
                <div className="double-bezel">
                    <div className="double-bezel-inner p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="text-xs text-slate-400 font-medium">Signed in as</div>
                            <h2 className="text-2xl font-extrabold text-white tracking-tight">{user.name}</h2>
                            <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">System Role:</span>
                            <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="text-rose-300 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium">
                        {error}
                    </div>
                )}

                {initialLoading ? (
                    <div className="text-center py-16 text-sm font-semibold text-slate-400 animate-pulse">Loading workspace telemetry...</div>
                ) : (
                    <>
                        {/* Tab Switcher */}
                        <div className="p-1 rounded-full bg-white/[0.04] border border-white/10 inline-flex gap-1 overflow-x-auto max-w-full">
                            <button
                                className={`scale-press px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                                    activeTab === 'tickets'
                                        ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/15'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                }`}
                                onClick={() => setActiveTab('tickets')}
                            >
                                Support Tickets
                            </button>
                            {user.role === 'admin' && (
                                <>
                                    <button
                                        className={`scale-press px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                                            activeTab === 'users'
                                                ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/15'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                        }`}
                                        onClick={() => setActiveTab('users')}
                                    >
                                        User Management
                                    </button>
                                    <button
                                        className={`scale-press px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                                            activeTab === 'roles'
                                                ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/15'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
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
                            <div className="double-bezel">
                                <div className="double-bezel-inner p-6 sm:p-8 space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight">
                                            Dynamic Role Permissions (RBAC)
                                        </h3>
                                        <p className="text-slate-400 text-xs mt-1">
                                            Create custom roles and modify real-time access scopes in MongoDB without redeploying code.
                                        </p>
                                    </div>

                                    {/* Create New Role Form Card */}
                                    <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            Create New Custom Role
                                        </h4>
                                        <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-300 mb-1">Role Name *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. auditor, reviewer"
                                                    value={newRoleData.name}
                                                    onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                                                    required
                                                    className="w-full px-3 py-2 border border-white/10 rounded-xl text-xs bg-[#080c14] text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                                                <input
                                                    type="text"
                                                    placeholder="Role responsibilities..."
                                                    value={newRoleData.description}
                                                    onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border border-white/10 rounded-xl text-xs bg-[#080c14] text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-300 mb-1">Ticket Permissions</label>
                                                <div className="flex items-center gap-3 text-xs font-medium pt-2 text-slate-300">
                                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={newRoleData.canCreateTicket}
                                                            onChange={(e) => setNewRoleData({ ...newRoleData, canCreateTicket: e.target.checked })}
                                                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                                                        />
                                                        <span>Create</span>
                                                    </label>
                                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={newRoleData.canReadTicket}
                                                            onChange={(e) => setNewRoleData({ ...newRoleData, canReadTicket: e.target.checked })}
                                                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                                                        />
                                                        <span>Read</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div>
                                                <button
                                                    type="submit"
                                                    disabled={creatingRole}
                                                    className="scale-press w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 cursor-pointer disabled:opacity-50"
                                                >
                                                    {creatingRole ? 'Creating Role...' : '+ Save Role'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Roles Table */}
                                    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                                        <table className="w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-white/[0.04] text-slate-400 border-b border-white/[0.08]">
                                                    <th className="p-3.5 text-left font-semibold uppercase tracking-wider">Role</th>
                                                    <th className="p-3.5 text-left font-semibold uppercase tracking-wider">Description</th>
                                                    <th className="p-3.5 text-center font-semibold uppercase tracking-wider">Ticket Permissions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.06]">
                                                {roles && roles.length > 0 ? (
                                                    roles.map(r => (
                                                        <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="p-3.5">
                                                                <span className={getRoleBadgeClass(r.name)}>
                                                                    {r.name}
                                                                </span>
                                                            </td>
                                                            <td className="p-3.5 text-slate-400">{r.description || 'System Role'}</td>
                                                            <td className="p-3.5 text-center">
                                                                <div className="flex items-center justify-center gap-4 text-slate-300">
                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={r.permissions?.canCreateTicket ?? false}
                                                                            onChange={() => handleRolePermissionToggle(r.name, 'canCreateTicket', r.permissions?.canCreateTicket)}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Create</span>
                                                                    </label>
                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={r.permissions?.canReadTicket ?? true}
                                                                            onChange={() => handleRolePermissionToggle(r.name, 'canReadTicket', r.permissions?.canReadTicket)}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Read</span>
                                                                    </label>
                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={r.permissions?.canUpdateTicket ?? false}
                                                                            onChange={() => handleRolePermissionToggle(r.name, 'canUpdateTicket', r.permissions?.canUpdateTicket)}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Update</span>
                                                                    </label>
                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={r.permissions?.canDeleteTicket ?? false}
                                                                            onChange={() => handleRolePermissionToggle(r.name, 'canDeleteTicket', r.permissions?.canDeleteTicket)}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
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
                                </div>
                            </div>
                        )}

                        {/* Admin Users Table Tab Content */}
                        {activeTab === 'users' && user.role === 'admin' && (
                            <div className="double-bezel">
                                <div className="double-bezel-inner p-6 sm:p-8 space-y-6">
                                    <div className="flex flex-wrap justify-between items-center gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white tracking-tight">
                                                Manage Users <span className="text-indigo-400 tabular-nums">({totalUsers})</span>
                                            </h3>
                                            <p className="text-xs text-slate-400">View and adjust user privileges across system accounts</p>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Filter users..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="px-3.5 py-1.5 rounded-full border border-white/10 text-xs w-full sm:w-72 bg-[#080c14] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                                        <table 
                                            className="w-full border-collapse text-xs"
                                            style={{
                                                opacity: tableLoading ? 0.6 : 1,
                                                transition: 'opacity 0.2s ease-in-out'
                                            }}
                                        >
                                            <thead>
                                                <tr className="bg-white/[0.04] text-slate-400 border-b border-white/[0.08]">
                                                    <th onClick={() => handleSort('name')} className="p-3.5 text-left font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                                        Name {renderSortIcon('name')}
                                                    </th>
                                                    <th onClick={() => handleSort('email')} className="p-3.5 text-left font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                                        Email {renderSortIcon('email')}
                                                    </th>
                                                    <th onClick={() => handleSort('username')} className="p-3.5 text-left font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                                        Username {renderSortIcon('username')}
                                                    </th>
                                                    <th onClick={() => handleSort('role')} className="p-3.5 text-left font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                                                        Current Role {renderSortIcon('role')}
                                                    </th>
                                                    <th className="p-3.5 text-center font-semibold uppercase tracking-wider">Assign Role</th>
                                                    <th className="p-3.5 text-center font-semibold uppercase tracking-wider">Ticket Permissions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.06]">
                                                {users && users.length > 0 ? (
                                                    users.map(u => (
                                                        <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="p-3.5 text-white font-medium">{u.name}</td>
                                                            <td className="p-3.5 text-slate-400">{u.email}</td>
                                                            <td className="p-3.5 text-slate-400">{u.username}</td>
                                                            <td className="p-3.5">
                                                                <span className={getRoleBadgeClass(u.role)}>
                                                                    {u.role}
                                                                </span>
                                                            </td>
                                                            <td className="p-3.5 text-center">
                                                                <select
                                                                    value={u.role}
                                                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                                    className="px-2.5 py-1 border border-white/10 rounded-lg text-xs font-semibold bg-[#080c14] text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[130px]"
                                                                >
                                                                    {Array.from(new Set(['user', 'manager', 'admin', ...roles.map(r => r.name.toLowerCase())])).map(rName => (
                                                                        <option key={rName} value={rName}>{rName.toUpperCase()}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-3.5 text-center">
                                                                <div className="flex items-center justify-center gap-3 sm:gap-4 text-slate-300">
                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={permissionsMap[u._id]?.canCreateTicket ?? (u.role === 'admin' || u.role === 'manager')}
                                                                            onChange={() => handlePermissionToggle(u._id, 'canCreateTicket', permissionsMap[u._id]?.canCreateTicket ?? (u.role === 'admin' || u.role === 'manager'))}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Create</span>
                                                                    </label>

                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={permissionsMap[u._id]?.canReadTicket ?? true}
                                                                            onChange={() => handlePermissionToggle(u._id, 'canReadTicket', permissionsMap[u._id]?.canReadTicket ?? true)}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Read</span>
                                                                    </label>

                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={permissionsMap[u._id]?.canUpdateTicket ?? (u.role === 'admin' || u.role === 'manager')}
                                                                            onChange={() => handlePermissionToggle(u._id, 'canUpdateTicket', permissionsMap[u._id]?.canUpdateTicket ?? (u.role === 'admin' || u.role === 'manager'))}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Update</span>
                                                                    </label>

                                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={permissionsMap[u._id]?.canDeleteTicket ?? (u.role === 'admin' || u.role === 'manager')}
                                                                            onChange={() => handlePermissionToggle(u._id, 'canDeleteTicket', permissionsMap[u._id]?.canDeleteTicket ?? (u.role === 'admin' || u.role === 'manager'))}
                                                                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                                                        />
                                                                        <span>Delete</span>
                                                                    </label>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-10 text-slate-500">
                                                            No users found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls with Tabular Numbers */}
                                    <div className="flex flex-wrap justify-between items-center pt-4 border-t border-white/[0.08] gap-4 text-xs">
                                        <div className="tabular-nums text-slate-400">
                                            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> (Total <strong className="text-white">{totalUsers}</strong> users)
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label htmlFor="limit-select" className="text-slate-400">Per Page:</label>
                                            <select
                                                id="limit-select"
                                                value={limit}
                                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                                className="px-2.5 py-1 border border-white/10 rounded-lg font-semibold bg-[#080c14] text-white cursor-pointer"
                                            >
                                                <option value={5}>5</option>
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                            </select>
                                            <button
                                                disabled={page <= 1 || tableLoading}
                                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                                className="scale-press px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all border border-white/10 cursor-pointer"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                disabled={page >= totalPages || tableLoading}
                                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                                className="scale-press px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all border border-white/10 cursor-pointer"
                                            >
                                                Next
                                            </button>
                                        </div>
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