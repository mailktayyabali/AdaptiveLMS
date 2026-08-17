import { authenticatedFetch } from './authServices.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

const DocumentService = {
  async getDocuments() {
    const response = await authenticatedFetch(`${API_URL}/documents`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  async getDocumentById(id) {
    const response = await authenticatedFetch(`${API_URL}/documents/${id}`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  async createDocument(title = 'Untitled Document', content = '') {
    const response = await authenticatedFetch(`${API_URL}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    return handleResponse(response);
  },

  async updateDocument(id, { title, content }) {
    const response = await authenticatedFetch(`${API_URL}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content })
    });
    return handleResponse(response);
  },

  async deleteDocument(id) {
    const response = await authenticatedFetch(`${API_URL}/documents/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  },

  async shareDocument(id, { email, role, publicAccess }) {
    const response = await authenticatedFetch(`${API_URL}/documents/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, role, publicAccess })
    });
    return handleResponse(response);
  },

  async getDocumentVersions(id) {
    const response = await authenticatedFetch(`${API_URL}/documents/${id}/versions`, {
      method: 'GET'
    });
    return handleResponse(response);
  },

  async restoreDocumentVersion(id, versionId) {
    const response = await authenticatedFetch(`${API_URL}/documents/${id}/versions/${versionId}/restore`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    return handleResponse(response);
  }
};

export default DocumentService;
