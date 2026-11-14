/**
 * Centralized REST API Service Layer (UniStay Hostel Management System)
 * ---------------------------------------------------------------------------
 * Connects all frontend pages to the Express.js + MongoDB Atlas backend
 * using Fetch API with JWT Bearer authentication.
 */

export const API_CONFIG = Object.freeze({
  BASE_URL: (typeof window !== 'undefined' && window.__UNISTAY_API_BASE__) || '/api',
  ENDPOINTS: {
    HEALTH: '/health',
    AUTH_REGISTER: '/auth/register',
    AUTH_LOGIN: '/auth/login',
    AUTH_ME: '/auth/me',
    HOSTELS: '/hostels',
    HOSTEL_BY_ID: (id) => `/hostels/${encodeURIComponent(id)}`,
    ROOMS: '/rooms',
    AVAILABLE_ROOMS: '/rooms/available',
    ROOM_BY_ID: (id) => `/rooms/${encodeURIComponent(id)}`,
    REQUESTS: '/requests',
    MY_REQUESTS: '/requests/my',
    APPROVE_REQUEST: (id) => `/requests/${encodeURIComponent(id)}/approve`,
    REJECT_REQUEST: (id) => `/requests/${encodeURIComponent(id)}/reject`,
    COMPLAINTS: '/complaints',
    MY_COMPLAINTS: '/complaints/my',
    UPDATE_COMPLAINT: (id) => `/complaints/${encodeURIComponent(id)}`,
    DASHBOARD_SUMMARY: '/dashboard/summary',
    DASHBOARD_OCCUPANCY: '/dashboard/occupancy',
    DASHBOARD_RECENT_ACTIVITY: '/dashboard/recent-activity',
    DASHBOARD_STUDENT: '/dashboard/student',
    DASHBOARD_STUDENTS: '/dashboard/students',
    DASHBOARD_SEED_SAMPLE: '/dashboard/seed-sample',
  },
});

const TOKEN_STORAGE_KEY = 'unistay_jwt_token';
const USER_STORAGE_KEY = 'unistay_auth_user';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function getCurrentSession() {
  try {
    const token = getAuthToken();
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!token || !rawUser) return null;
    const user = JSON.parse(rawUser);
    if (!user || !user.role) return null;
    return { ...user, token };
  } catch {
    return null;
  }
}

function setAuthSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function logoutUser() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function mapValidationErrors(errors) {
  if (!errors || typeof errors !== 'object') return undefined;
  const mapped = { ...errors };
  if (errors.name && !mapped.fullName) mapped.fullName = errors.name;
  if (errors.contact && !mapped.contactNumber) mapped.contactNumber = errors.contact;
  if (errors.type && !mapped.roomType) mapped.roomType = errors.type;
  return mapped;
}

function normalizeUser(u) {
  if (!u) return null;
  const hostelObj = u.allocatedHostelId && typeof u.allocatedHostelId === 'object' ? u.allocatedHostelId : null;
  const roomObj = u.allocatedRoomId && typeof u.allocatedRoomId === 'object' ? u.allocatedRoomId : null;
  const allocatedHostelId = hostelObj ? String(hostelObj._id || hostelObj.id || '') : String(u.allocatedHostelId || '');
  const allocatedRoomId = roomObj ? String(roomObj._id || roomObj.id || '') : String(u.allocatedRoomId || '');

  return {
    id: String(u._id || u.id || ''),
    fullName: u.name || u.fullName || '',
    email: u.email || '',
    role: u.role || 'student',
    studentId: u.studentId || '',
    contactNumber: u.contact || u.contactNumber || '',
    gender: u.gender || '',
    department: u.department || 'Undergraduate Studies',
    year: u.year || '1st Year',
    allocationStatus: allocatedRoomId ? 'Allocated' : 'Unallocated',
    allocatedHostelId,
    allocatedHostelName: hostelObj?.name || u.allocatedHostelName || '',
    allocatedRoomId,
    allocatedRoomNumber: roomObj?.roomNumber || u.allocatedRoomNumber || '',
    allocatedRoomType: roomObj?.type || u.allocatedRoomType || '',
    designation: u.role === 'admin' ? 'Chief Warden / Administration' : '',
  };
}

