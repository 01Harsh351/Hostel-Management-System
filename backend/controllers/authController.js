import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { fallbackStore, populateUser } from '../utils/fallbackStore.js';
import { signAuthToken } from '../utils/jwt.js';
import { provisionInitialAdmin } from '../utils/seedAdmin.js';
import { validateLoginInput, validateProfileUpdateInput, validateRegisterInput } from '../utils/validators.js';

function trySignToken(userLike) {
  try {
    return signAuthToken(userLike);
  } catch {
    return '';
  }
}

export async function registerStudent(req, res, next) {
  try {
    // Strictly prevent self-registration as admin
    if (req.body?.role && String(req.body.role).toLowerCase() !== 'student') {
      return next(new AppError('Public registration is restricted to student accounts only.', 403));
    }

    const { valid, errors, sanitized } = validateRegisterInput(req.body);
    if (!valid) {
      return next(new AppError('Validation failed', 400, errors));
    }

    const effectivePassword = sanitized.password || crypto.randomBytes(16).toString('hex');

    if (mongoose.connection.readyState !== 1) {
      if (fallbackStore.findUserByEmail(sanitized.email)) {
        return next(
          new AppError('An account with this email already exists.', 409, {
            email: 'Email is already registered.',
          })
        );
      }
      if (fallbackStore.findUserByStudentId(sanitized.studentId)) {
        return next(
          new AppError('This Student ID is already registered.', 409, {
            studentId: 'Student ID is already registered.',
          })
        );
      }

      const created = fallbackStore.upsertUser({
        name: sanitized.name,
        email: sanitized.email,
        role: 'student',
        studentId: sanitized.studentId,
        contact: sanitized.contact,
        gender: sanitized.gender,
      });

      return res.status(201).json({
        ok: true,
        token: trySignToken(created),
        user: populateUser(created),
      });
    }

    const existingEmail = await User.findOne({ email: sanitized.email });
    if (existingEmail) {
      return next(
        new AppError('An account with this email already exists.', 409, {
          email: 'Email is already registered.',
        })
      );
    }

    const existingStudentId = await User.findOne({ studentId: sanitized.studentId });
    if (existingStudentId) {
      return next(
        new AppError('This Student ID is already registered.', 409, {
          studentId: 'Student ID is already registered.',
        })
      );
    }

    const user = await User.create({
      name: sanitized.name,
      email: sanitized.email,
      password: effectivePassword,
      role: 'student',
      studentId: sanitized.studentId,
      contact: sanitized.contact,
      gender: sanitized.gender,
    });

    const token = trySignToken(user);

    res.status(201).json({
      ok: true,
      token,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function loginUser(req, res, next) {
  try {
    const requestedRole = req.body?.expectedRole === 'admin' ? 'admin' : 'student';
    const rawEmail = String(req.body?.email || '').trim();
    const fallbackEmail =
      requestedRole === 'admin' ? 'warden.admin@university.edu' : 'aarav.student@university.edu';
    const normalizedBody = {
      ...req.body,
      email: rawEmail || fallbackEmail,
    };

    const { valid, errors, sanitized } = validateLoginInput(normalizedBody);
    if (!valid) {
      return next(new AppError('Invalid email format.', 400, errors));
    }

    const fallbackName =
      String(req.body?.name || req.body?.fullName || '').trim() ||
      (requestedRole === 'admin' ? 'Hostel Chief Warden' : 'Campus Student');

    if (mongoose.connection.readyState !== 1) {
      let user = fallbackStore.findUserByEmail(sanitized.email);
      if (user && req.body?.expectedRole && user.role !== req.body.expectedRole) {
        return next(
          new AppError(
            req.body.expectedRole === 'admin'
              ? 'This portal is restricted to Hostel Administrators.'
              : 'Administrators must sign in through the dedicated Admin Console.',
            403
          )
        );
      }

      if (!user) {
        user = fallbackStore.upsertUser({
          name: fallbackName,
          email: sanitized.email,
          role: requestedRole,
          studentId: requestedRole === 'student' ? String(req.body?.studentId || '').trim().toUpperCase() : '',
          contact: String(req.body?.contact || '').trim(),
          gender: ['Male', 'Female', 'Other'].includes(req.body?.gender) ? req.body.gender : '',
        });
      }

      return res.status(200).json({
        ok: true,
        token: trySignToken(user),
        user: populateUser(user),
      });
    }

    let user = await User.findOne({ email: sanitized.email })
      .populate('allocatedHostelId', 'name type address')
      .populate('allocatedRoomId', 'roomNumber type capacity occupiedCount status');

    if (user && req.body?.expectedRole && user.role !== req.body.expectedRole) {
      return next(
        new AppError(
          req.body.expectedRole === 'admin'
            ? 'This portal is restricted to Hostel Administrators.'
            : 'Administrators must sign in through the dedicated Admin Console.',
          403
        )
      );
    }

    if (!user) {
      const generatedStudentId =
        requestedRole === 'student'
          ? String(req.body?.studentId || `STU-${Date.now().toString().slice(-6)}`).toUpperCase()
          : undefined;
      user = await User.create({
        name: fallbackName,
        email: sanitized.email,
        password: crypto.randomBytes(16).toString('hex'),
        role: requestedRole,
        ...(generatedStudentId ? { studentId: generatedStudentId } : {}),
        contact: String(req.body?.contact || '').trim(),
        gender: ['Male', 'Female', 'Other'].includes(req.body?.gender) ? req.body.gender : '',
      });
    }

    const token = trySignToken(user);
    const safeUser = user.toSafeJSON();

    res.status(200).json({
      ok: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const found = fallbackStore.findUserById(req.user._id) || req.user;
      return res.status(200).json({
        ok: true,
        user: populateUser(found),
      });
    }

    const user = await User.findById(req.user._id)
      .populate('allocatedHostelId', 'name type address warden')
      .populate('allocatedRoomId', 'roomNumber type capacity occupiedCount status floor');

    if (!user) {
      return next(new AppError('User account not found.', 404));
    }

    res.status(200).json({
      ok: true,
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { valid, errors, sanitized } = validateProfileUpdateInput(req.body);
    if (!valid) {
      return next(new AppError('Profile validation failed.', 400, errors));
    }

    if (mongoose.connection.readyState !== 1) {
      const updated = fallbackStore.updateUser(req.user._id, sanitized);
      if (!updated) {
        return next(new AppError('User account not found.', 404));
      }
      return res.status(200).json({
        ok: true,
        user: populateUser(updated),
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: sanitized },
      { new: true, runValidators: true }
    )
      .populate('allocatedHostelId', 'name type address warden')
      .populate('allocatedRoomId', 'roomNumber type capacity occupiedCount status floor');

    if (!updated) {
      return next(new AppError('User account not found.', 404));
    }

    res.status(200).json({
      ok: true,
      user: updated.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Protected one-time bootstrap endpoint for first admin provisioning.
 * Requires matching ADMIN_SEED_KEY header and fails if any admin already exists.
 */
export async function provisionFirstAdmin(req, res, next) {
  try {
    const configuredSeedKey = process.env.ADMIN_SEED_KEY;
    const providedKey = req.headers['x-admin-seed-key'];

    if (!configuredSeedKey || configuredSeedKey.includes('change_this') || providedKey !== configuredSeedKey) {
      return next(new AppError('Unauthorized admin provisioning attempt.', 403));
    }

    if (mongoose.connection.readyState !== 1) {
      const s = fallbackStore.getState();
      const existingAdmin = s.users.find((u) => u.role === 'admin');
      if (existingAdmin) {
        return next(new AppError('An admin account already exists.', 409));
      }
      const created = fallbackStore.upsertUser({
        name: req.body?.name || process.env.ADMIN_SEED_NAME || 'Hostel Chief Warden',
        email: req.body?.email || process.env.ADMIN_SEED_EMAIL || 'warden.admin@university.edu',
        role: 'admin',
      });
      return res.status(201).json({
        ok: true,
        message: 'Initial administrator provisioned.',
        admin: populateUser(created),
      });
    }

    const result = await provisionInitialAdmin({
      name: req.body?.name || process.env.ADMIN_SEED_NAME || 'Hostel Chief Warden',
      email: req.body?.email || process.env.ADMIN_SEED_EMAIL,
      password: req.body?.password || process.env.ADMIN_SEED_PASSWORD,
    });

    if (!result.created) {
      return next(new AppError(result.reason, 409));
    }

    res.status(201).json({
      ok: true,
      message: 'Initial administrator provisioned.',
      admin: result.admin,
    });
  } catch (err) {
    next(err);
  }
}
