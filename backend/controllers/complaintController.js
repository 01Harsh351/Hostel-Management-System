import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Room from '../models/Room.js';
import { AppError } from '../utils/AppError.js';
import { fallbackStore, getRoomByIdSync, populateComplaint } from '../utils/fallbackStore.js';
import { isValidObjectId, validateComplaintInput } from '../utils/validators.js';

export async function createComplaint(req, res, next) {
  try {
    const { valid, errors, sanitized } = validateComplaintInput(req.body);
    if (!valid) {
      return next(new AppError('Complaint validation failed.', 400, errors));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      let room = null;
      if (sanitized.roomId) {
        room = getRoomByIdSync(sanitized.roomId);
        if (!room) {
          return next(new AppError('Referenced room does not exist.', 404));
        }
      } else {
        room = state.rooms.find(
          (r) =>
            String(r.hostelId) === String(sanitized.hostelId) &&
            r.roomNumber.toUpperCase() === String(sanitized.roomNumber || '').toUpperCase()
        );
        if (!room) {
          return next(
            new AppError('Room number not found in the selected hostel.', 404, {
              roomNumber: 'No room with this number exists in the selected hostel.',
            })
          );
        }
      }

      const complaint = fallbackStore.createComplaint({
        studentId: req.user._id,
        roomId: room._id,
        category: sanitized.category,
        description: sanitized.description,
      });

      return res.status(201).json({ ok: true, data: populateComplaint(complaint) });
    }

    let room = null;
    if (sanitized.roomId) {
      room = await Room.findById(sanitized.roomId);
      if (!room) {
        return next(new AppError('Referenced room does not exist.', 404));
      }
    } else {
      room = await Room.findOne({
        hostelId: sanitized.hostelId,
        roomNumber: sanitized.roomNumber,
      });
      if (!room) {
        return next(
          new AppError('Room number not found in the selected hostel.', 404, {
            roomNumber: 'No room with this number exists in the selected hostel.',
          })
        );
      }
    }

    const complaint = await Complaint.create({
      studentId: req.user._id,
      roomId: room._id,
      category: sanitized.category,
      description: sanitized.description,
      status: 'Pending',
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'roomId',
        select: 'roomNumber type hostelId',
        populate: { path: 'hostelId', select: 'name type' },
      });

    res.status(201).json({ ok: true, data: populated });
  } catch (err) {
    next(err);
  }
}

export async function getMyComplaints(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const mine = state.complaints
        .filter((c) => String(c.studentId) === String(req.user._id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(populateComplaint);
      return res.status(200).json({ ok: true, data: mine });
    }

    const complaints = await Complaint.find({ studentId: req.user._id })
      .populate({
        path: 'roomId',
        select: 'roomNumber type hostelId',
        populate: { path: 'hostelId', select: 'name type' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ ok: true, data: complaints });
  } catch (err) {
    next(err);
  }
}

export async function getAllComplaints(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      let complaints = state.complaints.map(populateComplaint);
      if (req.query.status && ['Pending', 'Resolved'].includes(req.query.status)) {
        complaints = complaints.filter((c) => c.status === req.query.status);
      }
      if (req.query.category && ['Plumbing', 'Electricity', 'Water', 'Other'].includes(req.query.category)) {
        complaints = complaints.filter((c) => c.category === req.query.category);
      }
      if (req.query.search) {
        const q = String(req.query.search).trim().toLowerCase();
        complaints = complaints.filter(
          (c) =>
            (c.studentId?.name || '').toLowerCase().includes(q) ||
            (c.roomId?.roomNumber || '').toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q)
        );
      }
      complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.status(200).json({ ok: true, data: complaints });
    }

    const query = {};
    if (req.query.status && ['Pending', 'Resolved'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.category && ['Plumbing', 'Electricity', 'Water', 'Other'].includes(req.query.category)) {
      query.category = req.query.category;
    }

    let complaints = await Complaint.find(query)
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'roomId',
        select: 'roomNumber type hostelId',
        populate: { path: 'hostelId', select: 'name type' },
      })
      .sort({ createdAt: -1 })
      .lean();

    if (req.query.search) {
      const q = String(req.query.search).trim().toLowerCase();
      complaints = complaints.filter(
        (c) =>
          (c.studentId?.name || '').toLowerCase().includes(q) ||
          (c.roomId?.roomNumber || '').toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    res.status(200).json({ ok: true, data: complaints });
  } catch (err) {
    next(err);
  }
}

