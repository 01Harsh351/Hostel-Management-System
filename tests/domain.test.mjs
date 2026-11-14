import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRequestApproval,
  canStudentApplyForRoom,
  computeAvailableSeats,
  computeDashboardSummary,
  computeRoomStatus,
  getRoomCapacityByType,
  validateComplaintForm,
  validateHostelForm,
  validateRoomForm,
  validateStudentRegistration,
} from '../frontend/js/domain.js';

test('room capacity and availability calculations', () => {
  assert.equal(getRoomCapacityByType('Single'), 1);
  assert.equal(getRoomCapacityByType('Double'), 2);
  assert.equal(getRoomCapacityByType('Triple'), 3);

  assert.equal(computeAvailableSeats({ capacity: 3, occupiedCount: 1 }), 2);
  assert.equal(computeAvailableSeats({ capacity: 2, occupiedCount: 2 }), 0);
  assert.equal(computeRoomStatus({ capacity: 2, occupiedCount: 1 }), 'Available');
  assert.equal(computeRoomStatus({ capacity: 2, occupiedCount: 2 }), 'Full');
});

test('student registration validation enforces all mandatory fields', () => {
  const invalid = validateStudentRegistration({
    fullName: 'A',
    email: 'invalid-email',
    studentId: '12',
    contactNumber: '123',
    gender: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.studentId);
  assert.ok(invalid.errors.contactNumber);
  assert.ok(invalid.errors.gender);

  const valid = validateStudentRegistration({
    fullName: 'Priya Nair',
    email: 'priya.nair@university.edu',
    studentId: 'STU-2026-501',
    contactNumber: '9876543210',
    gender: 'Female',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('hostel, room, and complaint form validation catches bad inputs', () => {
  assert.equal(validateHostelForm({ name: 'A', type: 'Mixed', address: '12', totalRooms: 0 }).valid, false);
  assert.equal(
    validateHostelForm({ name: 'North Hall', type: 'Boys', address: 'Sector 2 Campus', totalRooms: 50 }).valid,
    true
  );

  assert.equal(
    validateRoomForm({ hostelId: 'HST-01', roomNumber: 'N-101', roomType: 'Double', capacity: 2, occupiedCount: 3 }).valid,
    false
  );
  assert.equal(
    validateRoomForm({ hostelId: 'HST-01', roomNumber: 'N-101', roomType: 'Double', capacity: 2, occupiedCount: 1 }).valid,
    true
  );

  assert.equal(
    validateComplaintForm({ category: 'Unknown', hostelId: '', roomNumber: '', description: 'short' }).valid,
    false
  );
  assert.equal(
    validateComplaintForm({
      category: 'Electricity',
      hostelId: 'HST-01',
      roomNumber: 'N-101',
      description: 'Ceiling fan regulator is making loud humming noise.',
    }).valid,
    true
  );
});

test('room application eligibility checks gender compatibility, capacity, and duplicate pending requests', () => {
  const maleStudent = { studentId: 'STU-1', gender: 'Male', allocatedRoomId: '' };
  const girlsHostel = { id: 'HST-2', type: 'Girls' };
  const boysHostel = { id: 'HST-1', type: 'Boys' };
  const availableRoom = { id: 'RM-1', capacity: 2, occupiedCount: 1 };
  const fullRoom = { id: 'RM-2', capacity: 2, occupiedCount: 2 };

  assert.equal(canStudentApplyForRoom(maleStudent, availableRoom, girlsHostel, []).allowed, false);
  assert.equal(canStudentApplyForRoom(maleStudent, fullRoom, boysHostel, []).allowed, false);
  assert.equal(
    canStudentApplyForRoom(maleStudent, availableRoom, boysHostel, [{ studentId: 'STU-1', status: 'Pending' }]).allowed,
    false
  );
  assert.equal(canStudentApplyForRoom(maleStudent, availableRoom, boysHostel, []).allowed, true);
});

test('approving a room request increments room occupancy and updates student allocation', () => {
  const state = applyRequestApproval({
    rooms: [{ id: 'RM-10', roomNumber: 'N-205', capacity: 2, occupiedCount: 1, status: 'Available' }],
    requests: [
      {
        id: 'REQ-1',
        studentId: 'STU-1',
        hostelId: 'HST-1',
        hostelName: 'North Hall',
        roomId: 'RM-10',
        roomNumber: 'N-205',
        roomType: 'Double',
        status: 'Pending',
      },
    ],
    students: [{ studentId: 'STU-1', allocationStatus: 'Unallocated' }],
    requestId: 'REQ-1',
  });

  assert.equal(state.rooms[0].occupiedCount, 2);
  assert.equal(state.rooms[0].status, 'Full');
  assert.equal(state.requests[0].status, 'Approved');
  assert.equal(state.students[0].allocationStatus, 'Allocated');
  assert.equal(state.students[0].allocatedRoomNumber, 'N-205');
});

test('dashboard KPI summary aggregates hostels, rooms, requests, and complaints accurately', () => {
  const summary = computeDashboardSummary({
    hostels: [{ id: 'H1' }, { id: 'H2' }],
    rooms: [
      { capacity: 2, occupiedCount: 2 },
      { capacity: 2, occupiedCount: 1 },
      { capacity: 1, occupiedCount: 0 },
    ],
    requests: [{ status: 'Pending' }, { status: 'Approved' }, { status: 'Rejected' }],
    complaints: [{ status: 'Pending' }, { status: 'Resolved' }],
  });

  assert.equal(summary.totalHostels, 2);
  assert.equal(summary.totalRooms, 3);
  assert.equal(summary.occupiedRooms, 2);
  assert.equal(summary.availableRooms, 2);
  assert.equal(summary.fullRooms, 1);
  assert.equal(summary.pendingRequests, 1);
  assert.equal(summary.activeComplaints, 1);
  assert.equal(summary.occupancyRate, 60);
});
