import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  isValidObjectId,
  validateComplaintInput,
  validateHostelInput,
  validateLoginInput,
  validateRegisterInput,
  validateRoomInput,
} from '../backend/utils/validators.js';
import { signAuthToken, verifyAuthToken } from '../backend/utils/jwt.js';
import {
  authorizeRoles,
  requireAdmin,
  requireStudent,
  verifyToken,
} from '../backend/middleware/auth.js';
import Room from '../backend/models/Room.js';
import User from '../backend/models/User.js';

test('backend validators enforce registration, hostel, room, and complaint schemas', () => {
  const badReg = validateRegisterInput({ name: 'A', email: 'bad', studentId: '1', gender: '' });
  assert.equal(badReg.valid, false);
  assert.ok(badReg.errors.name && badReg.errors.email && badReg.errors.studentId && badReg.errors.gender);

  const goodReg = validateRegisterInput({
    name: 'Priya Nair',
    email: 'priya@university.edu',
    studentId: 'STU-2026-501',
    contact: '9876543210',
    gender: 'Female',
  });
  assert.equal(goodReg.valid, true);
  assert.equal(goodReg.sanitized.studentId, 'STU-2026-501');

  const validHostelId = new mongoose.Types.ObjectId().toString();
  assert.equal(
    validateRoomInput({
      hostelId: validHostelId,
      roomNumber: 'N-101',
      type: 'Double',
      capacity: 2,
      occupiedCount: 3,
    }).valid,
    false
  );
  assert.equal(
    validateRoomInput({
      hostelId: validHostelId,
      roomNumber: 'N-101',
      type: 'Double',
      capacity: 2,
      occupiedCount: 1,
    }).valid,
    true
  );

  assert.equal(
    validateHostelInput({ name: 'North Hall', type: 'Boys', address: 'Sector 2 Campus', totalRooms: 50 }).valid,
    true
  );
  assert.equal(
    validateComplaintInput({
      roomId: validHostelId,
      category: 'Electricity',
      description: 'Light fixture is flickering intermittently.',
    }).valid,
    true
  );
  assert.equal(isValidObjectId(validHostelId), true);
  assert.equal(isValidObjectId('not-an-object-id'), false);
  assert.equal(validateLoginInput({ email: 'a@b.com' }).valid, true);
});

test('Room Mongoose model rejects occupiedCount exceeding capacity', async () => {
  const room = new Room({
    hostelId: new mongoose.Types.ObjectId(),
    roomNumber: 'A-101',
    type: 'Double',
    capacity: 2,
    occupiedCount: 3,
  });

  await assert.rejects(() => room.validate(), /occupiedCount.*cannot exceed room capacity/);
});

test('User Mongoose model strips password in toSafeJSON and JWT verifies role claims', () => {
  process.env.JWT_SECRET = 'test_only_long_random_secret_for_unit_tests_12345';
  const user = new User({
    name: 'Aarav Sharma',
    email: 'aarav@university.edu',
    password: 'Password123',
    role: 'student',
    studentId: 'STU-2026-104',
  });

  const safe = user.toSafeJSON();
  assert.equal('password' in safe, false);
  assert.equal(safe.role, 'student');

  const token = signAuthToken(user);
  const decoded = verifyAuthToken(token);
  assert.equal(decoded.sub, String(user._id));
  assert.equal(decoded.role, 'student');
});

