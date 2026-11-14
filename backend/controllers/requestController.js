import mongoose from 'mongoose';
import Hostel from '../models/Hostel.js';
import Request from '../models/Request.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  fallbackStore,
  getHostelByIdSync,
  getRoomByIdSync,
  populateRequest,
} from '../utils/fallbackStore.js';
import { isValidObjectId } from '../utils/validators.js';

function isTransactionUnsupportedError(err) {
  const msg = String(err?.message || '');
  return (
    err?.code === 20 ||
    err?.codeName === 'IllegalOperation' ||
    msg.includes('Transaction numbers are only allowed on a replica set') ||
    msg.includes('does not support transactions')
  );
}

/**
 * Student submits a room allocation request.
 * Identity is strictly derived from verified JWT user (req.user._id).
 * Never increments room occupancy on request creation.
 */
export async function createRoomRequest(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const student = fallbackStore.findUserById(req.user._id);
      if (!student || student.role !== 'student') {
        return next(new AppError('Only registered students can apply for hostel rooms.', 403));
      }

      const { hostelId, roomId, notes = '' } = req.body || {};
      if (!isValidObjectId(roomId)) {
        return next(new AppError('A valid roomId is required.', 400));
      }
      if (hostelId && !isValidObjectId(hostelId)) {
        return next(new AppError('Invalid hostelId provided.', 400));
      }

      const room = getRoomByIdSync(roomId);
      if (!room) {
        return next(new AppError('Selected room does not exist.', 404));
      }

      const resolvedHostelId = hostelId || room.hostelId;
      const hostel = getHostelByIdSync(resolvedHostelId);
      if (!hostel) {
        return next(new AppError('Selected hostel does not exist.', 404));
      }
      if (String(room.hostelId) !== String(hostel._id)) {
        return next(new AppError('Selected room does not belong to the chosen hostel.', 400));
      }
      if (student.allocatedRoomId && String(student.allocatedRoomId) === String(room._id)) {
        return next(new AppError('You are already allocated to this room.', 409));
      }
      if (student.gender === 'Male' && hostel.type === 'Girls') {
        return next(new AppError('Male students cannot apply to Girls hostels.', 400));
      }
      if (student.gender === 'Female' && hostel.type === 'Boys') {
        return next(new AppError('Female students cannot apply to Boys hostels.', 400));
      }
      if (room.occupiedCount >= room.capacity || room.status === 'Full') {
        return next(new AppError('Selected room has no available seats.', 409));
      }

      const existingPending = state.requests.find(
        (r) => String(r.studentId) === String(student._id) && r.status === 'Pending'
      );
      if (existingPending) {
        return next(new AppError('You already have a Pending room allocation request.', 409));
      }

      const created = fallbackStore.createRequest({
        studentId: student._id,
        hostelId: hostel._id,
        roomId: room._id,
        notes,
      });

      return res.status(201).json({ ok: true, data: populateRequest(created) });
    }

    const student = await User.findById(req.user._id);
    if (!student || student.role !== 'student') {
      return next(new AppError('Only registered students can apply for hostel rooms.', 403));
    }

    const { hostelId, roomId, notes = '' } = req.body || {};
    if (!isValidObjectId(roomId)) {
      return next(new AppError('A valid roomId is required.', 400));
    }
    if (hostelId && !isValidObjectId(hostelId)) {
      return next(new AppError('Invalid hostelId provided.', 400));
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return next(new AppError('Selected room does not exist.', 404));
    }

    const resolvedHostelId = hostelId || room.hostelId;
    const hostel = await Hostel.findById(resolvedHostelId);
    if (!hostel) {
      return next(new AppError('Selected hostel does not exist.', 404));
    }
    if (String(room.hostelId) !== String(hostel._id)) {
      return next(new AppError('Selected room does not belong to the chosen hostel.', 400));
    }
    if (student.allocatedRoomId && String(student.allocatedRoomId) === String(room._id)) {
      return next(new AppError('You are already allocated to this room.', 409));
    }
    if (student.gender === 'Male' && hostel.type === 'Girls') {
      return next(new AppError('Male students cannot apply to Girls hostels.', 400));
    }
    if (student.gender === 'Female' && hostel.type === 'Boys') {
      return next(new AppError('Female students cannot apply to Boys hostels.', 400));
    }
    if (room.occupiedCount >= room.capacity || room.status === 'Full') {
      return next(new AppError('Selected room has no available seats.', 409));
    }

    const existingPending = await Request.findOne({
      studentId: student._id,
      status: 'Pending',
    });
    if (existingPending) {
      return next(new AppError('You already have a Pending room allocation request.', 409));
    }

    const created = await Request.create({
      studentId: student._id,
      hostelId: hostel._id,
      roomId: room._id,
      status: 'Pending',
      notes: String(notes || '').trim(),
    });

    const populated = await Request.findById(created._id)
      .populate('studentId', 'name email studentId contact gender')
      .populate('hostelId', 'name type address')
      .populate('roomId', 'roomNumber type capacity occupiedCount status');

    res.status(201).json({ ok: true, data: populated });
  } catch (err) {
    next(err);
  }
}