function normalizeHostel(h) {
  if (!h) return null;
  return {
    id: String(h._id || h.id || ''),
    name: h.name || '',
    type: h.type || 'Boys',
    address: h.address || '',
    totalRooms: Number(h.totalRooms ?? 0),
    warden: h.warden || 'Assigned Hostel Warden',
    configuredRoomsCount: Number(h.configuredRoomsCount ?? (Array.isArray(h.rooms) ? h.rooms.length : 0)),
    availableRoomsCount: Number(h.availableRoomsCount ?? 0),
    totalCapacity: Number(h.totalCapacity ?? 0),
    occupiedBeds: Number(h.occupiedBeds ?? 0),
    rooms: Array.isArray(h.rooms) ? h.rooms.map(normalizeRoom) : undefined,
  };
}

function normalizeRoom(r) {
  if (!r) return null;
  const hostelObj = r.hostelId && typeof r.hostelId === 'object' ? r.hostelId : null;
  const capacity = Number(r.capacity ?? 0);
  const occupiedCount = Number(r.occupiedCount ?? 0);
  return {
    id: String(r._id || r.id || ''),
    hostelId: hostelObj ? String(hostelObj._id || hostelObj.id || '') : String(r.hostelId || ''),
    hostelName: hostelObj?.name || r.hostelName || 'Campus Hostel',
    hostelType: hostelObj?.type || r.hostelType || '',
    roomNumber: r.roomNumber || '',
    roomType: r.type || r.roomType || 'Double',
    capacity,
    occupiedCount,
    availableSeats: r.availableSeats !== undefined ? Number(r.availableSeats) : Math.max(0, capacity - occupiedCount),
    status: r.status || (occupiedCount >= capacity ? 'Full' : 'Available'),
    floor: r.floor || '1st Floor',
  };
}

function normalizeRequest(req) {
  if (!req) return null;
  const studentObj = req.studentId && typeof req.studentId === 'object' ? req.studentId : null;
  const hostelObj = req.hostelId && typeof req.hostelId === 'object' ? req.hostelId : null;
  const roomObj = req.roomId && typeof req.roomId === 'object' ? req.roomId : null;
  const currentUser = getCurrentSession();

  return {
    id: String(req._id || req.id || ''),
    studentId: studentObj?.studentId || (currentUser?.role === 'student' ? currentUser.studentId : String(req.studentId || '')),
    studentName: studentObj?.name || req.studentName || (currentUser?.role === 'student' ? currentUser.fullName : 'Student'),
    hostelId: hostelObj ? String(hostelObj._id || hostelObj.id || '') : String(req.hostelId || ''),
    hostelName: hostelObj?.name || req.hostelName || 'Campus Hostel',
    roomId: roomObj ? String(roomObj._id || roomObj.id || '') : String(req.roomId || ''),
    roomNumber: roomObj?.roomNumber || req.roomNumber || '—',
    roomType: roomObj?.type || req.roomType || '',
    requestDate: String(req.requestedDate || req.createdAt || '').slice(0, 10),
    status: req.status || 'Pending',
    notes: req.notes || '',
    adminNote: req.adminNote || '',
  };
}

