/**
 * Pure domain rules, calculations, and form validators for UniStay Hostel Management System.
 * Zero DOM or storage dependencies so logic is deterministic and directly unit-testable.
 */

export const ROOM_CAPACITY_MAP = Object.freeze({
  Single: 1,
  Double: 2,
  Triple: 3,
});

export function getRoomCapacityByType(roomType) {
  return ROOM_CAPACITY_MAP[roomType] ?? 0;
}

export function computeAvailableSeats(room) {
  const capacity = Number(room?.capacity ?? 0);
  const occupied = Number(room?.occupiedCount ?? 0);
  return Math.max(0, capacity - occupied);
}

export function computeRoomStatus(room) {
  const capacity = Number(room?.capacity ?? 0);
  const occupied = Number(room?.occupiedCount ?? 0);
  if (capacity <= 0) return 'Full';
  return occupied >= capacity ? 'Full' : 'Available';
}

export function computeDashboardSummary({ hostels = [], rooms = [], requests = [], complaints = [] }) {
  const totalHostels = hostels.length;
  const totalRooms = rooms.length;
  let occupiedRooms = 0;
  let availableRooms = 0;
  let fullRooms = 0;
  let totalCapacity = 0;
  let totalOccupiedBeds = 0;

  for (const room of rooms) {
    const cap = Number(room.capacity || 0);
    const occ = Number(room.occupiedCount || 0);
    totalCapacity += cap;
    totalOccupiedBeds += occ;
    if (occ > 0) occupiedRooms += 1;
    if (computeRoomStatus(room) === 'Full') {
      fullRooms += 1;
    } else {
      availableRooms += 1;
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
  const approvedRequests = requests.filter((r) => r.status === 'Approved').length;
  const rejectedRequests = requests.filter((r) => r.status === 'Rejected').length;

  const activeComplaints = complaints.filter((c) => c.status === 'Pending').length;
  const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved').length;

  const occupancyRate = totalCapacity > 0
    ? Math.round((totalOccupiedBeds / totalCapacity) * 100)
    : 0;

  return {
    totalHostels,
    totalRooms,
    occupiedRooms,
    availableRooms,
    fullRooms,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    activeComplaints,
    resolvedComplaints,
    totalCapacity,
    totalOccupiedBeds,
    occupancyRate,
  };
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

export function validatePhone(phone) {
  const digits = String(phone || '').replace(/[\s\-()+]/g, '');
  return /^\d{10,15}$/.test(digits);
}

export function validateStudentRegistration(payload) {
  const errors = {};
  const fullName = String(payload?.fullName || '').trim();
  const email = String(payload?.email || '').trim();
  const studentId = String(payload?.studentId || '').trim();
  const contactNumber = String(payload?.contactNumber || '').trim();
  const gender = String(payload?.gender || '').trim();

  if (fullName.length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters).';
  }
  if (!validateEmail(email)) {
    errors.email = 'Please enter a valid university email address.';
  }
  if (!/^[A-Za-z0-9\-]{4,20}$/.test(studentId)) {
    errors.studentId = 'Student ID must be 4–20 alphanumeric characters (e.g. STU-2026-104).';
  }
  if (!validatePhone(contactNumber)) {
    errors.contactNumber = 'Enter a valid 10–15 digit contact number.';
  }
  if (!['Male', 'Female', 'Other'].includes(gender)) {
    errors.gender = 'Please select your gender.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLogin(payload) {
  const errors = {};
  const email = String(payload?.email || '').trim();

  if (email && !validateEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateHostelForm(payload) {
  const errors = {};
  const name = String(payload?.name || '').trim();
  const type = String(payload?.type || '').trim();
  const address = String(payload?.address || '').trim();
  const totalRooms = Number(payload?.totalRooms);

  if (name.length < 3) {
    errors.name = 'Hostel name must be at least 3 characters.';
  }
  if (!['Boys', 'Girls'].includes(type)) {
    errors.type = 'Hostel type must be Boys or Girls.';
  }
  if (address.length < 5) {
    errors.address = 'Please enter a complete campus address.';
  }
  if (!Number.isInteger(totalRooms) || totalRooms < 1 || totalRooms > 2000) {
    errors.totalRooms = 'Total rooms must be a whole number between 1 and 2000.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRoomForm(payload) {
  const errors = {};
  const hostelId = String(payload?.hostelId || '').trim();
  const roomNumber = String(payload?.roomNumber || '').trim();
  const roomType = String(payload?.roomType || '').trim();
  const capacity = Number(payload?.capacity);
  const occupiedCount = Number(payload?.occupiedCount);

  if (!hostelId) {
    errors.hostelId = 'Please select a hostel.';
  }
  if (!/^[A-Za-z0-9\-]{1,12}$/.test(roomNumber)) {
    errors.roomNumber = 'Room number must be 1–12 characters (e.g. A-104).';
  }
  if (!['Single', 'Double', 'Triple'].includes(roomType)) {
    errors.roomType = 'Select Single, Double, or Triple.';
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 6) {
    errors.capacity = 'Capacity must be between 1 and 6 beds.';
  }
  if (!Number.isInteger(occupiedCount) || occupiedCount < 0 || occupiedCount > capacity) {
    errors.occupiedCount = 'Occupied count cannot be negative or exceed room capacity.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateComplaintForm(payload) {
  const errors = {};
  const category = String(payload?.category || '').trim();
  const hostelId = String(payload?.hostelId || '').trim();
  const roomNumber = String(payload?.roomNumber || '').trim();
  const description = String(payload?.description || '').trim();

  if (!['Electricity', 'Plumbing', 'Water', 'Other'].includes(category)) {
    errors.category = 'Select a valid complaint category.';
  }
  if (!hostelId) {
    errors.hostelId = 'Please select your hostel.';
  }
  if (roomNumber.length < 1) {
    errors.roomNumber = 'Room number is required.';
  }
  if (description.length < 12) {
    errors.description = 'Please describe the issue in at least 12 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function canStudentApplyForRoom(student, room, hostel, existingRequests = []) {
  if (!student || !room || !hostel) {
    return { allowed: false, reason: 'Missing student, room, or hostel information.' };
  }
  if (computeAvailableSeats(room) <= 0) {
    return { allowed: false, reason: 'This room is currently full.' };
  }
  if (student.gender === 'Male' && hostel.type === 'Girls') {
    return { allowed: false, reason: 'Boys cannot apply to Girls hostels.' };
  }
  if (student.gender === 'Female' && hostel.type === 'Boys') {
    return { allowed: false, reason: 'Girls cannot apply to Boys hostels.' };
  }
  if (student.allocatedRoomId === room.id) {
    return { allowed: false, reason: 'You are already allocated to this room.' };
  }
  const hasPending = existingRequests.some(
    (req) => req.studentId === student.studentId && req.status === 'Pending'
  );
  if (hasPending) {
    return { allowed: false, reason: 'You already have a pending room request awaiting review.' };
  }
  return { allowed: true, reason: '' };
}

export function applyRequestApproval({ rooms, requests, students, requestId, adminNote = '' }) {
  const targetRequest = requests.find((r) => r.id === requestId);
  if (!targetRequest) {
    throw new Error('Room request not found.');
  }
  if (targetRequest.status !== 'Pending') {
    throw new Error(`Request ${requestId} is already ${targetRequest.status}.`);
  }

  const targetRoom = rooms.find((rm) => rm.id === targetRequest.roomId);
  if (!targetRoom) {
    throw new Error('Target room no longer exists.');
  }
  if (computeAvailableSeats(targetRoom) <= 0) {
    throw new Error(`Room ${targetRoom.roomNumber} is full and cannot accept additional occupants.`);
  }

  const updatedRooms = rooms.map((rm) => {
    if (rm.id === targetRoom.id) {
      const nextOccupied = rm.occupiedCount + 1;
      return {
        ...rm,
        occupiedCount: nextOccupied,
        status: nextOccupied >= rm.capacity ? 'Full' : 'Available',
      };
    }
    return rm;
  });

  const updatedRequests = requests.map((req) =>
    req.id === requestId
      ? {
          ...req,
          status: 'Approved',
          reviewedAt: new Date().toISOString().slice(0, 10),
          adminNote: adminNote || 'Approved by Hostel Administration.',
        }
      : req
  );

  const updatedStudents = students.map((stu) =>
    stu.studentId === targetRequest.studentId
      ? {
          ...stu,
          allocationStatus: 'Allocated',
          allocatedHostelId: targetRequest.hostelId,
          allocatedHostelName: targetRequest.hostelName,
          allocatedRoomId: targetRequest.roomId,
          allocatedRoomNumber: targetRequest.roomNumber,
          allocatedRoomType: targetRequest.roomType,
        }
      : stu
  );

  return {
    rooms: updatedRooms,
    requests: updatedRequests,
    students: updatedStudents,
  };
}
