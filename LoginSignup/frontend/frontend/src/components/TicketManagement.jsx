import { useState, useEffect, useContext } from 'react';
import { ProfileContext } from '../context/ProfileContext.jsx';
import {
  fetchAllTickets,
  createTicket,
  updateTicket,
  deleteTicket,
} from '../services/ticketServices.js';

export default function TicketManagement() {
  const { user } = useContext(ProfileContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    internalPriority: 'P3-Medium',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllTickets();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTicket(null);
    setFormData({
      title: '',
      description: '',
      status: 'open',
      internalPriority: 'P3-Medium',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      status: ticket.status || 'open',
      internalPriority: ticket.internalPriority || 'P3-Medium',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingTicket) {
        const payload = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
        };
        if (user?.role === 'admin' && formData.internalPriority) {
          payload.internalPriority = formData.internalPriority;
        }
        const res = await updateTicket(editingTicket._id, payload);
        setSuccessMsg(res.message || 'Ticket updated successfully');
      } else {
        const payload = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
        };
        if (user?.role === 'admin' && formData.internalPriority) {
          payload.internalPriority = formData.internalPriority;
        }
        const res = await createTicket(payload);
        setSuccessMsg(res.message || 'Ticket created successfully');
      }
      handleCloseModal();
      loadTickets();
    } catch (err) {
      setError(err.message || 'Failed to save ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Delete this ticket?')) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await deleteTicket(ticketId);
      setSuccessMsg(res.message || 'Ticket deleted successfully');
      loadTickets();
    } catch (err) {
      setError(err.message || 'Failed to delete ticket');
    }
  };

  const isTicketOwner = (ticket) => {
    if (!user || !ticket.owner) return false;
    const currentUserId = user.id || user._id;
    const ticketOwnerId = typeof ticket.owner === 'object' ? ticket.owner._id : ticket.owner;
    return String(ticketOwnerId) === String(currentUserId);
  };

  const canCreate = user?.role === 'admin' || user?.role === 'manager';
  const canEditTicket = (t) => user?.role === 'admin' || (user?.role === 'manager' && isTicketOwner(t));
  const canDeleteTicket = (t) => user?.role === 'admin' || (user?.role === 'manager' && isTicketOwner(t));

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.owner?.name && t.owner.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    if (status === 'open') return 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-red-100 text-red-800';
    if (status === 'in_progress') return 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-amber-100 text-amber-800';
    return 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-green-100 text-green-800';
  };

  return (
    <div className="bg-white rounded-xl p-6 text-slate-800 shadow-xl font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-slate-900">Tickets ({filteredTickets.length})</h2>
        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow cursor-pointer"
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Role Notice */}
      <div className="bg-slate-100 border-l-4 border-slate-500 p-3 text-xs text-slate-700 mb-4 rounded-r-md">
        Logged in as <strong>{user?.name}</strong> ({user?.role?.toUpperCase()}). 
        {user?.role === 'user' && ' You have view-only access.'}
        {user?.role === 'manager' && ' You can create tickets and edit/delete your own.'}
        {user?.role === 'admin' && ' You have full admin access to edit/delete any ticket.'}
      </div>

      {/* Error / Success messages */}
      {error && <div className="text-red-600 text-sm mb-3 font-medium">⚠️ {error}</div>}
      {successMsg && <div className="text-green-600 text-sm mb-3 font-medium">✅ {successMsg}</div>}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <p className="text-slate-500 py-6 text-center">Loading tickets...</p>
      ) : filteredTickets.length === 0 ? (
        <p className="text-slate-500 py-10 text-center">No tickets found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm mt-2">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-left border-b-2 border-slate-200">
                <th className="p-3 font-semibold">Title</th>
                <th className="p-3 font-semibold">Description</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Owner</th>
                {user?.role === 'admin' && <th className="p-3 font-semibold">Internal Priority</th>}
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTickets.map((t) => {
                const ownerName = t.owner?.name || t.owner?.username || 'Unknown';
                return (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{t.title}</td>
                    <td className="p-3 text-slate-600 max-w-[280px] truncate">{t.description}</td>
                    <td className="p-3">
                      <span className={getStatusBadge(t.status)}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{ownerName}</td>
                    {user?.role === 'admin' && (
                      <td className="p-3">
                        {t.internalPriority ? (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                            {t.internalPriority}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          className="bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                          disabled={!canEditTicket(t)}
                          onClick={() => handleOpenEditModal(t)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                          disabled={!canDeleteTicket(t)}
                          onClick={() => handleDelete(t._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={handleCloseModal}>
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingTicket ? 'Edit Ticket' : 'Create Ticket'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  rows="3"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {user?.role === 'admin' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Internal Priority (Admin Only)</label>
                  <select
                    value={formData.internalPriority}
                    onChange={(e) => setFormData({ ...formData, internalPriority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="P1-Urgent">P1 - Urgent</option>
                    <option value="P2-High">P2 - High</option>
                    <option value="P3-Medium">P3 - Medium</option>
                    <option value="P4-Low">P4 - Low</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