function normalizeComplaint(c) {
  if (!c) return null;
  const studentObj = c.studentId && typeof c.studentId === 'object' ? c.studentId : null;
  const roomObj = c.roomId && typeof c.roomId === 'object' ? c.roomId : null;
  const hostelObj = roomObj?.hostelId && typeof roomObj.hostelId === 'object' ? roomObj.hostelId : null;
  const currentUser = getCurrentSession();

  return {
    id: String(c._id || c.id || ''),
    studentId: studentObj?.studentId || (currentUser?.role === 'student' ? currentUser.studentId : String(c.studentId || '')),
    studentName: studentObj?.name || c.studentName || (currentUser?.role === 'student' ? currentUser.fullName : 'Student'),
    hostelId: hostelObj ? String(hostelObj._id || hostelObj.id || '') : String(roomObj?.hostelId || ''),
    hostelName: hostelObj?.name || c.hostelName || 'Campus Hostel',
    roomId: roomObj ? String(roomObj._id || roomObj.id || '') : String(c.roomId || ''),
    roomNumber: roomObj?.roomNumber || c.roomNumber || '—',
    category: c.category || 'Other',
    description: c.description || '',
    submittedDate: String(c.createdAt || c.submittedDate || '').slice(0, 10),
    status: c.status || 'Pending',
    resolutionNote: c.resolutionNote || '',
  };
}

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '' && val !== 'All') {
      sp.set(key, String(val).trim());
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

async function apiFetch(endpoint, options = {}) {
  const { method = 'GET', body, auth = true } = options;
  const headers = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  };

  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && auth) {
        const currentRole = getCurrentSession()?.role;
        logoutUser();
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.endsWith('login.html') &&
          !window.location.pathname.endsWith('admin-login.html') &&
          !window.location.pathname.endsWith('register.html')
        ) {
          window.location.replace(currentRole === 'admin' ? 'admin-login.html' : 'login.html');
        }
      }
      return {
        ok: false,
        status: response.status,
        errors: mapValidationErrors(payload.errors),
        message: payload.message || `Request failed with status ${response.status}.`,
      };
    }

    return {
      ok: true,
      status: response.status,
      ...payload,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: 'Network error: unable to reach the UniStay backend API.',
    };
  }
}

export async function getHealthStatus() {
  return apiFetch(API_CONFIG.ENDPOINTS.HEALTH, { auth: false });
}

export async function syncCurrentUser() {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.AUTH_ME);
  if (!res.ok) return res;
  const normalized = normalizeUser(res.user);
  setAuthSession(null, normalized);
  return { ok: true, status: res.status, data: normalized };
}

export async function registerUser(payload, { autoLogin = false } = {}) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.AUTH_REGISTER, {
    method: 'POST',
    auth: false,
    body: {
      name: String(payload.fullName || payload.name || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      studentId: String(payload.studentId || '').trim().toUpperCase(),
      ...(payload.password ? { password: payload.password } : {}),
      contact: String(payload.contactNumber || payload.contact || '').trim(),
      gender: String(payload.gender || '').trim(),
    },
  });

  if (!res.ok) return res;

  const user = {
    ...normalizeUser(res.user),
    ...(res.directEntry || res.user?.directEntry ? { directEntry: true } : {}),
  };
  if (autoLogin) {
    setAuthSession(res.token, user);
  } else {
    logoutUser();
  }
  return { ok: true, status: res.status, data: user };
}

export async function loginUser({ email, name, password, expectedRole = 'student' }) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.AUTH_LOGIN, {
    method: 'POST',
    auth: false,
    body: {
      email,
      ...(name ? { name } : {}),
      ...(password ? { password } : {}),
      expectedRole,
    },
  });

  if (!res.ok) return res;

  const user = {
    ...normalizeUser(res.user),
    ...(res.directEntry || res.user?.directEntry ? { directEntry: true } : {}),
  };
  setAuthSession(res.token, user);
  return { ok: true, status: res.status, data: user };
}

export async function requestPasswordReset(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) {
    return { ok: false, status: 400, message: 'Enter a valid university email address.' };
  }
  return {
    ok: false,
    status: 501,
    message:
      'Self-service password reset emails are not enabled on this server. Please contact the Hostel Warden Office or University IT Helpdesk.',
  };
}

export async function getHostels() {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.HOSTELS);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeHostel) : [],
  };
}

export async function getHostelById(hostelId) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.HOSTEL_BY_ID(hostelId));
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeHostel(res.data) };
}

