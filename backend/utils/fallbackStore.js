import fs from 'node:fs';
import mongoose from 'mongoose';
import path from 'node:path';

const STORE_FILE_PATH = process.env.UNISTAY_FALLBACK_DB_PATH || '/tmp/unistay-fallback-db.json';

function newId() {
  return new mongoose.Types.ObjectId().toString();
}

function nowIso() {
  return new Date().toISOString();
}

function buildInitialSeedState() {
  const ts = nowIso();

  const h1Id = newId();
  const h2Id = newId();
  const h3Id = newId();

  const r101 = newId();
  const r102 = newId();
  const r204 = newId();
  const s101 = newId();
  const s102 = newId();
  const s205 = newId();
  const v301 = newId();
  const v302 = newId();

  const adminId = newId();
  const student1Id = newId();
  const student2Id = newId();
  const student3Id = newId();

  const hostels = [
    {
      _id: h1Id,
      name: 'Aryabhatta Residence Hall',
      type: 'Boys',
      totalRooms: 120,
      address: 'North Campus Avenue, Block A',
      warden: 'Dr. R. Krishnan',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: h2Id,
      name: 'Sarojini Residence Hall',
      type: 'Girls',
      totalRooms: 110,
      address: 'East Academic Quadrant, Block C',
      warden: 'Prof. M. Deshmukh',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: h3Id,
      name: 'Vikram Sarabhai Annex',
      type: 'Boys',
      totalRooms: 80,
      address: 'West Engineering Enclave, Block B',
      warden: 'Dr. S. Kulkarni',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const rooms = [
    { _id: r101, hostelId: h1Id, roomNumber: 'A-101', type: 'Single', capacity: 1, occupiedCount: 1, status: 'Full', floor: '1st Floor', createdAt: ts, updatedAt: ts },
    { _id: r102, hostelId: h1Id, roomNumber: 'A-102', type: 'Double', capacity: 2, occupiedCount: 1, status: 'Available', floor: '1st Floor', createdAt: ts, updatedAt: ts },
    { _id: r204, hostelId: h1Id, roomNumber: 'A-204', type: 'Triple', capacity: 3, occupiedCount: 0, status: 'Available', floor: '2nd Floor', createdAt: ts, updatedAt: ts },
    { _id: s101, hostelId: h2Id, roomNumber: 'S-101', type: 'Single', capacity: 1, occupiedCount: 0, status: 'Available', floor: '1st Floor', createdAt: ts, updatedAt: ts },
    { _id: s102, hostelId: h2Id, roomNumber: 'S-102', type: 'Double', capacity: 2, occupiedCount: 1, status: 'Available', floor: '1st Floor', createdAt: ts, updatedAt: ts },
    { _id: s205, hostelId: h2Id, roomNumber: 'S-205', type: 'Triple', capacity: 3, occupiedCount: 0, status: 'Available', floor: '2nd Floor', createdAt: ts, updatedAt: ts },
    { _id: v301, hostelId: h3Id, roomNumber: 'V-301', type: 'Double', capacity: 2, occupiedCount: 0, status: 'Available', floor: '3rd Floor', createdAt: ts, updatedAt: ts },
    { _id: v302, hostelId: h3Id, roomNumber: 'V-302', type: 'Single', capacity: 1, occupiedCount: 0, status: 'Available', floor: '3rd Floor', createdAt: ts, updatedAt: ts },
  ];

  const users = [
    {
      _id: adminId,
      name: 'Hostel Chief Warden',
      email: 'warden.admin@university.edu',
      role: 'admin',
      studentId: '',
      contact: '9800011122',
      gender: 'Other',
      department: 'Hostel Administration',
      year: '',
      allocatedHostelId: null,
      allocatedRoomId: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: student1Id,
      name: 'Aarav Sharma',
      email: 'aarav.student@university.edu',
      role: 'student',
      studentId: 'STU-2026-104',
      contact: '9876501234',
      gender: 'Male',
      department: 'Computer Science',
      year: '2nd Year',
      allocatedHostelId: h1Id,
      allocatedRoomId: r102,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: student2Id,
      name: 'Priya Nair',
      email: 'priya.nair@university.edu',
      role: 'student',
      studentId: 'STU-2026-501',
      contact: '9876543210',
      gender: 'Female',
      department: 'Electrical Engineering',
      year: '3rd Year',
      allocatedHostelId: h2Id,
      allocatedRoomId: s102,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: student3Id,
      name: 'Rohan Mehta',
      email: 'rohan.mehta@university.edu',
      role: 'student',
      studentId: 'STU-2026-218',
      contact: '9811223344',
      gender: 'Male',
      department: 'Mechanical Engineering',
      year: '1st Year',
      allocatedHostelId: null,
      allocatedRoomId: null,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const requests = [
    {
      _id: newId(),
      studentId: student3Id,
      hostelId: h1Id,
      roomId: r204,
      status: 'Pending',
      notes: 'Prefer 2nd floor near study wing.',
      adminNote: '',
      requestedDate: ts,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: newId(),
      studentId: student1Id,
      hostelId: h1Id,
      roomId: r102,
      status: 'Approved',
      notes: 'Double sharing preference.',
      adminNote: 'Allocated for Academic Year 2026.',
      requestedDate: ts,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const complaints = [
    {
      _id: newId(),
      studentId: student1Id,
      roomId: r102,
      category: 'Electricity',
      description: 'Study desk reading lamp flickers intermittently in the evening.',
      status: 'Pending',
      resolutionNote: '',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      _id: newId(),
      studentId: student2Id,
      roomId: s102,
      category: 'Plumbing',
      description: 'Washbasin faucet washer replaced after minor drip.',
      status: 'Resolved',
      resolutionNote: 'Replaced washer and verified pressure.',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  return { users, hostels, rooms, requests, complaints };
}

let cachedState = null;

function loadState() {
  if (cachedState) return cachedState;
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.hostels) && Array.isArray(parsed.rooms)) {
        cachedState = {
          users: parsed.users,
          hostels: parsed.hostels,
          rooms: parsed.rooms,
          requests: Array.isArray(parsed.requests) ? parsed.requests : [],
          complaints: Array.isArray(parsed.complaints) ? parsed.complaints : [],
        };
        return cachedState;
      }
    }
  } catch {
    // Fall back to fresh seed state if file is unreadable
  }
  cachedState = buildInitialSeedState();
  saveState();
  return cachedState;
}

function saveState() {
  if (!cachedState) return;
  try {
    const dir = path.dirname(STORE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(cachedState, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only environments; memory state stays intact
  }
}

export function resetFallbackStore() {
  cachedState = buildInitialSeedState();
  saveState();
  return cachedState;
}

export function getHostelByIdSync(id) {
  const s = loadState();
  return s.hostels.find((h) => String(h._id) === String(id)) || null;
}

export function getRoomByIdSync(id) {
  const s = loadState();
  return s.rooms.find((r) => String(r._id) === String(id)) || null;
}

export function populateUser(user) {
  if (!user) return null;
  const hostel = user.allocatedHostelId ? getHostelByIdSync(user.allocatedHostelId) : null;
  const room = user.allocatedRoomId ? getRoomByIdSync(user.allocatedRoomId) : null;
  const { password: _pw, ...rest } = user;
  return {
    ...rest,
    allocatedHostelId: hostel
      ? { _id: hostel._id, name: hostel.name, type: hostel.type, address: hostel.address, warden: hostel.warden }
      : null,
    allocatedRoomId: room
      ? {
          _id: room._id,
          roomNumber: room.roomNumber,
          type: room.type,
          capacity: room.capacity,
          occupiedCount: room.occupiedCount,
          status: room.status,
          floor: room.floor,
        }
      : null,
  };
}

export function populateRoom(room) {
  if (!room) return null;
  const hostel = getHostelByIdSync(room.hostelId);
  return {
    ...room,
    hostelId: hostel
      ? { _id: hostel._id, name: hostel.name, type: hostel.type, address: hostel.address, warden: hostel.warden }
      : room.hostelId,
    availableSeats: Math.max(0, Number(room.capacity) - Number(room.occupiedCount)),
  };
}

export function populateRequest(reqDoc) {
  if (!reqDoc) return null;
  const s = loadState();
  const student = s.users.find((u) => String(u._id) === String(reqDoc.studentId)) || null;
  const hostel = getHostelByIdSync(reqDoc.hostelId);
  const room = getRoomByIdSync(reqDoc.roomId);
  return {
    ...reqDoc,
    studentId: student
      ? {
          _id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId,
          contact: student.contact,
          gender: student.gender,
        }
      : reqDoc.studentId,
    hostelId: hostel ? { _id: hostel._id, name: hostel.name, type: hostel.type, address: hostel.address } : reqDoc.hostelId,
    roomId: room
      ? {
          _id: room._id,
          roomNumber: room.roomNumber,
          type: room.type,
          capacity: room.capacity,
          occupiedCount: room.occupiedCount,
          status: room.status,
        }
      : reqDoc.roomId,
  };
}

export function populateComplaint(cmpDoc) {
  if (!cmpDoc) return null;
  const s = loadState();
  const student = s.users.find((u) => String(u._id) === String(cmpDoc.studentId)) || null;
  const room = getRoomByIdSync(cmpDoc.roomId);
  const hostel = room ? getHostelByIdSync(room.hostelId) : null;
  return {
    ...cmpDoc,
    studentId: student
      ? { _id: student._id, name: student.name, email: student.email, studentId: student.studentId }
      : cmpDoc.studentId,
    roomId: room
      ? {
          _id: room._id,
          roomNumber: room.roomNumber,
          type: room.type,
          hostelId: hostel ? { _id: hostel._id, name: hostel.name, type: hostel.type } : room.hostelId,
        }
      : cmpDoc.roomId,
  };
}

export const fallbackStore = {
  getState: loadState,
  save: saveState,
  newId,

  findUserById(id) {
    const s = loadState();
    return s.users.find((u) => String(u._id) === String(id)) || null;
  },

  findUserByEmail(email) {
    const s = loadState();
    const target = String(email || '').trim().toLowerCase();
    return s.users.find((u) => String(u.email || '').toLowerCase() === target) || null;
  },

  findUserByStudentId(studentId) {
    const s = loadState();
    const target = String(studentId || '').trim().toUpperCase();
    return s.users.find((u) => String(u.studentId || '').toUpperCase() === target) || null;
  },

  upsertUser({ _id, name, email, role, studentId = '', contact = '', gender = '' }) {
    const s = loadState();
    const cleanEmail = String(email || '').trim().toLowerCase();
    let existing = _id ? s.users.find((u) => String(u._id) === String(_id)) : null;
    if (!existing && cleanEmail) {
      existing = s.users.find((u) => String(u.email || '').toLowerCase() === cleanEmail);
    }
    if (existing) {
      if (name && (!existing.name || existing.name === 'Campus Student' || existing.name === 'Hostel Chief Warden')) {
        existing.name = name;
      }
      existing.updatedAt = nowIso();
      saveState();
      return existing;
    }

    const ts = nowIso();
    const created = {
      _id: _id && /^[a-f0-9]{24}$/i.test(String(_id)) ? String(_id) : newId(),
      name: name || (role === 'admin' ? 'Hostel Chief Warden' : 'Campus Student'),
      email: cleanEmail,
      role: role === 'admin' ? 'admin' : 'student',
      studentId: role === 'student' ? String(studentId || `STU-${Date.now().toString().slice(-6)}`).toUpperCase() : '',
      contact: String(contact || ''),
      gender: String(gender || ''),
      department: role === 'admin' ? 'Hostel Administration' : 'Undergraduate Studies',
      year: role === 'admin' ? '' : '1st Year',
      allocatedHostelId: null,
      allocatedRoomId: null,
      createdAt: ts,
      updatedAt: ts,
    };
    s.users.push(created);
    saveState();
    return created;
  },

  updateUser(id, patch) {
    const s = loadState();
    const user = s.users.find((u) => String(u._id) === String(id));
    if (!user) return null;
    Object.assign(user, patch, { updatedAt: nowIso() });
    saveState();
    return user;
  },

  listHostelsWithStats() {
    const s = loadState();
    return [...s.hostels]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((h) => {
        const rooms = s.rooms.filter((r) => String(r.hostelId) === String(h._id));
        const totalCapacity = rooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
        const occupiedBeds = rooms.reduce((sum, r) => sum + Number(r.occupiedCount || 0), 0);
        const availableRoomsCount = rooms.filter((r) => r.status === 'Available').length;
        return {
          ...h,
          configuredRoomsCount: rooms.length,
          totalCapacity,
          occupiedBeds,
          availableRoomsCount,
        };
      });
  },

  createHostel(sanitized) {
    const s = loadState();
    const dup = s.hostels.find((h) => h.name.toLowerCase() === sanitized.name.toLowerCase());
    if (dup) {
      const err = new Error('Duplicate hostel name');
      err.code = 11000;
      err.keyPattern = { name: 1 };
      throw err;
    }
    const ts = nowIso();
    const hostel = { _id: newId(), ...sanitized, createdAt: ts, updatedAt: ts };
    s.hostels.push(hostel);
    saveState();
    return hostel;
  },

  updateHostel(id, sanitized) {
    const s = loadState();
    const hostel = s.hostels.find((h) => String(h._id) === String(id));
    if (!hostel) return null;
    Object.assign(hostel, sanitized, { updatedAt: nowIso() });
    saveState();
    return hostel;
  },

  deleteHostel(id) {
    const s = loadState();
    const idx = s.hostels.findIndex((h) => String(h._id) === String(id));
    if (idx === -1) return null;
    const [deleted] = s.hostels.splice(idx, 1);
    saveState();
    return deleted;
  },

  createRoom(sanitized) {
    const s = loadState();
    const dup = s.rooms.find(
      (r) => String(r.hostelId) === String(sanitized.hostelId) && r.roomNumber.toUpperCase() === sanitized.roomNumber.toUpperCase()
    );
    if (dup) {
      const err = new Error('Duplicate room number in hostel');
      err.code = 11000;
      err.keyPattern = { roomNumber: 1 };
      throw err;
    }
    const ts = nowIso();
    const room = {
      _id: newId(),
      ...sanitized,
      status: sanitized.occupiedCount >= sanitized.capacity ? 'Full' : 'Available',
      createdAt: ts,
      updatedAt: ts,
    };
    s.rooms.push(room);
    saveState();
    return room;
  },

  updateRoom(id, sanitized) {
    const s = loadState();
    const room = s.rooms.find((r) => String(r._id) === String(id));
    if (!room) return null;
    Object.assign(room, sanitized, {
      status: sanitized.occupiedCount >= sanitized.capacity ? 'Full' : 'Available',
      updatedAt: nowIso(),
    });
    saveState();
    return room;
  },

  createRequest({ studentId, hostelId, roomId, notes = '' }) {
    const s = loadState();
    const ts = nowIso();
    const created = {
      _id: newId(),
      studentId,
      hostelId,
      roomId,
      status: 'Pending',
      notes: String(notes || '').trim(),
      adminNote: '',
      requestedDate: ts,
      createdAt: ts,
      updatedAt: ts,
    };
    s.requests.push(created);
    saveState();
    return created;
  },

  approveRequest(requestId, adminNote = '') {
    const s = loadState();
    const reqDoc = s.requests.find((r) => String(r._id) === String(requestId));
    if (!reqDoc) return { error: 'not_found' };
    if (reqDoc.status !== 'Pending') return { error: 'already_processed', status: reqDoc.status };
    const room = s.rooms.find((rm) => String(rm._id) === String(reqDoc.roomId));
    if (!room || room.occupiedCount >= room.capacity) return { error: 'room_full' };

    reqDoc.status = 'Approved';
    reqDoc.adminNote = adminNote || 'Approved by Hostel Administration.';
    reqDoc.updatedAt = nowIso();

    room.occupiedCount += 1;
    room.status = room.occupiedCount >= room.capacity ? 'Full' : 'Available';
    room.updatedAt = nowIso();

    const student = s.users.find((u) => String(u._id) === String(reqDoc.studentId));
    if (student) {
      student.allocatedHostelId = reqDoc.hostelId;
      student.allocatedRoomId = reqDoc.roomId;
      student.updatedAt = nowIso();
    }

    saveState();
    return { ok: true, request: reqDoc };
  },

  rejectRequest(requestId, adminNote = '') {
    const s = loadState();
    const reqDoc = s.requests.find((r) => String(r._id) === String(requestId));
    if (!reqDoc) return { error: 'not_found' };
    if (reqDoc.status !== 'Pending') return { error: 'already_processed', status: reqDoc.status };
    reqDoc.status = 'Rejected';
    reqDoc.adminNote = adminNote || 'Rejected by Hostel Administration.';
    reqDoc.updatedAt = nowIso();
    saveState();
    return { ok: true, request: reqDoc };
  },

  createComplaint({ studentId, roomId, category, description }) {
    const s = loadState();
    const ts = nowIso();
    const created = {
      _id: newId(),
      studentId,
      roomId,
      category,
      description,
      status: 'Pending',
      resolutionNote: '',
      createdAt: ts,
      updatedAt: ts,
    };
    s.complaints.push(created);
    saveState();
    return created;
  },

  updateComplaint(id, { status, resolutionNote }) {
    const s = loadState();
    const cmp = s.complaints.find((c) => String(c._id) === String(id));
    if (!cmp) return null;
    cmp.status = status;
    cmp.resolutionNote = resolutionNote;
    cmp.updatedAt = nowIso();
    saveState();
    return cmp;
  },
};
