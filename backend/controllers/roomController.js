import mongoose from 'mongoose';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { fallbackStore, getHostelByIdSync, populateRoom } from '../utils/fallbackStore.js';
import { isValidObjectId, validateRoomInput } from '../utils/validators.js';

export async function getRooms(req, res, next) {
  try {
    if (req.query.hostelId && !isValidObjectId(req.query.hostelId)) {
      return next(new AppError('Invalid hostelId filter.', 400));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      let rooms = state.rooms.map(populateRoom);

      if (req.query.hostelId) {
        rooms = rooms.filter((r) => String(r.hostelId?._id || r.hostelId) === String(req.query.hostelId));
      }
      if (req.query.type && ['Single', 'Double', 'Triple'].includes(req.query.type)) {
        rooms = rooms.filter((r) => r.type === req.query.type);
      }
      if (req.query.status && ['Available', 'Full'].includes(req.query.status)) {
        rooms = rooms.filter((r) => r.status === req.query.status);
      }
      if (req.query.hostelType && ['Boys', 'Girls'].includes(req.query.hostelType)) {
        rooms = rooms.filter((r) => r.hostelId && r.hostelId.type === req.query.hostelType);
      }
      if (req.query.search) {
        const q = String(req.query.search).trim().toLowerCase();
        rooms = rooms.filter(
          (r) =>
            r.roomNumber.toLowerCase().includes(q) ||
            (r.hostelId?.name || '').toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q)
        );
      }

      rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
      return res.status(200).json({ ok: true, data: rooms });
    }

    const query = {};
    if (req.query.hostelId) {
      query.hostelId = req.query.hostelId;
    }
    if (req.query.type && ['Single', 'Double', 'Triple'].includes(req.query.type)) {
      query.type = req.query.type;
    }
    if (req.query.status && ['Available', 'Full'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    let rooms = await Room.find(query)
      .populate('hostelId', 'name type address')
      .sort({ roomNumber: 1 })
      .lean();

    if (req.query.hostelType && ['Boys', 'Girls'].includes(req.query.hostelType)) {
      rooms = rooms.filter((r) => r.hostelId && r.hostelId.type === req.query.hostelType);
    }

    if (req.query.search) {
      const q = String(req.query.search).trim().toLowerCase();
      rooms = rooms.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          (r.hostelId?.name || '').toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    }

    const enriched = rooms.map((r) => ({
      ...r,
      availableSeats: Math.max(0, r.capacity - r.occupiedCount),
    }));

    res.status(200).json({ ok: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getAvailableRooms(req, res, next) {
  req.query.status = 'Available';
  return getRooms(req, res, next);
}

export async function getRoomById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid room ID.', 400));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const room = state.rooms.find((r) => String(r._id) === String(req.params.id));
      if (!room) {
        return next(new AppError('Room not found.', 404));
      }
      return res.status(200).json({ ok: true, data: populateRoom(room) });
    }

    const room = await Room.findById(req.params.id)
      .populate('hostelId', 'name type address warden')
      .lean();

    if (!room) {
      return next(new AppError('Room not found.', 404));
    }

    res.status(200).json({
      ok: true,
      data: {
        ...room,
        availableSeats: Math.max(0, room.capacity - room.occupiedCount),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createRoom(req, res, next) {
  try {
    const { valid, errors, sanitized } = validateRoomInput(req.body);
    if (!valid) {
      return next(new AppError('Room validation failed.', 400, errors));
    }

    if (mongoose.connection.readyState !== 1) {
      const hostel = getHostelByIdSync(sanitized.hostelId);
      if (!hostel) {
        return next(new AppError('Referenced hostel does not exist.', 404));
      }
      const room = fallbackStore.createRoom(sanitized);
      return res.status(201).json({ ok: true, data: populateRoom(room) });
    }

    const hostel = await Hostel.findById(sanitized.hostelId);
    if (!hostel) {
      return next(new AppError('Referenced hostel does not exist.', 404));
    }

    const room = await Room.create({
      ...sanitized,
      status: sanitized.occupiedCount >= sanitized.capacity ? 'Full' : 'Available',
    });

    const populated = await room.populate('hostelId', 'name type address');
    res.status(201).json({ ok: true, data: populated });
  } catch (err) {
    next(err);
  }
}

export async function updateRoom(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid room ID.', 400));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const existing = state.rooms.find((r) => String(r._id) === String(req.params.id));
      if (!existing) {
        return next(new AppError('Room not found.', 404));
      }

      const mergedPayload = {
        hostelId: req.body.hostelId ?? String(existing.hostelId),
        roomNumber: req.body.roomNumber ?? existing.roomNumber,
        type: req.body.type ?? req.body.roomType ?? existing.type,
        capacity: req.body.capacity ?? existing.capacity,
        occupiedCount: req.body.occupiedCount ?? existing.occupiedCount,
        floor: req.body.floor ?? existing.floor,
      };

      const { valid, errors, sanitized } = validateRoomInput(mergedPayload);
      if (!valid) {
        return next(new AppError('Room validation failed.', 400, errors));
      }
      if (!getHostelByIdSync(sanitized.hostelId)) {
        return next(new AppError('Referenced hostel does not exist.', 404));
      }

      const updated = fallbackStore.updateRoom(req.params.id, sanitized);
      return res.status(200).json({ ok: true, data: populateRoom(updated) });
    }

    const existing = await Room.findById(req.params.id);
    if (!existing) {
      return next(new AppError('Room not found.', 404));
    }

    const mergedPayload = {
      hostelId: req.body.hostelId ?? String(existing.hostelId),
      roomNumber: req.body.roomNumber ?? existing.roomNumber,
      type: req.body.type ?? req.body.roomType ?? existing.type,
      capacity: req.body.capacity ?? existing.capacity,
      occupiedCount: req.body.occupiedCount ?? existing.occupiedCount,
      floor: req.body.floor ?? existing.floor,
    };

    const { valid, errors, sanitized } = validateRoomInput(mergedPayload);
    if (!valid) {
      return next(new AppError('Room validation failed.', 400, errors));
    }

    const hostel = await Hostel.findById(sanitized.hostelId);
    if (!hostel) {
      return next(new AppError('Referenced hostel does not exist.', 404));
    }

    existing.hostelId = sanitized.hostelId;
    existing.roomNumber = sanitized.roomNumber;
    existing.type = sanitized.type;
    existing.capacity = sanitized.capacity;
    existing.occupiedCount = sanitized.occupiedCount;
    existing.floor = sanitized.floor;

    await existing.save();
    const populated = await existing.populate('hostelId', 'name type address');

    res.status(200).json({ ok: true, data: populated });
  } catch (err) {
    next(err);
  }
}
