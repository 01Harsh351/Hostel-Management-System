import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

export async function provisionInitialAdmin({ name, email, password }) {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    return { created: false, reason: 'An administrator account already exists.', admin: existingAdmin.toSafeJSON() };
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!name || !normalizedEmail || !password || password.length < 8 || password.includes('change_this')) {
    throw new Error(
      'Valid ADMIN_SEED_NAME, ADMIN_SEED_EMAIL, and a strong ADMIN_SEED_PASSWORD (>= 8 chars) are required.'
    );
  }

  const admin = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'admin',
    contact: '',
    gender: '',
  });

  return { created: true, admin: admin.toSafeJSON() };
}

export async function ensureInitialAdminFromEnv() {
  if (mongoose.connection.readyState !== 1) {
    return { created: false, reason: 'Database not connected.' };
  }

  const email = String(process.env.ADMIN_SEED_EMAIL || '').trim();
  const password = String(process.env.ADMIN_SEED_PASSWORD || '').trim();
  const name = String(process.env.ADMIN_SEED_NAME || 'Hostel Chief Warden').trim();

  if (!email || !password || password.length < 8 || password.includes('change_this')) {
    return { created: false, reason: 'ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not configured.' };
  }

  return provisionInitialAdmin({ name, email, password });
}

// Execute when invoked directly via `node utils/seedAdmin.js`
const isDirectRun = process.argv[1] && process.argv[1].endsWith('seedAdmin.js');
if (isDirectRun) {
  (async () => {
    const connected = await connectDB();
    if (!connected) {
      console.error('[SEED] Cannot seed admin without a valid MONGODB_URI.');
      process.exit(1);
    }
    try {
      const result = await provisionInitialAdmin({
        name: process.env.ADMIN_SEED_NAME || 'Hostel Chief Warden',
        email: process.env.ADMIN_SEED_EMAIL,
        password: process.env.ADMIN_SEED_PASSWORD,
      });
      if (result.created) {
        console.log(`[SEED] Initial admin provisioned: ${result.admin.email}`);
      } else {
        console.log(`[SEED] Skipped: ${result.reason}`);
      }
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('[SEED] Error:', err.message);
      await mongoose.disconnect();
      process.exit(1);
    }
  })();
}
