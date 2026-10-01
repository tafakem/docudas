import {
  User,
  Recipient,
  DocumentItem,
  NumberingOverviewItem,
  NumberReservation,
  AuthorizationItem,
  BulkLot,
  AuditLog,
  DashboardStats
} from '../types';

let authToken: string | null = localStorage.getItem('token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getToken(): string | null {
  return authToken || localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Session expired
    setToken(null);
    if (!window.location.pathname.includes('/login')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error en la solicitud: ${response.statusText}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getMe: () => request<{ user: User }>('/api/auth/me'),
  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST'
    }),
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Users (Admin)
  getUsers: () => request<{ users: User[] }>('/api/users'),
  createUser: (data: any) =>
    request<{ success: boolean; id: number }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateUser: (id: number, data: any) =>
    request<{ success: boolean }>('/api/users/' + id, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Recipients
  getRecipients: (includeInactive = false) =>
    request<{ recipients: Recipient[] }>(`/api/recipients?includeInactive=${includeInactive}`),
  createRecipient: (data: { name: string; acronym: string; bossName: string; bossPosition: string }) =>
    request<{ success: boolean; id: number }>('/api/recipients', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateRecipient: (id: number, data: any) =>
    request<{ success: boolean }>('/api/recipients/' + id, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  toggleRecipient: (id: number) =>
    request<{ success: boolean; status: string }>(`/api/recipients/${id}/toggle`, {
      method: 'PATCH'
    }),

  // Numbering
  getNumberingOverview: () =>
    request<{ currentYear: number; overview: NumberingOverviewItem[] }>('/api/numbering/overview'),
  getReservations: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: NumberReservation[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/numbering/reservations?${qs}`
    );
  },
  reserveNumber: (docType: string, year?: number) =>
    request<{
      success: boolean;
      reservation: {
        reservationId: number;
        docType: string;
        year: number;
        number: number;
        formattedNumber: string;
        expiresAt: string;
        isReusedActive: boolean;
      };
    }>('/api/numbering/reserve', {
      method: 'POST',
      body: JSON.stringify({ docType, year })
    }),
  releaseNumber: (reservationId: number, reason: string) =>
    request<{ success: boolean; formattedNumber: string; message: string }>('/api/numbering/release', {
      method: 'POST',
      body: JSON.stringify({ reservationId, reason })
    }),

  // Documents
  getDocuments: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: DocumentItem[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/documents?${qs}`
    );
  },
  getDocumentDetail: (id: number) =>
    request<{
      document: DocumentItem;
      recipients: any[];
      auditLogs: AuditLog[];
      lot: BulkLot | null;
      authorization: AuthorizationItem | null;
    }>(`/api/documents/${id}`),
  createDocument: (data: {
    reservationId?: number;
    docType: string;
    year?: number;
    date: string;
    subject: string;
    description: string;
    observations?: string;
    recipientIds: number[];
    status?: string;
  }) =>
    request<{ success: boolean; documentId: number; formattedNumber: string; message: string }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateDocument: (
    id: number,
    data: { subject?: string; description?: string; observations?: string; recipientIds?: number[]; date?: string }
  ) =>
    request<{ success: boolean; message: string }>(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  changeDocumentStatus: (id: number, status: string, reason: string) =>
    request<{ success: boolean; message: string }>(`/api/documents/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason })
    }),

  // Authorizations
  getAuthorizations: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ authorizations: AuthorizationItem[] }>(`/api/authorizations${qs}`);
  },
  getPendingAuthorizationsCount: () =>
    request<{ pendingCount: number; pendingList: AuthorizationItem[] }>('/api/authorizations/pending-count'),
  requestAuthorization: (data: any) =>
    request<{ success: boolean; code: string; message: string }>('/api/authorizations/request', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  approveAuthorization: (id: number, approvedQty?: number) =>
    request<{ success: boolean; message: string }>(`/api/authorizations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedQty })
    }),
  rejectAuthorization: (id: number, reason?: string) =>
    request<{ success: boolean; message: string }>(`/api/authorizations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
  createAuthorization: (data: any) =>
    request<{ success: boolean; id: number }>('/api/authorizations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  cancelAuthorization: (id: number, reason: string) =>
    request<{ success: boolean; message: string }>(`/api/authorizations/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    }),

  // Bulk lots
  previewBulk: (data: any) =>
    request<{
      valid: boolean;
      authorization: AuthorizationItem;
      grandTotal: number;
      startNumber: string;
      endNumber: string;
      previewItems: Array<{
        plannedNumber: string;
        recipientId: number;
        recipientName: string;
        bossName: string;
        bossPosition: string;
      }>;
    }>('/api/bulk/preview', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  generateBulk: (data: any) =>
    request<{
      success: boolean;
      lotId: number;
      lotCode: string;
      quantity: number;
      startNumber: string;
      endNumber: string;
      message: string;
    }>('/api/bulk/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getBulkLots: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: BulkLot[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/bulk/lots?${qs}`
    );
  },
  getBulkLotDetail: (id: number) =>
    request<{ lot: BulkLot; documents: DocumentItem[] }>(`/api/bulk/lots/${id}`),

  // Dashboard Stats
  getDashboardStats: () => request<DashboardStats>('/api/dashboard/stats'),

  // Audit Logs
  getAuditLogs: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: AuditLog[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/audit?${qs}`
    );
  },

  // Export CSV url generator
  getExportUrl: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `/api/export/documents?${qs}`;
  },

  // Backup & Restore
  getBackupExportUrl: () => '/api/backup/export',
  exportBackupJson: () => request<any>('/api/backup/export'),
  importBackupJson: (backupObject: any) =>
    request<{ success: boolean; message: string }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify({ data: backupObject })
    })
};
