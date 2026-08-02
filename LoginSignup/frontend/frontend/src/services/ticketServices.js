import { authenticatedFetch } from './authServices.js';

export async function fetchAllTickets() {
  const res = await authenticatedFetch('/api/tickets');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch tickets');
  }
  return res.json();
}

export async function fetchTicketById(id) {
  const res = await authenticatedFetch(`/api/tickets/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch ticket');
  }
  return res.json();
}

export async function createTicket(ticketData) {
  const res = await authenticatedFetch('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(ticketData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create ticket');
  }
  return res.json();
}

export async function updateTicket(id, ticketData) {
  const res = await authenticatedFetch(`/api/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ticketData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update ticket');
  }
  return res.json();
}

export async function deleteTicket(id) {
  const res = await authenticatedFetch(`/api/tickets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete ticket');
  }
  return res.json();
}

export async function uploadTicketAttachment(ticketId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/tickets/${ticketId}/upload`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to upload attachment');
  }
  return res.json();
}

export async function deleteTicketAttachment(ticketId, attachmentId) {
  const res = await authenticatedFetch(`/api/tickets/${ticketId}/upload/${attachmentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete attachment');
  }
  return res.json();
}
