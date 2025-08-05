import { getAuthHeaders } from './auth';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  includeAuth = true
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    Object.assign(headers, getAuthHeaders());
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.message || 'Request failed');
  }

  return response;
}

export async function uploadFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('pdf', file);

  const headers = getAuthHeaders();

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.message || 'Upload failed');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest('POST', '/api/auth/login', { email, password }, false),
  
  register: (email: string, password: string) =>
    apiRequest('POST', '/api/auth/register', { email, password }, false),
  
  me: () => apiRequest('GET', '/api/auth/me'),

  // Documents
  getDocuments: () => apiRequest('GET', '/api/documents'),
  
  getDocument: (id: string) => apiRequest('GET', `/api/documents/${id}`),
  
  analyzeDocument: (id: string) => apiRequest('POST', `/api/documents/${id}/analyze`),
  
  downloadDocument: (id: string) => {
    const { token } = require('./auth').getStoredAuth();
    const url = `/api/documents/${id}/download`;
    if (token) {
      window.open(`${url}?token=${encodeURIComponent(token)}`);
    }
  },

  uploadFile,
};
