import mongoose from 'mongoose';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { fallbackStore } from '../utils/fallbackStore.js';
import { isValidObjectId, validateHostelInput } from '../utils/validators.js';

export async function getAllHostels(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ ok: true, data: fallbackStore.listHostelsWithStats() });
    }

    const hostels = await Hostel.find().sort({ name: 1 }).lean();
    const roomStats = await Room.aggregate([
      {
        $group: {
          _id: '$hostelId',
          configuredRoomsCount: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          occupiedBeds: { $sum: '$occupiedCount' },
          availableRoomsCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map(roomStats.map((s) => [String(s._id), s]));

    const data = hostels.map((h) => {
      const stats = statsMap.get(String(h._id)) || {
        configuredRoomsCount: 0,
        totalCapacity: 0,
        occupiedBeds: 0,
        availableRoomsCount: 0,
      };
      return {
        ...h,
        configuredRoomsCount: stats.configuredRoomsCount,
        totalCapacity: stats.totalCapacity,
        occupiedBeds: stats.occupiedBeds,
        availableRoomsCount: stats.availableRoomsCount,
      };
    });

    res.status(200).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getHostelById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid hostel ID.', 400));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const hostel = state.hostels.find((h) => String(h._id) === String(req.params.id));
      if (!hostel) {
        return next(new AppError('Hostel not found.', 404));
      }
      const rooms = state.rooms
        .filter((r) => String(r.hostelId) === String(hostel._id))
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
      return res.status(200).json({ ok: true, data: { ...hostel, rooms } });
    }

    const hostel = await Hostel.findById(req.params.id).lean();
    if (!hostel) {
      return next(new AppError('Hostel not found.', 404));
    }

    const rooms = await Room.find({ hostelId: hostel._id }).sort({ roomNumber: 1 }).lean();
    res.status(200).json({ ok: true, data: { ...hostel, rooms } });
  } catch (err) {
    next(err);
  }
}

export async function createHostel(req, res, next) {
  try {
    const { valid, errors, sanitized } = validateHostelInput(req.body);
    if (!valid) {
      return next(new AppError('Hostel validation failed.', 400, errors));
    }

    if (mongoose.connection.readyState !== 1) {
      const hostel = fallbackStore.createHostel(sanitized);
      return res.status(201).json({ ok: true, data: hostel });
    }

    const hostel = await Hostel.create(sanitized);
    res.status(201).json({ ok: true, data: hostel });
  } catch (err) {
    next(err);
  }
}

export async function updateHostel(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid hostel ID.', 400));
    }

    const { valid, errors, sanitized } = validateHostelInput(req.body);
    if (!valid) {
      return next(new AppError('Hostel validation failed.', 400, errors));
    }

    if (mongoose.connection.readyState !== 1) {
      const hostel = fallbackStore.updateHostel(req.params.id, sanitized);
      if (!hostel) {
        return next(new AppError('Hostel not found.', 404));
      }
      return res.status(200).json({ ok: true, data: hostel });
    }

    const hostel = await Hostel.findByIdAndUpdate(req.params.id, sanitized, {
      new: true,
      runValidators: true,
    });

    if (!hostel) {
      return next(new AppError('Hostel not found.', 404));
    }

    res.status(200).json({ ok: true, data: hostel });
  } catch (err) {
    next(err);
  }
}

export async function deleteHostel(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid hostel ID.', 400));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const roomCount = state.rooms.filter((r) => String(r.hostelId) === String(req.params.id)).length;
      if (roomCount > 0) {
        return next(
          new AppError(
            `Cannot delete hostel with ${roomCount} active room(s). Remove or reassign rooms first.`,
            409
          )
        );
      }
      const deleted = fallbackStore.deleteHostel(req.params.id);
      if (!deleted) {
        return next(new AppError('Hostel not found.', 404));
      }
      return res.status(200).json({ ok: true, message: 'Hostel deleted successfully.' });
    }

    const roomCount = await Room.countDocuments({ hostelId: req.params.id });
    if (roomCount > 0) {
      return next(
        new AppError(
          `Cannot delete hostel with ${roomCount} active room(s). Remove or reassign rooms first.`,
          409
        )
      );
    }

    const deleted = await Hostel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return next(new AppError('Hostel not found.', 404));
    }

    res.status(200).json({ ok: true, message: 'Hostel deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
