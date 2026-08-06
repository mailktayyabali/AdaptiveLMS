import { useState, useEffect, useContext } from 'react';
import { ProfileContext } from '../context/ProfileContext.jsx';
import {
  fetchAllTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  uploadTicketAttachment,
  deleteTicketAttachment,
} from '../services/ticketServices.js';
import { fetchMyPermissions } from '../services/authServices.js';
import { toast } from 'react-toastify';

export default function TicketManagement() {
  const { user } = useContext(ProfileContext);
  const [tickets, setTickets] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Attachment upload loading state
  const [uploadingTicketId, setUploadingTicketId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    internalPriority: 'Low',
  });
  const [modalFile, setModalFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const res = await fetchMyPermissions();
      if (res.success) {
        setPermissions(res.permission);
      }
    } catch (err) {
      console.error('Failed to load user permissions', err);
    }
  };

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
      internalPriority: 'Low',
    });
    setModalFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      status: ticket.status || 'open',
      internalPriority: ticket.internalPriority || 'Low',
    });
    setModalFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTicket(null);
    setModalFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      let savedTicketId = editingTicket?._id;

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
        const msg = res.message || 'Ticket updated successfully';
        setSuccessMsg(msg);
        toast.success(msg, { theme: "dark", position: "top-center" });
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
        savedTicketId = res.ticket?._id || res.ticketId;
        const msg = res.message || 'Ticket created successfully';
        setSuccessMsg(msg);
        toast.success(msg, { theme: "dark", position: "top-center" });
      }

      // If a file was selected in the modal, upload it to the ticket
      if (modalFile && savedTicketId) {
        try {
          await uploadTicketAttachment(savedTicketId, modalFile);
        } catch (uploadErr) {
          setError(`Ticket saved, but attachment upload failed: ${uploadErr.message}`);
          toast.error(`Attachment upload failed: ${uploadErr.message}`, { theme: "dark", position: "top-center" });
        }
      }

      handleCloseModal();
      loadTickets();
    } catch (err) {
      const errMsg = err.message || 'Failed to save ticket';
      setError(errMsg);
      toast.error(errMsg, { theme: "dark", position: "top-center" });
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
      const msg = res.message || 'Ticket deleted successfully';
      setSuccessMsg(msg);
      toast.success(msg, { theme: "dark", position: "top-center" });
      loadTickets();
    } catch (err) {
      const errMsg = err.message || 'Failed to delete ticket';
      setError(errMsg);
      toast.error(errMsg, { theme: "dark", position: "top-center" });
    }
  };

  const handleFileUpload = async (ticketId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingTicketId(ticketId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await uploadTicketAttachment(ticketId, file);
      setSuccessMsg(res.message || 'Attachment uploaded successfully');
      await loadTickets();
    } catch (err) {
      setError(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingTicketId(null);
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (ticketId, attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await deleteTicketAttachment(ticketId, attachmentId);
      setSuccessMsg(res.message || 'Attachment deleted successfully');
      await loadTickets();
    } catch (err) {
      setError(err.message || 'Failed to delete attachment');
    }
  };

  const isTicketOwner = (ticket) => {
    if (!user || !ticket.owner) return false;
    const currentUserId = user.id || user._id;
    const ticketOwnerId = typeof ticket.owner === 'object' ? ticket.owner._id : ticket.owner;
    return String(ticketOwnerId) === String(currentUserId);
  };

  const hasCreatePerm = permissions ? permissions.canCreateTicket : (user?.role === 'manager');
  const hasUpdatePerm = permissions ? permissions.canUpdateTicket : (user?.role === 'manager');
  const hasDeletePerm = permissions ? permissions.canDeleteTicket : (user?.role === 'manager');

  const canCreate = user?.role === 'admin' || hasCreatePerm;
  const canEditTicket = (t) => user?.role === 'admin' || (hasUpdatePerm && isTicketOwner(t));
  const canDeleteTicket = (t) => user?.role === 'admin' || (hasDeletePerm && isTicketOwner(t));

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
    if (status === 'in_progress' || status === 'in-progress') return 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-amber-100 text-amber-800';
    return 'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-green-100 text-green-800';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      <div className="bg-slate-100 border-l-4 border-indigo-500 p-3 text-xs text-slate-700 mb-4 rounded-r-md flex flex-wrap justify-between items-center gap-2">
        <div>
          Logged in as <strong>{user?.name}</strong> ({user?.role?.toUpperCase()}). 
          {user?.role === 'admin' ? ' You have full admin permissions.' : ' Your active permissions are configured below.'}
        </div>
        {user?.role !== 'admin' && (
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className={canCreate ? 'text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-200 px-2 py-0.5 rounded line-through'}>Create</span>
            <span className={canEditTicket ? 'text-amber-700 bg-amber-100 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-200 px-2 py-0.5 rounded line-through'}>Update</span>
            <span className={canDeleteTicket ? 'text-rose-700 bg-rose-100 px-2 py-0.5 rounded' : 'text-slate-400 bg-slate-200 px-2 py-0.5 rounded line-through'}>Delete</span>
          </div>
        )}
      </div>

      {/* Error / Success messages */}
      {error && <div className="text-red-600 text-sm mb-3 font-medium bg-red-50 p-2.5 rounded-md border border-red-200">⚠️ {error}</div>}
      {successMsg && <div className="text-green-600 text-sm mb-3 font-medium bg-green-50 p-2.5 rounded-md border border-green-200">✅ {successMsg}</div>}

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

      {/* Tickets Card Grid */}
      {loading ? (
        <p className="text-slate-500 py-6 text-center">Loading tickets...</p>
      ) : filteredTickets.length === 0 ? (
        <p className="text-slate-500 py-10 text-center">No tickets found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {filteredTickets.map((t) => {
            const ownerName = t.owner?.name || t.owner?.username || 'Unknown';
            const canEdit = canEditTicket(t);
            const isUploadingThis = uploadingTicketId === t._id;

            return (
              <div
                key={t._id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-md flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div>
                  {/* Card Top: Title & Badges */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1" title={t.title}>
                      {t.title}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={getStatusBadge(t.status)}>{t.status.replace('_', ' ')}</span>
                      {user?.role === 'admin' && t.internalPriority && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold">
                          {t.internalPriority}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 text-xs mb-3 leading-relaxed line-clamp-3">
                    {t.description}
                  </p>

                  {/* Owner Info */}
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1">
                   <span>Owner: <strong>{ownerName}</strong></span>
                  </div>

                  {/* Attachments Section with Thumbnails */}
                  {t.attachments && t.attachments.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">Attachments:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {t.attachments.map((att) => {
                          const isImage = att.mimeType?.startsWith('image/');
                          const imgUrl = att.thumbnailPath || att.path;
                          return (
                            <div
                              key={att._id}
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white p-1 shadow-sm"
                            >
                              {isImage ? (
                                <div className="w-full h-24 overflow-hidden rounded bg-slate-100 flex items-center justify-center">
                                  <img
                                    src={imgUrl}
                                    alt={att.originalName || att.filename}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-24 rounded bg-slate-100 flex flex-col items-center justify-center p-2 text-center">
                                  <span className="text-2xl mb-1">📄</span>
                                  <span className="text-[10px] font-medium text-slate-700 truncate w-full" title={att.originalName}>
                                    {att.originalName || att.filename}
                                  </span>
                                  <span className="text-[9px] text-slate-400">{formatFileSize(att.size)}</span>
                                </div>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(t._id, att._id)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                                  title="Delete attachment"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Attach & Action Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 mt-2">
                  {canEdit ? (
                    <label className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                      {isUploadingThis ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <span>📎 Attach File</span>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        disabled={isUploadingThis}
                        onChange={(e) => handleFileUpload(t._id, e)}
                      />
                    </label>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      disabled={!canEdit}
                      onClick={() => handleOpenEditModal(t)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      disabled={!canDeleteTicket(t)}
                      onClick={() => handleDelete(t._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              )}

              {/* Attach File Field in Modal */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Attach File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setModalFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-600 border border-slate-300 rounded-lg p-1.5 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Show existing attachments if editing */}
              {editingTicket && editingTicket.attachments && editingTicket.attachments.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Current Attachments</label>
                  <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {editingTicket.attachments.map((att) => (
                      <div
                        key={att._id}
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 shadow-sm"
                      >
                        <span>{att.mimeType?.startsWith('image/') ? '🖼️' : '📄'}</span>
                        <span className="font-medium max-w-[120px] truncate">{att.originalName || att.filename}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(editingTicket._id, att._id)}
                          className="ml-1 text-red-500 hover:text-red-700 font-bold hover:bg-red-50 rounded px-1 transition-colors"
                          title="Delete attachment"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
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