export async function createHostel(payload) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.HOSTELS, {
    method: 'POST',
    body: {
      name: payload.name,
      type: payload.type,
      address: payload.address,
      totalRooms: Number(payload.totalRooms),
      warden: payload.warden,
    },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeHostel(res.data) };
}

export async function updateHostel(hostelId, payload) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.HOSTEL_BY_ID(hostelId), {
    method: 'PUT',
    body: {
      name: payload.name,
      type: payload.type,
      address: payload.address,
      totalRooms: Number(payload.totalRooms),
      warden: payload.warden,
    },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeHostel(res.data) };
}

export async function getAvailableRooms(filters = {}) {
  const basePath =
    filters.status === 'Available'
      ? API_CONFIG.ENDPOINTS.AVAILABLE_ROOMS
      : API_CONFIG.ENDPOINTS.ROOMS;

  const qs = buildQuery({
    hostelId: filters.hostelId,
    hostelType: filters.hostelType,
    type: filters.roomType || filters.type,
    status: filters.status === 'Available' ? undefined : filters.status,
    search: filters.search,
  });

  const res = await apiFetch(`${basePath}${qs}`);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeRoom) : [],
  };
}

export async function getRoomById(roomId) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.ROOM_BY_ID(roomId));
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeRoom(res.data) };
}

export async function createRoom(payload) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.ROOMS, {
    method: 'POST',
    body: {
      hostelId: payload.hostelId,
      roomNumber: payload.roomNumber,
      type: payload.roomType || payload.type,
      capacity: Number(payload.capacity),
      occupiedCount: Number(payload.occupiedCount ?? 0),
      floor: payload.floor,
    },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeRoom(res.data) };
}

export async function updateRoom(roomId, payload) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.ROOM_BY_ID(roomId), {
    method: 'PUT',
    body: {
      hostelId: payload.hostelId,
      roomNumber: payload.roomNumber,
      type: payload.roomType || payload.type,
      capacity: Number(payload.capacity),
      occupiedCount: Number(payload.occupiedCount ?? 0),
      floor: payload.floor,
    },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeRoom(res.data) };
}

export async function createRoomRequest({ hostelId, roomId, notes = '' }) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.REQUESTS, {
    method: 'POST',
    body: {
      ...(hostelId ? { hostelId } : {}),
      roomId,
      notes,
    },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeRequest(res.data) };
}

export async function getMyRequests() {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.MY_REQUESTS);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeRequest) : [],
  };
}

export async function getAllRequests(filters = {}) {
  const qs = buildQuery({
    status: filters.status,
    search: filters.search,
  });
  const res = await apiFetch(`${API_CONFIG.ENDPOINTS.REQUESTS}${qs}`);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeRequest) : [],
  };
}

export async function approveRequest(requestId, adminNote = '') {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.APPROVE_REQUEST(requestId), {
    method: 'PUT',
    body: { adminNote },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeRequest(res.data) };
}

export async function rejectRequest(requestId, reason = '') {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.REJECT_REQUEST(requestId), {
    method: 'PUT',
    body: { adminNote: reason, reason },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeRequest(res.data) };
}

export async function submitComplaint(payload) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.COMPLAINTS, {
    method: 'POST',
    body: {
      ...(payload.roomId ? { roomId: payload.roomId } : {}),
      ...(payload.hostelId ? { hostelId: payload.hostelId } : {}),
      ...(payload.roomNumber ? { roomNumber: payload.roomNumber } : {}),
      category: payload.category,
      description: payload.description,
    },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeComplaint(res.data) };
}

export async function getMyComplaints() {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.MY_COMPLAINTS);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeComplaint) : [],
  };
}

export async function getAllComplaints(filters = {}) {
  const qs = buildQuery({
    status: filters.status,
    category: filters.category,
    search: filters.search,
  });
  const res = await apiFetch(`${API_CONFIG.ENDPOINTS.COMPLAINTS}${qs}`);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeComplaint) : [],
  };
}

