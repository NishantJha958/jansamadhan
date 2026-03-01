import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE, withCredentials: false });

// ─── CITIZEN AUTH ────────────────────────────────────────────────────────────
export const checkCitizenExists = (phone) => api.post('/citizen/check-exists', { phone });
export const sendOTP = (phone, email, purpose = 'signin') => api.post('/citizen/send-otp', { phone, email, purpose });
export const verifyOTP = (phone, otp) => api.post('/citizen/verify-otp', { phone, otp });
export const citizenSignup = (data) => api.post('/citizen/signup', data);
export const verifyGovtId = (phone, id_type, id_number) =>
    api.post('/citizen/verify-govt-id', { phone, id_type, id_number });
export const getVerificationStatus = (phone) =>
    api.get(`/citizen/verification-status?phone=${phone}`);
export const getCitizenComplaints = (phone) => api.get(`/citizen/complaints?phone=${phone}`);

// ─── OFFICIAL AUTH ────────────────────────────────────────────────────────────
export const officialLogin = (username, password, govt_id) =>
    api.post('/official/login', { username, password, govt_id });

// ─── COMPLAINTS ──────────────────────────────────────────────────────────────
export const getComplaints = (department) =>
    api.get(`/complaints${department ? `?department=${department}` : ''}`);
export const getComplaint = (id) => api.get(`/complaint/${id}`);
export const submitComplaint = (formData) =>
    api.post('/submit_complaint', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateComplaint = (id, formData) =>
    api.post(`/complaint/${id}/update`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const giveFeedback = (id, rating, comment) =>
    api.post(`/complaint/${id}/feedback`, { rating, comment });
export const getTransferHistory = (id) => api.get(`/complaint/${id}/transfers`);
export const checkDuplicates = (latitude, longitude, category) =>
    api.post('/check_duplicates', { latitude, longitude, category });

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export const getAnalytics = (department) =>
    api.get(`/analytics/dashboard${department ? `?department=${department}` : ''}`);

// ─── TRANSLATE ────────────────────────────────────────────────────────────────
export const translateText = (text, from = 'auto', to = 'en') =>
    api.post('/translate', { text, from, to });
export const getLanguages = () => api.get('/languages');

export default api;