export async function resolveComplaint(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid complaint ID.', 400));
    }

    const resolutionNote = String(req.body?.resolutionNote || '').trim();

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const existing = state.complaints.find((c) => String(c._id) === String(req.params.id));
      if (!existing) return next(new AppError('Complaint not found.', 404));
      if (existing.status === 'Resolved') {
        return next(new AppError('Complaint is already marked as Resolved.', 409));
      }
      const updated = fallbackStore.updateComplaint(req.params.id, {
        status: 'Resolved',
        resolutionNote: resolutionNote || 'Resolved by Maintenance Engineering Desk.',
      });
      return res.status(200).json({ ok: true, data: populateComplaint(updated) });
    }

    const updated = await Complaint.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      {
        $set: {
          status: 'Resolved',
          resolutionNote: resolutionNote || 'Resolved by Maintenance Engineering Desk.',
        },
      },
      { new: true }
    )
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'roomId',
        select: 'roomNumber type hostelId',
        populate: { path: 'hostelId', select: 'name type' },
      });

    if (!updated) {
      const existing = await Complaint.findById(req.params.id);
      if (!existing) return next(new AppError('Complaint not found.', 404));
      return next(new AppError('Complaint is already marked as Resolved.', 409));
    }

    res.status(200).json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateComplaint(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return next(new AppError('Invalid complaint ID.', 400));
    }

    const nextStatus = req.body?.status ? String(req.body.status).trim() : 'Resolved';
    if (!['Pending', 'Resolved'].includes(nextStatus)) {
      return next(new AppError('Complaint status must be Pending or Resolved.', 400));
    }

    if (mongoose.connection.readyState !== 1) {
      const state = fallbackStore.getState();
      const existing = state.complaints.find((c) => String(c._id) === String(req.params.id));
      if (!existing) return next(new AppError('Complaint not found.', 404));

      const resolutionNote =
        req.body?.resolutionNote !== undefined
          ? String(req.body.resolutionNote).trim()
          : existing.resolutionNote || (nextStatus === 'Resolved' ? 'Resolved by Maintenance Engineering Desk.' : '');

      const updated = fallbackStore.updateComplaint(req.params.id, {
        status: nextStatus,
        resolutionNote:
          nextStatus === 'Resolved' && !resolutionNote
            ? 'Resolved by Maintenance Engineering Desk.'
            : resolutionNote,
      });
      return res.status(200).json({ ok: true, data: populateComplaint(updated) });
    }

    const existing = await Complaint.findById(req.params.id);
    if (!existing) {
      return next(new AppError('Complaint not found.', 404));
    }

    const resolutionNote =
      req.body?.resolutionNote !== undefined
        ? String(req.body.resolutionNote).trim()
        : existing.resolutionNote || (nextStatus === 'Resolved' ? 'Resolved by Maintenance Engineering Desk.' : '');

    existing.status = nextStatus;
    existing.resolutionNote =
      nextStatus === 'Resolved' && !resolutionNote
        ? 'Resolved by Maintenance Engineering Desk.'
        : resolutionNote;

    await existing.save();

    const populated = await Complaint.findById(existing._id)
      .populate('studentId', 'name email studentId')
      .populate({
        path: 'roomId',
        select: 'roomNumber type hostelId',
        populate: { path: 'hostelId', select: 'name type' },
      });

    res.status(200).json({ ok: true, data: populated });
  } catch (err) {
    next(err);
  }
}