export async function resolveComplaint(complaintId, resolutionNote = '') {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.UPDATE_COMPLAINT(complaintId), {
    method: 'PUT',
    body: { status: 'Resolved', resolutionNote },
  });
  if (!res.ok) return res;
  return { ok: true, status: res.status, data: normalizeComplaint(res.data) };
}

export async function getDashboardSummary() {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.DASHBOARD_SUMMARY);
  if (!res.ok) return res;
  const d = res.data || {};
  return {
    ok: true,
    status: res.status,
    data: {
      summary: d.summary || {},
      hostelOccupancy: (d.hostelOccupancy || []).map((item) => ({
        ...item,
        hostelId: String(item.hostelId || ''),
      })),
      pendingQueue: (d.pendingQueue || []).map(normalizeRequest),
      recentRequests: (d.recentRequests || []).map(normalizeRequest),
      recentComplaints: (d.recentComplaints || []).map(normalizeComplaint),
    },
  };
}

export async function getDashboardOccupancy() {
  return apiFetch(API_CONFIG.ENDPOINTS.DASHBOARD_OCCUPANCY);
}

export async function getRecentActivity() {
  return apiFetch(API_CONFIG.ENDPOINTS.DASHBOARD_RECENT_ACTIVITY);
}

export async function seedSampleCampusData() {
  return apiFetch(API_CONFIG.ENDPOINTS.DASHBOARD_SEED_SAMPLE, { method: 'POST' });
}

export async function getStudentDashboardData() {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.DASHBOARD_STUDENT);
  if (!res.ok) return res;
  const d = res.data || {};
  const student = normalizeUser(d.student);
  if (student) {
    setAuthSession(null, student);
  }

  const rawHostel = d.student?.allocatedHostelId;
  const rawRoom = d.student?.allocatedRoomId;
  const hostel = rawHostel && typeof rawHostel === 'object' ? normalizeHostel(rawHostel) : null;
  const room =
    rawRoom && typeof rawRoom === 'object'
      ? normalizeRoom({
          ...rawRoom,
          hostelId: rawHostel || rawRoom.hostelId,
        })
      : null;

  const roommates = (d.roommates || []).map((rm) => ({
    id: String(rm._id || rm.id || ''),
    fullName: rm.name || rm.fullName || '',
    studentId: rm.studentId || '',
    department: rm.department || 'Undergraduate Studies',
    year: rm.year || '1st Year',
    contactNumber: rm.contact || rm.contactNumber || '',
  }));

  const myRequests = (d.myRequests || []).map(normalizeRequest);
  const myComplaints = (d.myComplaints || []).map(normalizeComplaint);
  const pendingRequest = d.pendingRequest ? normalizeRequest(d.pendingRequest) : null;

  const availSummaryRaw = d.availableRoomsSummary || {};
  const availableRoomsSummary = {
    availableRoomsCount: Number(availSummaryRaw.availableRoomsCount ?? 0),
    availableBedsCount: Number(availSummaryRaw.availableBedsCount ?? 0),
    preview: Array.isArray(availSummaryRaw.preview) ? availSummaryRaw.preview.map(normalizeRoom) : [],
  };

  const recentActivity =
    Array.isArray(d.recentActivity) && d.recentActivity.length > 0
      ? d.recentActivity
      : [
          ...myRequests.map((r) => ({
            title: `Room Request (${r.roomNumber})`,
            meta: `${r.hostelName} · Status: ${r.status}`,
            date: r.requestDate,
          })),
          ...myComplaints.map((c) => ({
            title: `${c.category} Complaint`,
            meta: `Room ${c.roomNumber} · Status: ${c.status}`,
            date: c.submittedDate,
          })),
        ]
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .slice(0, 6);

  return {
    ok: true,
    status: res.status,
    data: {
      student,
      room,
      hostel,
      roommates,
      pendingRequest,
      availableRoomsSummary,
      myRequests,
      myComplaints,
      complaintSummary: d.complaintSummary || {
        total: myComplaints.length,
        pending: myComplaints.filter((c) => c.status === 'Pending').length,
        resolved: myComplaints.filter((c) => c.status === 'Resolved').length,
      },
      recentActivity,
    },
  };
}

