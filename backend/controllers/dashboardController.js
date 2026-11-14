import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Hostel from '../models/Hostel.js';
import Request from '../models/Request.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import {
  fallbackStore,
  populateComplaint,
  populateRequest,
  populateRoom,
  populateUser,
  resetFallbackStore,
} from '../utils/fallbackStore.js';
import { seedSampleCampusData } from '../utils/seedSampleData.js';

export async function getAdminDashboardSummary(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      const totalStudents = s.users.filter((u) => u.role === 'student').length;
      const totalHostels = s.hostels.length;
      const totalRooms = s.rooms.length;
      const occupiedRooms = s.rooms.filter((r) => r.occupiedCount > 0).length;
      const availableRooms = s.rooms.filter((r) => r.status === 'Available').length;
      const fullRooms = s.rooms.filter((r) => r.status === 'Full').length;
      const totalCapacity = s.rooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
      const totalOccupiedBeds = s.rooms.reduce((sum, r) => sum + Number(r.occupiedCount || 0), 0);
      const availableBeds = Math.max(0, totalCapacity - totalOccupiedBeds);
      const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupiedBeds / totalCapacity) * 100) : 0;

      const hostelOccupancy = [...s.hostels]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((h) => {
          const hRooms = s.rooms.filter((r) => String(r.hostelId) === String(h._id));
          const capacity = hRooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
          const occupied = hRooms.reduce((sum, r) => sum + Number(r.occupiedCount || 0), 0);
          return {
            hostelId: h._id,
            name: h.name,
            type: h.type,
            capacity,
            occupied,
            pct: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
          };
        });

      const pendingRequests = s.requests.filter((r) => r.status === 'Pending').length;
      const approvedRequests = s.requests.filter((r) => r.status === 'Approved').length;
      const rejectedRequests = s.requests.filter((r) => r.status === 'Rejected').length;
      const activeComplaints = s.complaints.filter((c) => c.status === 'Pending').length;
      const resolvedComplaints = s.complaints.filter((c) => c.status === 'Resolved').length;

      const pendingQueue = s.requests
        .filter((r) => r.status === 'Pending')
        .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime())
        .slice(0, 5)
        .map(populateRequest);

      const recentRequests = [...s.requests]
        .sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime())
        .slice(0, 5)
        .map(populateRequest);

      const recentComplaints = [...s.complaints]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(populateComplaint);

      return res.status(200).json({
        ok: true,
        data: {
          summary: {
            totalStudents,
            totalHostels,
            totalRooms,
            occupiedRooms,
            availableRooms,
            fullRooms,
            availableBeds,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            activeComplaints,
            resolvedComplaints,
            totalCapacity,
            totalOccupiedBeds,
            occupancyRate,
          },
          hostelOccupancy,
          pendingQueue,
          recentRequests,
          recentComplaints,
        },
      });
    }

    const [
      totalStudents,
      totalHostels,
      roomAgg,
      requestCounts,
      complaintCounts,
      hostels,
      roomsByHostel,
      pendingQueue,
      recentRequests,
      recentComplaints,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Hostel.countDocuments(),
      Room.aggregate([
        {
          $group: {
            _id: null,
            totalRooms: { $sum: 1 },
            occupiedRooms: { $sum: { $cond: [{ $gt: ['$occupiedCount', 0] }, 1, 0] } },
            availableRooms: { $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] } },
            fullRooms: { $sum: { $cond: [{ $eq: ['$status', 'Full'] }, 1, 0] } },
            totalCapacity: { $sum: '$capacity' },
            totalOccupiedBeds: { $sum: '$occupiedCount' },
          },
        },
      ]),
      Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Hostel.find().sort({ name: 1 }).lean(),
      Room.aggregate([
        {
          $group: {
            _id: '$hostelId',
            capacity: { $sum: '$capacity' },
            occupied: { $sum: '$occupiedCount' },
          },
        },
      ]),
      Request.find({ status: 'Pending' })
        .populate('studentId', 'name studentId email gender')
        .populate('hostelId', 'name type')
        .populate('roomId', 'roomNumber type capacity occupiedCount status')
        .sort({ requestedDate: 1 })
        .limit(5)
        .lean(),
      Request.find()
        .populate('studentId', 'name studentId')
        .populate('hostelId', 'name')
        .populate('roomId', 'roomNumber type')
        .sort({ requestedDate: -1 })
        .limit(5)
        .lean(),
      Complaint.find()
        .populate('studentId', 'name studentId')
        .populate({
          path: 'roomId',
          select: 'roomNumber hostelId',
          populate: { path: 'hostelId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const rStats = roomAgg[0] || {
      totalRooms: 0,
      occupiedRooms: 0,
      availableRooms: 0,
      fullRooms: 0,
      totalCapacity: 0,
      totalOccupiedBeds: 0,
    };

    const reqMap = Object.fromEntries(requestCounts.map((r) => [r._id, r.count]));
    const cmpMap = Object.fromEntries(complaintCounts.map((c) => [c._id, c.count]));
    const hostelRoomMap = new Map(roomsByHostel.map((item) => [String(item._id), item]));

    const hostelOccupancy = hostels.map((h) => {
      const stats = hostelRoomMap.get(String(h._id)) || { capacity: 0, occupied: 0 };
      const pct = stats.capacity > 0 ? Math.round((stats.occupied / stats.capacity) * 100) : 0;
      return {
        hostelId: h._id,
        name: h.name,
        type: h.type,
        capacity: stats.capacity,
        occupied: stats.occupied,
        pct,
      };
    });

    const occupancyRate =
      rStats.totalCapacity > 0 ? Math.round((rStats.totalOccupiedBeds / rStats.totalCapacity) * 100) : 0;
    const availableBeds = Math.max(0, rStats.totalCapacity - rStats.totalOccupiedBeds);

    res.status(200).json({
      ok: true,
      data: {
        summary: {
          totalStudents,
          totalHostels,
          totalRooms: rStats.totalRooms,
          occupiedRooms: rStats.occupiedRooms,
          availableRooms: rStats.availableRooms,
          fullRooms: rStats.fullRooms,
          availableBeds,
          pendingRequests: reqMap.Pending || 0,
          approvedRequests: reqMap.Approved || 0,
          rejectedRequests: reqMap.Rejected || 0,
          activeComplaints: cmpMap.Pending || 0,
          resolvedComplaints: cmpMap.Resolved || 0,
          totalCapacity: rStats.totalCapacity,
          totalOccupiedBeds: rStats.totalOccupiedBeds,
          occupancyRate,
        },
        hostelOccupancy,
        pendingQueue,
        recentRequests,
        recentComplaints,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentDashboardSummary(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      const rawStudent = fallbackStore.findUserById(req.user._id) || req.user;
      const student = populateUser(rawStudent);

      const myRequests = s.requests
        .filter((r) => String(r.studentId) === String(rawStudent._id))
        .sort((a, b) => new Date(b.requestedDate || b.createdAt).getTime() - new Date(a.requestedDate || a.createdAt).getTime())
        .map(populateRequest);

      const myComplaints = s.complaints
        .filter((c) => String(c.studentId) === String(rawStudent._id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(populateComplaint);

      const roommates = student.allocatedRoomId
        ? s.users
            .filter(
              (u) =>
                u.role === 'student' &&
                String(u.allocatedRoomId) === String(student.allocatedRoomId._id) &&
                String(u._id) !== String(student._id)
            )
            .map((u) => ({
              _id: u._id,
              name: u.name,
              studentId: u.studentId,
              department: u.department,
              year: u.year,
              contact: u.contact,
            }))
        : [];

      const availableRoomsAll = s.rooms.filter((r) => r.status === 'Available');
      const availableBedsCount = availableRoomsAll.reduce(
        (sum, r) => sum + Math.max(0, Number(r.capacity) - Number(r.occupiedCount)),
        0
      );
      const availableRoomsPreview = [...availableRoomsAll]
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
        .slice(0, 4)
        .map(populateRoom);

      const pendingRequest = myRequests.find((r) => r.status === 'Pending') || null;
      const recentActivity = [
        ...myRequests.map((r) => ({
          type: 'request',
          id: r._id,
          title: `Room Request (${r.roomId?.roomNumber || 'Room'})`,
          meta: `${r.hostelId?.name || 'Hostel'} · Status: ${r.status}`,
          status: r.status,
          date: String(r.requestedDate || r.createdAt || '').slice(0, 10),
        })),
        ...myComplaints.map((c) => ({
          type: 'complaint',
          id: c._id,
          title: `${c.category} Complaint`,
          meta: `Room ${c.roomId?.roomNumber || '—'} · Status: ${c.status}`,
          status: c.status,
          date: String(c.createdAt || '').slice(0, 10),
        })),
      ]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 6);

      return res.status(200).json({
        ok: true,
        data: {
          student,
          roommates,
          pendingRequest,
          availableRoomsSummary: {
            availableRoomsCount: availableRoomsAll.length,
            availableBedsCount,
            preview: availableRoomsPreview,
          },
          complaintSummary: {
            total: myComplaints.length,
            pending: myComplaints.filter((c) => c.status === 'Pending').length,
            resolved: myComplaints.filter((c) => c.status === 'Resolved').length,
          },
          myRequests,
          myComplaints,
          recentActivity,
        },
      });
    }

    const student = await User.findById(req.user._id)
      .populate('allocatedHostelId', 'name type address warden')
      .populate('allocatedRoomId', 'roomNumber type capacity occupiedCount status floor');

    const [myRequests, myComplaints, roommates, availableAgg, availableRoomsPreview] = await Promise.all([
      Request.find({ studentId: req.user._id })
        .populate('hostelId', 'name type')
        .populate('roomId', 'roomNumber type')
        .sort({ requestedDate: -1 })
        .lean(),
      Complaint.find({ studentId: req.user._id })
        .populate({
          path: 'roomId',
          select: 'roomNumber hostelId',
          populate: { path: 'hostelId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .lean(),
      student?.allocatedRoomId
        ? User.find({
            allocatedRoomId: student.allocatedRoomId._id,
            _id: { $ne: student._id },
          })
            .select('name studentId department year contact')
            .lean()
        : Promise.resolve([]),
      Room.aggregate([
        { $match: { status: 'Available' } },
        {
          $group: {
            _id: null,
            availableRoomsCount: { $sum: 1 },
            availableBedsCount: { $sum: { $max: [0, { $subtract: ['$capacity', '$occupiedCount'] }] } },
          },
        },
      ]),
      Room.find({ status: 'Available' })
        .populate('hostelId', 'name type')
        .sort({ roomNumber: 1 })
        .limit(4)
        .lean(),
    ]);

    const availStats = availableAgg[0] || { availableRoomsCount: 0, availableBedsCount: 0 };

    const pendingRequest = myRequests.find((r) => r.status === 'Pending') || null;
    const recentActivity = [
      ...myRequests.map((r) => ({
        type: 'request',
        id: r._id,
        title: `Room Request (${r.roomId?.roomNumber || 'Room'})`,
        meta: `${r.hostelId?.name || 'Hostel'} · Status: ${r.status}`,
        status: r.status,
        date: String(r.requestedDate || r.createdAt || '').slice(0, 10),
      })),
      ...myComplaints.map((c) => ({
        type: 'complaint',
        id: c._id,
        title: `${c.category} Complaint`,
        meta: `Room ${c.roomId?.roomNumber || '—'} · Status: ${c.status}`,
        status: c.status,
        date: String(c.createdAt || '').slice(0, 10),
      })),
    ]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 6);

    res.status(200).json({
      ok: true,
      data: {
        student: student.toSafeJSON(),
        roommates,
        pendingRequest,
        availableRoomsSummary: {
          availableRoomsCount: availStats.availableRoomsCount,
          availableBedsCount: availStats.availableBedsCount,
          preview: availableRoomsPreview,
        },
        complaintSummary: {
          total: myComplaints.length,
          pending: myComplaints.filter((c) => c.status === 'Pending').length,
          resolved: myComplaints.filter((c) => c.status === 'Resolved').length,
        },
        myRequests,
        myComplaints,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getOccupancyStats(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      const byHostel = [...s.hostels]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((h) => {
          const rooms = s.rooms.filter((r) => String(r.hostelId) === String(h._id));
          const capacity = rooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
          const occupied = rooms.reduce((sum, r) => sum + Number(r.occupiedCount || 0), 0);
          return {
            hostelId: h._id,
            name: h.name,
            type: h.type,
            totalRooms: rooms.length,
            availableRooms: rooms.filter((r) => r.status === 'Available').length,
            fullRooms: rooms.filter((r) => r.status === 'Full').length,
            capacity,
            occupied,
            availableBeds: Math.max(0, capacity - occupied),
            pct: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
          };
        });

      const totalCapacity = byHostel.reduce((sum, h) => sum + h.capacity, 0);
      const totalOccupiedBeds = byHostel.reduce((sum, h) => sum + h.occupied, 0);
      const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupiedBeds / totalCapacity) * 100) : 0;

      const byRoomType = ['Single', 'Double', 'Triple']
        .map((type) => {
          const rooms = s.rooms.filter((r) => r.type === type);
          const capacity = rooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
          const occupied = rooms.reduce((sum, r) => sum + Number(r.occupiedCount || 0), 0);
          return {
            type,
            totalRooms: rooms.length,
            capacity,
            occupied,
            availableBeds: Math.max(0, capacity - occupied),
            pct: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
          };
        })
        .filter((t) => t.totalRooms > 0);

      return res.status(200).json({
        ok: true,
        data: {
          overall: {
            totalCapacity,
            totalOccupiedBeds,
            availableBeds: Math.max(0, totalCapacity - totalOccupiedBeds),
            occupancyRate,
          },
          byHostel,
          byRoomType,
        },
      });
    }

    const [hostels, byHostelAgg, byTypeAgg] = await Promise.all([
      Hostel.find().sort({ name: 1 }).lean(),
      Room.aggregate([
        {
          $group: {
            _id: '$hostelId',
            totalRooms: { $sum: 1 },
            availableRooms: { $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] } },
            fullRooms: { $sum: { $cond: [{ $eq: ['$status', 'Full'] }, 1, 0] } },
            capacity: { $sum: '$capacity' },
            occupied: { $sum: '$occupiedCount' },
          },
        },
      ]),
      Room.aggregate([
        {
          $group: {
            _id: '$type',
            totalRooms: { $sum: 1 },
            capacity: { $sum: '$capacity' },
            occupied: { $sum: '$occupiedCount' },
          },
        },
      ]),
    ]);

    const hostelMap = new Map(byHostelAgg.map((item) => [String(item._id), item]));
    const byHostel = hostels.map((h) => {
      const stats = hostelMap.get(String(h._id)) || {
        totalRooms: 0,
        availableRooms: 0,
        fullRooms: 0,
        capacity: 0,
        occupied: 0,
      };
      const pct = stats.capacity > 0 ? Math.round((stats.occupied / stats.capacity) * 100) : 0;
      return {
        hostelId: h._id,
        name: h.name,
        type: h.type,
        totalRooms: stats.totalRooms,
        availableRooms: stats.availableRooms,
        fullRooms: stats.fullRooms,
        capacity: stats.capacity,
        occupied: stats.occupied,
        availableBeds: Math.max(0, stats.capacity - stats.occupied),
        pct,
      };
    });

    const totalCapacity = byHostel.reduce((sum, h) => sum + h.capacity, 0);
    const totalOccupiedBeds = byHostel.reduce((sum, h) => sum + h.occupied, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupiedBeds / totalCapacity) * 100) : 0;

    const byRoomType = byTypeAgg.map((t) => ({
      type: t._id,
      totalRooms: t.totalRooms,
      capacity: t.capacity,
      occupied: t.occupied,
      availableBeds: Math.max(0, t.capacity - t.occupied),
      pct: t.capacity > 0 ? Math.round((t.occupied / t.capacity) * 100) : 0,
    }));

    res.status(200).json({
      ok: true,
      data: {
        overall: {
          totalCapacity,
          totalOccupiedBeds,
          availableBeds: Math.max(0, totalCapacity - totalOccupiedBeds),
          occupancyRate,
        },
        byHostel,
        byRoomType,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecentActivity(req, res, next) {
  try {
    const isAdmin = req.user?.role === 'admin';

    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      const requests = s.requests
        .filter((r) => isAdmin || String(r.studentId) === String(req.user._id))
        .sort((a, b) => new Date(b.requestedDate || b.createdAt).getTime() - new Date(a.requestedDate || a.createdAt).getTime())
        .slice(0, 8)
        .map(populateRequest);

      const complaints = s.complaints
        .filter((c) => isAdmin || String(c.studentId) === String(req.user._id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map(populateComplaint);

      const feed = [
        ...requests.map((r) => ({
          type: 'request',
          id: r._id,
          title: isAdmin
            ? `${r.studentId?.name || 'Student'} requested Room ${r.roomId?.roomNumber || '—'}`
            : `Room Request (${r.roomId?.roomNumber || 'Room'})`,
          meta: `${r.hostelId?.name || 'Hostel'} · Status: ${r.status}`,
          status: r.status,
          timestamp: r.requestedDate || r.createdAt,
          date: String(r.requestedDate || r.createdAt || '').slice(0, 10),
        })),
        ...complaints.map((c) => ({
          type: 'complaint',
          id: c._id,
          title: isAdmin
            ? `${c.category} Ticket · Room ${c.roomId?.roomNumber || '—'}`
            : `${c.category} Complaint`,
          meta: `${c.roomId?.hostelId?.name || 'Hostel'} · Status: ${c.status}`,
          status: c.status,
          timestamp: c.createdAt,
          date: String(c.createdAt || '').slice(0, 10),
        })),
      ]
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 10);

      return res.status(200).json({ ok: true, data: feed });
    }

    const filter = isAdmin ? {} : { studentId: req.user._id };

    const [requests, complaints] = await Promise.all([
      Request.find(filter)
        .populate('studentId', 'name studentId')
        .populate('hostelId', 'name')
        .populate('roomId', 'roomNumber type')
        .sort({ requestedDate: -1 })
        .limit(8)
        .lean(),
      Complaint.find(filter)
        .populate('studentId', 'name studentId')
        .populate({
          path: 'roomId',
          select: 'roomNumber hostelId',
          populate: { path: 'hostelId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const feed = [
      ...requests.map((r) => ({
        type: 'request',
        id: r._id,
        title: isAdmin
          ? `${r.studentId?.name || 'Student'} requested Room ${r.roomId?.roomNumber || '—'}`
          : `Room Request (${r.roomId?.roomNumber || 'Room'})`,
        meta: `${r.hostelId?.name || 'Hostel'} · Status: ${r.status}`,
        status: r.status,
        timestamp: r.requestedDate || r.createdAt,
        date: String(r.requestedDate || r.createdAt || '').slice(0, 10),
      })),
      ...complaints.map((c) => ({
        type: 'complaint',
        id: c._id,
        title: isAdmin
          ? `${c.category} Ticket · Room ${c.roomId?.roomNumber || '—'}`
          : `${c.category} Complaint`,
        meta: `${c.roomId?.hostelId?.name || 'Hostel'} · Status: ${c.status}`,
        status: c.status,
        timestamp: c.createdAt,
        date: String(c.createdAt || '').slice(0, 10),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 10);

    res.status(200).json({ ok: true, data: feed });
  } catch (err) {
    next(err);
  }
}

export async function getStudentsDirectory(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      let students = s.users.filter((u) => u.role === 'student');
      if (req.query.status === 'Allocated') {
        students = students.filter((u) => Boolean(u.allocatedRoomId));
      } else if (req.query.status === 'Unallocated') {
        students = students.filter((u) => !u.allocatedRoomId);
      }
      if (req.query.search) {
        const q = String(req.query.search).trim().toLowerCase();
        students = students.filter(
          (u) =>
            (u.name || '').toLowerCase().includes(q) ||
            (u.studentId || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        );
      }
      students.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.status(200).json({ ok: true, data: students.map(populateUser) });
    }

    const query = { role: 'student' };
    if (req.query.status === 'Allocated') {
      query.allocatedRoomId = { $ne: null };
    } else if (req.query.status === 'Unallocated') {
      query.allocatedRoomId = null;
    }
    if (req.query.search) {
      const regex = new RegExp(String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { studentId: regex }, { email: regex }];
    }

    const students = await User.find(query)
      .populate('allocatedHostelId', 'name type')
      .populate('allocatedRoomId', 'roomNumber type')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ ok: true, data: students });
  } catch (err) {
    next(err);
  }
}

export async function triggerSampleCampusSeed(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      if (s.hostels.length === 0 || s.rooms.length === 0) {
        resetFallbackStore();
      }
      return res.status(201).json({
        ok: true,
        message: 'Sample campus hostels, rooms, and records are active.',
        data: { hostelsCreated: 0, roomsCreated: 0 },
      });
    }

    const result = await seedSampleCampusData();
    res.status(201).json({
      ok: true,
      message:
        result.hostelsCreated === 0 && result.roomsCreated === 0
          ? 'Sample campus hostels and rooms are already present in MongoDB.'
          : `Loaded ${result.hostelsCreated} sample hostels and ${result.roomsCreated} sample rooms into hostelDB.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
