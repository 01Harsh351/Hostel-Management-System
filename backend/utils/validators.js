import mongoose from 'mongoose';

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ''));
}

export function validateRegisterInput(body = {}) {
  const errors = {};
  const name = String(body.name || body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const studentId = String(body.studentId || '').trim().toUpperCase();
  const contact = String(body.contact || body.contactNumber || '').trim();
  const gender = String(body.gender || '').trim();

  if (name.length < 2) errors.name = 'Full name must be at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Valid university email is required.';
  if (password && password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (!/^[A-Z0-9\-]{4,20}$/.test(studentId)) errors.studentId = 'Student ID must be 4–20 alphanumeric characters.';
  if (contact && !/^\d{10,15}$/.test(contact.replace(/[\s\-()+]/g, ''))) {
    errors.contact = 'Contact must be 10–15 digits.';
  }
  if (!['Male', 'Female', 'Other'].includes(gender)) errors.gender = 'Gender must be Male, Female, or Other.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: { name, email, password, studentId, contact, gender },
  };
}

export function validateLoginInput(body = {}) {
  const errors = {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Valid email is required.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: { email, password },
  };
}

export function validateHostelInput(body = {}) {
  const errors = {};
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const address = String(body.address || '').trim();
  const totalRooms = Number(body.totalRooms);
  const warden = String(body.warden || '').trim();

  if (name.length < 3) errors.name = 'Hostel name must be at least 3 characters.';
  if (!['Boys', 'Girls'].includes(type)) errors.type = 'Hostel type must be Boys or Girls.';
  if (address.length < 5) errors.address = 'Address must be at least 5 characters.';
  if (!Number.isInteger(totalRooms) || totalRooms < 1 || totalRooms > 5000) {
    errors.totalRooms = 'totalRooms must be an integer between 1 and 5000.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: { name, type, address, totalRooms, warden: warden || 'Assigned Hostel Warden' },
  };
}

export function validateRoomInput(body = {}) {
  const errors = {};
  const hostelId = String(body.hostelId || '').trim();
  const roomNumber = String(body.roomNumber || '').trim().toUpperCase();
  const type = String(body.type || body.roomType || '').trim();
  const capacity = Number(body.capacity);
  const occupiedCount = body.occupiedCount === undefined ? 0 : Number(body.occupiedCount);
  const floor = String(body.floor || '1st Floor').trim();

  if (!isValidObjectId(hostelId)) errors.hostelId = 'Valid hostelId is required.';
  if (!/^[A-Z0-9\-]{1,20}$/.test(roomNumber)) errors.roomNumber = 'Room number must be 1–20 alphanumeric characters.';
  if (!['Single', 'Double', 'Triple'].includes(type)) errors.type = 'Room type must be Single, Double, or Triple.';
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 6) errors.capacity = 'Capacity must be 1–6.';
  if (!Number.isInteger(occupiedCount) || occupiedCount < 0 || occupiedCount > capacity) {
    errors.occupiedCount = 'occupiedCount must be between 0 and room capacity.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: { hostelId, roomNumber, type, capacity, occupiedCount, floor },
  };
}

export function validateComplaintInput(body = {}) {
  const errors = {};
  const roomId = String(body.roomId || '').trim();
  const hostelId = String(body.hostelId || '').trim();
  const roomNumber = String(body.roomNumber || '').trim().toUpperCase();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();

  if (roomId) {
    if (!isValidObjectId(roomId)) {
      errors.roomId = 'Valid roomId is required.';
    }
  } else {
    if (!isValidObjectId(hostelId)) {
      errors.hostelId = 'Please select a valid hostel.';
    }
    if (!roomNumber) {
      errors.roomNumber = 'Room number is required.';
    }
  }

  if (!['Plumbing', 'Electricity', 'Water', 'Other'].includes(category)) {
    errors.category = 'Category must be Plumbing, Electricity, Water, or Other.';
  }
  if (description.length < 10) errors.description = 'Description must be at least 10 characters.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: { roomId, hostelId, roomNumber, category, description },
  };
}

export function validateProfileUpdateInput(body = {}) {
  const errors = {};
  const name = String(body.name ?? body.fullName ?? '').trim();
  const contact = String(body.contact ?? body.contactNumber ?? '').trim();
  const department = String(body.department ?? '').trim();
  const year = String(body.year ?? '').trim();

  if (name.length < 2) errors.fullName = 'Full name must be at least 2 characters.';
  if (contact && !/^\d{10,15}$/.test(contact.replace(/[\s\-()+]/g, ''))) {
    errors.contactNumber = 'Contact must be 10–15 digits.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name,
      contact,
      ...(department ? { department } : {}),
      ...(year ? { year } : {}),
    },
  };
}