export async function getStudentsList(filters = {}) {
  const qs = buildQuery({
    status: filters.status,
    search: filters.search,
  });
  const res = await apiFetch(`${API_CONFIG.ENDPOINTS.DASHBOARD_STUDENTS}${qs}`);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.status,
    data: Array.isArray(res.data) ? res.data.map(normalizeUser) : [],
  };
}

export async function updateMyProfile(payload) {
  const res = await apiFetch(API_CONFIG.ENDPOINTS.AUTH_ME, {
    method: 'PUT',
    body: {
      fullName: payload.fullName,
      contactNumber: payload.contactNumber,
      department: payload.department,
      year: payload.year,
    },
  });
  if (!res.ok) return res;
  const user = normalizeUser(res.user);
  setAuthSession(null, user);
  return { ok: true, status: res.status, data: user };
}

export async function updateStudentProfile(_studentId, payload) {
  return updateMyProfile(payload);
}

/**
 * Fetches real notifications derived from MongoDB records (pending approvals/complaints for admin,
 * recent application/ticket updates for student). Zero fabricated notifications.
 */
export async function getLiveNotifications(role) {
  if (role === 'admin') {
    const [reqRes, cmpRes] = await Promise.all([
      getAllRequests({ status: 'Pending' }),
      getAllComplaints({ status: 'Pending' }),
    ]);
    if (!reqRes.ok && !cmpRes.ok) {
      return { ok: false, message: reqRes.message || cmpRes.message || 'Unable to load notifications.' };
    }
    const items = [];
    (reqRes.ok ? reqRes.data : []).slice(0, 5).forEach((r) => {
      items.push({
        id: r.id,
        kind: 'Application',
        title: `${r.studentName} applied for Room ${r.roomNumber}`,
        meta: `${r.hostelName} · ${r.requestDate}`,
        status: r.status,
        href: 'admin-requests.html',
      });
    });
    (cmpRes.ok ? cmpRes.data : []).slice(0, 5).forEach((c) => {
      items.push({
        id: c.id,
        kind: 'Complaint',
        title: `${c.category} complaint · Room ${c.roomNumber}`,
        meta: `${c.studentName} · ${c.submittedDate}`,
        status: c.status,
        href: 'admin-complaints.html',
      });
    });
    return {
      ok: true,
      data: {
        unreadCount: (reqRes.ok ? reqRes.data.length : 0) + (cmpRes.ok ? cmpRes.data.length : 0),
        items: items.slice(0, 8),
      },
    };
  }

  const [myReqRes, myCmpRes] = await Promise.all([getMyRequests(), getMyComplaints()]);
  if (!myReqRes.ok && !myCmpRes.ok) {
    return { ok: false, message: myReqRes.message || myCmpRes.message || 'Unable to load notifications.' };
  }
  const items = [];
  (myReqRes.ok ? myReqRes.data : []).slice(0, 4).forEach((r) => {
    items.push({
      id: r.id,
      kind: 'Application',
      title: `Room ${r.roomNumber} application: ${r.status}`,
      meta: `${r.hostelName} · ${r.requestDate}`,
      status: r.status,
      href: 'my-requests.html',
    });
  });
  (myCmpRes.ok ? myCmpRes.data : []).slice(0, 4).forEach((c) => {
    items.push({
      id: c.id,
      kind: 'Complaint',
      title: `${c.category} ticket: ${c.status}`,
      meta: `Room ${c.roomNumber} · ${c.submittedDate}`,
      status: c.status,
      href: 'my-complaints.html',
    });
  });
  const pendingCount =
    (myReqRes.ok ? myReqRes.data.filter((r) => r.status === 'Pending').length : 0) +
    (myCmpRes.ok ? myCmpRes.data.filter((c) => c.status === 'Pending').length : 0);

  return {
    ok: true,
    data: {
      unreadCount: pendingCount,
      items: items.slice(0, 8),
    },
  };
}