export async function getMyRequests(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const mine = state.requests
        .filter((r) => String(r.studentId) === String(req.user._id))
        .sort((a, b) => new Date(b.requestedDate || b.createdAt).getTime() - new Date(a.requestedDate || a.createdAt).getTime())
        .map(populateRequest);
      return res.status(200).json({ ok: true, data: mine });
    }

    const requests = await Request.find({ studentId: req.user._id })
      .populate('hostelId', 'name type address')
      .populate('roomId', 'roomNumber type capacity occupiedCount status')
      .sort({ requestedDate: -1 })
      .lean();

    res.status(200).json({ ok: true, data: requests });
  } catch (err) {
    next(err);
  }
}

export async function getAllRequests(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      let requests = state.requests.map(populateRequest);
      if (req.query.status && ['Pending', 'Approved', 'Rejected'].includes(req.query.status)) {
        requests = requests.filter((r) => r.status === req.query.status);
      }
      if (req.query.search) {
        const q = String(req.query.search).trim().toLowerCase();
        requests = requests.filter(
          (r) =>
            (r.studentId?.name || '').toLowerCase().includes(q) ||
            (r.studentId?.studentId || '').toLowerCase().includes(q) ||
            (r.roomId?.roomNumber || '').toLowerCase().includes(q) ||
            (r.hostelId?.name || '').toLowerCase().includes(q)
        );
      }
      requests.sort(
        (a, b) => new Date(b.requestedDate || b.createdAt).getTime() - new Date(a.requestedDate || a.createdAt).getTime()
      );
      return res.status(200).json({ ok: true, data: requests });
    }

    const query = {};
    if (req.query.status && ['Pending', 'Approved', 'Rejected'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    let requests = await Request.find(query)
      .populate('studentId', 'name email studentId contact gender')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber type capacity occupiedCount status')
      .sort({ requestedDate: -1 })
      .lean();

    if (req.query.search) {
      const q = String(req.query.search).trim().toLowerCase();
      requests = requests.filter(
        (r) =>
          (r.studentId?.name || '').toLowerCase().includes(q) ||
          (r.studentId?.studentId || '').toLowerCase().includes(q) ||
          (r.roomId?.roomNumber || '').toLowerCase().includes(q) ||
          (r.hostelId?.name || '').toLowerCase().includes(q)
      );
    }

    res.status(200).json({ ok: true, data: requests });
  } catch (err) {
    next(err);
  }
}

async function approveWithTransaction(requestId, adminNote) {
  const session = await mongoose.startSession();
  try {
    let approvedRequest = null;

    await session.withTransaction(async () => {
      const requestDoc = await Request.findOneAndUpdate(
        { _id: requestId, status: 'Pending' },
        {
          $set: {
            status: 'Approved',
            adminNote: adminNote || 'Approved by Hostel Administration.',
          },
        },
        { new: true, session }
      );

      if (!requestDoc) {
        const existing = await Request.findById(requestId).session(session);
        if (!existing) throw new AppError('Room request not found.', 404);
        throw new AppError(`Request is already ${existing.status} and cannot be approved again.`, 409);
      }

      const updatedRoom = await Room.findOneAndUpdate(
        {
          _id: requestDoc.roomId,
          $expr: { $lt: ['$occupiedCount', '$capacity'] },
        },
        { $inc: { occupiedCount: 1 } },
        { new: true, session }
      );

      if (!updatedRoom) {
        throw new AppError('Room is already at full capacity.', 409);
      }

      if (updatedRoom.occupiedCount >= updatedRoom.capacity && updatedRoom.status !== 'Full') {
        updatedRoom.status = 'Full';
        await updatedRoom.save({ session });
      }

      await User.findByIdAndUpdate(
        requestDoc.studentId,
        {
          $set: {
            allocatedHostelId: requestDoc.hostelId,
            allocatedRoomId: requestDoc.roomId,
          },
        },
        { session }
      );

      approvedRequest = requestDoc;
    });

    return approvedRequest;
  } finally {
    await session.endSession();
  }
}