test('auth middleware verifies JWT tokens and enforces student/admin RBAC', async () => {
  process.env.JWT_SECRET = 'test_only_long_random_secret_for_unit_tests_12345';

  // 1. Missing Bearer token -> 401
  let nextErr = null;
  await verifyToken({ headers: {} }, {}, (err) => {
    nextErr = err;
  });
  assert.equal(nextErr.statusCode, 401);

  // 2. Invalid JWT token -> 401
  nextErr = null;
  await verifyToken({ headers: { authorization: 'Bearer invalid.jwt.token' } }, {}, (err) => {
    nextErr = err;
  });
  assert.equal(nextErr.statusCode, 401);

  // 3. Valid JWT token loads user & attaches req.user
  const originalFindById = User.findById;
  const mockStudent = new User({
    name: 'Ananya Verma',
    email: 'ananya@university.edu',
    password: 'Password123',
    role: 'student',
    studentId: 'STU-2026-219',
  });
  User.findById = async () => mockStudent;

  try {
    const token = signAuthToken(mockStudent);
    const req = { headers: { authorization: `Bearer ${token}` } };
    let passed = false;
    await verifyToken(req, {}, (err) => {
      if (!err) passed = true;
    });
    assert.equal(passed, true);
    assert.equal(req.user.role, 'student');
    assert.equal(req.auth.userId, String(mockStudent._id));

    // 4. Role checks: student allowed on requireStudent, denied (403) on requireAdmin
    let studentAllowed = false;
    requireStudent(req, {}, (err) => {
      if (!err) studentAllowed = true;
    });
    assert.equal(studentAllowed, true);

    let adminDeniedErr = null;
    requireAdmin(req, {}, (err) => {
      adminDeniedErr = err;
    });
    assert.equal(adminDeniedErr.statusCode, 403);

    // 5. Admin allowed on authorizeRoles('student', 'admin') and requireAdmin
    const adminReq = { user: { role: 'admin' } };
    let adminAllowed = false;
    authorizeRoles('student', 'admin')(adminReq, {}, (err) => {
      if (!err) adminAllowed = true;
    });
    assert.equal(adminAllowed, true);

    let adminOnlyAllowed = false;
    requireAdmin(adminReq, {}, (err) => {
      if (!err) adminOnlyAllowed = true;
    });
    assert.equal(adminOnlyAllowed, true);
  } finally {
    User.findById = originalFindById;
  }
});

test('Phase 3 validators and backend route/controller modules expose full REST integration endpoints', async () => {
  const { validateProfileUpdateInput } = await import('../backend/utils/validators.js');
  const roomCtrl = await import('../backend/controllers/roomController.js');
  const complaintCtrl = await import('../backend/controllers/complaintController.js');
  const dashboardCtrl = await import('../backend/controllers/dashboardController.js');
  const authCtrl = await import('../backend/controllers/authController.js');

  const validHostelId = new mongoose.Types.ObjectId().toString();
  const complaintByRoomNumber = validateComplaintInput({
    hostelId: validHostelId,
    roomNumber: 'N-204',
    category: 'Plumbing',
    description: 'Bathroom tap is leaking continuously since morning.',
  });
  assert.equal(complaintByRoomNumber.valid, true);
  assert.equal(complaintByRoomNumber.sanitized.roomNumber, 'N-204');

  const badProfile = validateProfileUpdateInput({ fullName: 'A', contactNumber: '123' });
  assert.equal(badProfile.valid, false);
  assert.ok(badProfile.errors.fullName && badProfile.errors.contactNumber);

  const goodProfile = validateProfileUpdateInput({
    fullName: 'Aarav Sharma',
    contactNumber: '9876543210',
    department: 'Computer Science',
    year: '3rd Year',
  });
  assert.equal(goodProfile.valid, true);

  assert.equal(typeof roomCtrl.getRoomById, 'function');
  assert.equal(typeof complaintCtrl.updateComplaint, 'function');
  assert.equal(typeof dashboardCtrl.getOccupancyStats, 'function');
  assert.equal(typeof dashboardCtrl.getRecentActivity, 'function');
  assert.equal(typeof authCtrl.updateMe, 'function');
});

