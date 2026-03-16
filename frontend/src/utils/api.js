import axios from 'axios';

// Dev: React proxy (package.json "proxy": "http://localhost:5000") handles /api → localhost:5000
// Prod: set REACT_APP_API_URL in your deployment environment
const BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

const API = axios.create({ baseURL: BASE });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const token = localStorage.getItem('token');
      const url   = err.config?.url || '';
      // ONLY logout if the token-verification call itself fails (/auth/me)
      // ALL other 401s (claims, policies, docs) just reject — never auto-logout
      const isTokenVerify = url.includes('/auth/me');
      if (token && isTokenVerify) {
        localStorage.removeItem('token');
        localStorage.removeItem('piki_boot_time');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:            (data) => API.post('/auth/login', data),
  register:         (data) => API.post('/auth/register', data),
  registerNok:      (data) => API.post('/auth/register-nok', data),
  registerMember:   (data) => API.post('/auth/register-member', data),
  me:               ()     => API.get('/auth/me'),
  forgotPassword:   (phone)=> API.post('/auth/forgot-password', { phone }),
  verifyOtp:        (data) => API.post('/auth/verify-otp', data),
  resetPassword:    (data) => API.post('/auth/reset-password', data),
  changePassword:   (currentPassword, newPassword) => API.post('/auth/change-password', { currentPassword, newPassword }),
  getNotifications: () => API.get('/auth/notifications'),
  markRead:         (id) => API.patch(`/auth/notifications/${id}/read`),
  markAllRead:      ()   => API.patch('/auth/notifications/read-all'),
  checkSetupStatus: ()   => API.get('/auth/setup-status'),
  setupAdmin:       (data) => API.post('/auth/setup-admin', data),
};

export const policiesAPI = {
  getPackages:   () => API.get('/policies/packages'),
  getMyPolicies: () => API.get('/policies'),
  subscribe:     (data) => API.post('/policies/subscribe', data),
  cancel:        (id)   => API.delete(`/policies/${id}`),
};

export const claimsAPI = {
  getMyClaims:  () => API.get('/claims'),
  getAll:       () => API.get('/claims?all=1'),
  getById:      (id) => API.get(`/claims/${id}`),
  submit:       (data) => API.post('/claims', data),
  updateStatus: (id, data) => API.patch(`/claims/${id}/status`, data),
};

export const usersAPI = {
  getDashboard:       () => API.get('/users/dashboard'),
  getAdminDashboard:  () => API.get('/users/admin/dashboard'),
  createAgent:        (data) => API.post('/users/admin/create-agent', data),
  createAdmin:        (data) => API.post('/users/admin/create-admin', data),
  getAgentDashboard:  () => API.get('/users/agent/dashboard'),
  getAgentReport:     () => API.get('/users/admin/agents'),
  getPendingOnboards: () => API.get('/users/admin/pending-onboards'),
  getTransactions:    () => API.get('/users/transactions'),
  earnTokens:    (action) => API.post('/users/tokens/earn', { action }),
  redeemTokens:  (data)   => API.post('/users/tokens/redeem', data),
  updateProfile: (data)   => API.patch('/users/profile', data),
  approveKyc:    (id)     => API.patch(`/users/${id}/approve-kyc`),
  rejectKyc:     (id, reason) => API.patch(`/users/${id}/reject-kyc`, { reason }),
  suspendUser:   (id, reason) => API.patch(`/users/${id}/suspend`, { reason }),
  unsuspendUser: (id)     => API.patch(`/users/${id}/unsuspend`),
};

export const documentsAPI = {
  getTypes:    (claimType) => API.get(`/documents/types${claimType ? `?claimType=${claimType}` : ''}`),
  getForClaim: (claimId)   => API.get(`/documents/claim/${claimId}`),
  getForUser:  (userId)    => API.get(`/documents/user/${userId}`),
  uploadKyc:   (formData)  => API.post('/documents/upload-kyc', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  attachKyc:   (tempUploadId) => API.post('/documents/attach-kyc', { tempUploadId }),
  upload:      (formData)  => API.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  attach:      (claimId, tempUploadId) => API.post('/documents/attach', { claimId, tempUploadId }),
  previewUrl:  (docId) => { const t = localStorage.getItem('token'); return `${BASE}/documents/${docId}/preview${t ? `?token=${t}` : ''}`; },
  downloadUrl: (docId) => { const t = localStorage.getItem('token'); return `${BASE}/documents/${docId}/download${t ? `?token=${t}` : ''}`; },
  delete:      (docId) => API.delete(`/documents/${docId}`),
  verify:      (docId) => API.patch(`/documents/${docId}/verify`),
};

export const paymentsAPI = {
  initiateMpesa: (data) => API.post('/payments/mpesa/initiate', data),
  checkStatus:   (id)   => API.get(`/payments/mpesa/status/${id}`),
  manualPayment: (data) => API.post('/payments/manual', data),
  getHistory:    ()     => API.get('/payments/history'),
};

export default API;