async function approveWithAtomicFallback(requestId, adminNote) {
  const claimedRequest = await Request.findOneAndUpdate(
    { _id: requestId, status: 'Pending' },
    {
      $set: {
        status: 'Approved',
        adminNote: adminNote || 'Approved by Hostel Administration.',
      },
    },
    { new: true }
  );

  if (!claimedRequest) {
    const existing = await Request.findById(requestId);
    if (!existing) throw new AppError('Room request not found.', 404);
    throw new AppError(`Request is already ${existing.status} and cannot be approved again.`, 409);
  }

  const updatedRoom = await Room.findOneAndUpdate(
    {
      _id: claimedRequest.roomId,
      $expr: { $lt: ['$occupiedCount', '$capacity'] },
    },
    { $inc: { occupiedCount: 1 } },
    { new: true }
  );

  if (!updatedRoom) {
    await Request.findByIdAndUpdate(requestId, {
      $set: { status: 'Pending', adminNote: '' },
    });
    throw new AppError('Room is already at full capacity.', 409);
  }

  if (updatedRoom.occupiedCount >= updatedRoom.capacity && updatedRoom.status !== 'Full') {
    await Room.findByIdAndUpdate(updatedRoom._id, { $set: { status: 'Full' } });
  }

  await User.findByIdAndUpdate(claimedRequest.studentId, {
    $set: {
      allocatedHostelId: claimedRequest.hostelId,
      allocatedRoomId: claimedRequest.roomId,
    },
  });

  return claimedRequest;
}

export async function approveRoomRequest(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid request ID.', 400));
    }

    const adminNote = String(req.body?.adminNote || '').trim();

    if (mongoose.connection.readyState !== 1) {
      const outcome = fallbackStore.approveRequest(req.params.id, adminNote);
      if (outcome.error === 'not_found') return next(new AppError('Room request not found.', 404));
      if (outcome.error === 'already_processed') {
        return next(new AppError(`Request is already ${outcome.status} and cannot be approved again.`, 409));
      }
      if (outcome.error === 'room_full') {
        return next(new AppError('Room is already at full capacity.', 409));
      }
      return res.status(200).json({ ok: true, data: populateRequest(outcome.request) });
    }

    let approved;

    try {
      approved = await approveWithTransaction(req.params.id, adminNote);
    } catch (err) {
      if (isTransactionUnsupportedError(err)) {
        approved = await approveWithAtomicFallback(req.params.id, adminNote);
      } else {
        throw err;
      }
    }

    const populated = await Request.findById(approved._id)
      .populate('studentId', 'name email studentId')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber type capacity occupiedCount status');

    res.status(200).json({ ok: true, data: populated });
  } catch (err) {
    next(err);
  }
}

export async function rejectRoomRequest(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid request ID.', 400));
    }

    const adminNote = String(req.body?.adminNote || req.body?.reason || '').trim();

    if (mongoose.connection.readyState !== 1) {
      const outcome = fallbackStore.rejectRequest(req.params.id, adminNote);
      if (outcome.error === 'not_found') return next(new AppError('Room request not found.', 404));
      if (outcome.error === 'already_processed') {
        return next(new AppError(`Request is already ${outcome.status}.`, 409));
      }
      return res.status(200).json({ ok: true, data: populateRequest(outcome.request) });
    }

    const rejected = await Request.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      {
        $set: {
          status: 'Rejected',
          adminNote: adminNote || 'Rejected by Hostel Administration.',
        },
      },
      { new: true }
    )
      .populate('studentId', 'name email studentId')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber type capacity occupiedCount status');

    if (!rejected) {
      const existing = await Request.findById(req.params.id);
      if (!existing) return next(new AppError('Room request not found.', 404));
      return next(new AppError(`Request is already ${existing.status}.`, 409));
    }

    res.status(200).json({ ok: true, data: rejected });
  } catch (err) {
    next(err);
  }
}