test('Auth REST API end-to-end: signup, duplicate checks, bcrypt login, admin seeding, RBAC, refresh, and logout', async () => {
  process.env.JWT_SECRET = 'test_only_long_random_secret_for_unit_tests_12345';
  const http = await import('node:http');
  const bcrypt = (await import('bcryptjs')).default;
  const { createBackendApp } = await import('../backend/app.js');
  const { provisionInitialAdmin } = await import('../backend/utils/seedAdmin.js');
  const Hostel = (await import('../backend/models/Hostel.js')).default;
  const RequestModel = (await import('../backend/models/Request.js')).default;
  const Complaint = (await import('../backend/models/Complaint.js')).default;

  // In-memory store wired through real Mongoose User docs + bcrypt hashing
  const usersStore = [];
  const makeQueryChain = (doc) => ({
    select() {
      return this;
    },
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(doc).then(resolve, reject);
    },
  });

  const originalConnDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  const origFindOne = User.findOne;
  const origFindById = User.findById;
  const origCreate = User.create;
  const origCountDocs = User.countDocuments;
  const origHostelCount = Hostel.countDocuments;
  const origHostelFind = Hostel.find;
  const origRoomAgg = Room.aggregate;
  const origReqAgg = RequestModel.aggregate;
  const origReqFind = RequestModel.find;
  const origCmpAgg = Complaint.aggregate;
  const origCmpFind = Complaint.find;

  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 1 });

  User.findOne = (query = {}) => {
    const match =
      usersStore.find((u) =>
        Object.entries(query).every(([k, v]) => String(u[k] || '').toLowerCase() === String(v || '').toLowerCase())
      ) || null;
    return makeQueryChain(match);
  };
  User.findById = (id) => {
    const match = usersStore.find((u) => String(u._id) === String(id)) || null;
    return makeQueryChain(match);
  };
  User.create = async (data) => {
    const doc = new User(data);
    await doc.validate();
    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(data.password, salt);
    usersStore.push(doc);
    return doc;
  };
  User.countDocuments = async (query = {}) =>
    usersStore.filter((u) => Object.entries(query).every(([k, v]) => u[k] === v)).length;

  const makeEmptyListChain = () => ({
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    lean() {
      return Promise.resolve([]);
    },
    then(resolve, reject) {
      return Promise.resolve([]).then(resolve, reject);
    },
  });
  Hostel.countDocuments = async () => 0;
  Hostel.find = () => makeEmptyListChain();
  Room.aggregate = async () => [];
  RequestModel.aggregate = async () => [];
  RequestModel.find = () => makeEmptyListChain();
  Complaint.aggregate = async () => [];
  Complaint.find = () => makeEmptyListChain();

  const app = createBackendApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // Admin seed idempotency (creates once, skips duplicate)
    const firstSeed = await provisionInitialAdmin({
      name: 'Chief Warden',
      email: 'warden.admin@university.edu',
      password: 'AdminStrongPassword!1',
    });
    assert.equal(firstSeed.created, true);
    assert.equal(firstSeed.admin.role, 'admin');
    const secondSeed = await provisionInitialAdmin({
      name: 'Chief Warden',
      email: 'warden.admin@university.edu',
      password: 'AdminStrongPassword!1',
    });
    assert.equal(secondSeed.created, false);

    // Block public self-registration as admin
    const adminSignupAttempt = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rogue Admin',
        email: 'rogue@university.edu',
        studentId: 'STU-2026-999',
        password: 'Password123',
        contact: '9876543210',
        gender: 'Male',
        role: 'admin',
      }),
    });
    assert.equal(adminSignupAttempt.status, 403);

    // TEST 1: Student signup with valid details (passwordless entry)
    const signupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Nair',
        email: 'priya.nair@university.edu',
        studentId: 'STU-2026-501',
        contact: '9876543210',
        gender: 'Female',
      }),
    });
    assert.equal(signupRes.status, 201);
    const signupBody = await signupRes.json();
    assert.equal(signupBody.ok, true);
    assert.equal(signupBody.user.role, 'student');
    assert.equal('password' in signupBody.user, false);
    const storedStudent = usersStore.find((u) => u.email === 'priya.nair@university.edu');
    assert.ok(storedStudent && storedStudent.password.startsWith('$2'));

    // TEST 2: Duplicate email registration
    const dupEmailRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Duplicate',
        email: 'priya.nair@university.edu',
        studentId: 'STU-2026-502',
        contact: '9876543211',
        gender: 'Female',
      }),
    });
    assert.equal(dupEmailRes.status, 409);

    // TEST 3: Student login without password
    const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya.nair@university.edu',
        expectedRole: 'student',
      }),
    });
    assert.equal(studentLoginRes.status, 200);
    const studentLoginBody = await studentLoginRes.json();
    assert.equal(studentLoginBody.ok, true);
    assert.equal(studentLoginBody.user.role, 'student');
    assert.ok(studentLoginBody.token);
    const studentToken = studentLoginBody.token;

    // TEST 4: Role separation enforced when student attempts Admin portal login
    const crossRoleRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya.nair@university.edu',
        expectedRole: 'admin',
      }),
    });
    assert.equal(crossRoleRes.status, 403);

    // TEST 5: Admin login without password
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'warden.admin@university.edu',
        expectedRole: 'admin',
      }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminLoginBody = await adminLoginRes.json();
    assert.equal(adminLoginBody.user.role, 'admin');
    const adminToken = adminLoginBody.token;

    // TEST 6: Student attempting to access admin dashboard API -> 403 denied
    const studentOnAdminRes = await fetch(`${baseUrl}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentOnAdminRes.status, 403);

    // TEST 7: Admin accessing admin dashboard API -> 200 allowed
    const adminOnAdminRes = await fetch(`${baseUrl}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminOnAdminRes.status, 200);

    // TEST 8: Refresh page while logged in -> /api/auth/me verifies JWT
    const refreshMeRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(refreshMeRes.status, 200);
    const refreshMeBody = await refreshMeRes.json();
    assert.equal(refreshMeBody.user.email, 'priya.nair@university.edu');

    // TEST 9: Logout / unauthenticated access denied -> 401
    const unauthMeRes = await fetch(`${baseUrl}/auth/me`);
    assert.equal(unauthMeRes.status, 401);
    const unauthAdminRes = await fetch(`${baseUrl}/dashboard/summary`);
    assert.equal(unauthAdminRes.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (originalConnDescriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', originalConnDescriptor);
    }
    User.findOne = origFindOne;
    User.findById = origFindById;
    User.create = origCreate;
    User.countDocuments = origCountDocs;
    Hostel.countDocuments = origHostelCount;
    Hostel.find = origHostelFind;
    Room.aggregate = origRoomAgg;
    RequestModel.aggregate = origReqAgg;
    RequestModel.find = origReqFind;
    Complaint.aggregate = origCmpAgg;
    Complaint.find = origCmpFind;
  }
});