/**
 * Live cross-module search querying real MongoDB endpoints.
 */
export async function performGlobalSearch(role, queryText) {
  const q = String(queryText || '').trim().toLowerCase();
  if (!q) return { ok: true, data: [] };

  if (role === 'admin') {
    const [hostelsRes, roomsRes, studentsRes, reqsRes, cmpsRes] = await Promise.all([
      getHostels(),
      getAvailableRooms({ search: q }),
      getStudentsList({ search: q }),
      getAllRequests({ search: q }),
      getAllComplaints({ search: q }),
    ]);

    const results = [];
    if (hostelsRes.ok) {
      hostelsRes.data
        .filter((h) => h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || h.address.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((h) =>
          results.push({
            category: 'Hostel',
            title: h.name,
            subtitle: `${h.type} · ${h.occupiedBeds}/${h.totalCapacity} beds`,
            href: 'admin-hostels.html',
          })
        );
    }
    if (roomsRes.ok) {
      roomsRes.data.slice(0, 4).forEach((r) =>
        results.push({
          category: 'Room',
          title: `Room ${r.roomNumber} (${r.roomType})`,
          subtitle: `${r.hostelName} · ${r.occupiedCount}/${r.capacity} occupied · ${r.status}`,
          href: 'admin-rooms.html',
        })
      );
    }
    if (studentsRes.ok) {
      studentsRes.data.slice(0, 4).forEach((s) =>
        results.push({
          category: 'Student',
          title: `${s.fullName} (${s.studentId})`,
          subtitle: `${s.allocationStatus}${s.allocatedRoomNumber ? ` · Room ${s.allocatedRoomNumber}` : ''}`,
          href: 'admin-students.html',
        })
      );
    }
    if (reqsRes.ok) {
      reqsRes.data.slice(0, 3).forEach((r) =>
        results.push({
          category: 'Application',
          title: `${r.studentName} · Room ${r.roomNumber}`,
          subtitle: `${r.hostelName} · Status: ${r.status}`,
          href: 'admin-requests.html',
        })
      );
    }
    if (cmpsRes.ok) {
      cmpsRes.data.slice(0, 3).forEach((c) =>
        results.push({
          category: 'Complaint',
          title: `${c.category} · Room ${c.roomNumber}`,
          subtitle: `${c.studentName} · Status: ${c.status}`,
          href: 'admin-complaints.html',
        })
      );
    }
    return { ok: true, data: results.slice(0, 10) };
  }

  const [roomsRes, reqRes, cmpRes] = await Promise.all([
    getAvailableRooms({ search: q }),
    getMyRequests(),
    getMyComplaints(),
  ]);

  const results = [];
  if (roomsRes.ok) {
    roomsRes.data.slice(0, 4).forEach((r) =>
      results.push({
        category: 'Room',
        title: `Room ${r.roomNumber} (${r.roomType})`,
        subtitle: `${r.hostelName} · ${r.availableSeats} beds open · ${r.status}`,
        href: `rooms.html`,
      })
    );
  }
  if (reqRes.ok) {
    reqRes.data
      .filter((r) => r.roomNumber.toLowerCase().includes(q) || r.hostelName.toLowerCase().includes(q) || r.status.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((r) =>
        results.push({
          category: 'My Application',
          title: `Room ${r.roomNumber} · ${r.hostelName}`,
          subtitle: `Status: ${r.status} · ${r.requestDate}`,
          href: 'my-requests.html',
        })
      );
  }
  if (cmpRes.ok) {
    cmpRes.data
      .filter((c) => c.category.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.roomNumber.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((c) =>
        results.push({
          category: 'My Complaint',
          title: `${c.category} · Room ${c.roomNumber}`,
          subtitle: `Status: ${c.status} · ${c.submittedDate}`,
          href: 'my-complaints.html',
        })
      );
  }
  return { ok: true, data: results.slice(0, 10) };
}