test('Fallback store serves all admin and student dashboard APIs cleanly when Atlas is disconnected', async () => {
  process.env.JWT_SECRET = 'test_only_long_random_secret_for_unit_tests_12345';
  const http = await import('node:http');
  const { createBackendApp } = await import('../backend/app.js');
  const { resetFallbackStore } = await import('../backend/utils/fallbackStore.js');

  const originalConnDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 0 });
  resetFallbackStore();

  const app = createBackendApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'warden.admin@university.edu', expectedRole: 'admin' }),
    }).then((r) => r.json());
    assert.equal(adminLogin.ok, true);
    assert.ok(adminLogin.token);

    const studentLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aarav.student@university.edu', expectedRole: 'student' }),
    }).then((r) => r.json());
    assert.equal(studentLogin.ok, true);
    assert.ok(studentLogin.token);

    const [summaryRes, hostelsRes, requestsRes, complaintsRes, studentDashRes] = await Promise.all([
      fetch(`${baseUrl}/dashboard/summary`, { headers: { Authorization: `Bearer ${adminLogin.token}` } }),
      fetch(`${baseUrl}/hostels`, { headers: { Authorization: `Bearer ${adminLogin.token}` } }),
      fetch(`${baseUrl}/requests?status=Pending`, { headers: { Authorization: `Bearer ${adminLogin.token}` } }),
      fetch(`${baseUrl}/complaints?status=Pending`, { headers: { Authorization: `Bearer ${adminLogin.token}` } }),
      fetch(`${baseUrl}/dashboard/student`, { headers: { Authorization: `Bearer ${studentLogin.token}` } }),
    ]);

    assert.equal(summaryRes.status, 200);
    assert.equal(hostelsRes.status, 200);
    assert.equal(requestsRes.status, 200);
    assert.equal(complaintsRes.status, 200);
    assert.equal(studentDashRes.status, 200);

    const summaryBody = await summaryRes.json();
    const hostelsBody = await hostelsRes.json();
    assert.ok(summaryBody.data.summary.totalHostels >= 3);
    assert.ok(hostelsBody.data.length >= 3);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (originalConnDescriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', originalConnDescriptor);
    }
  }
});
