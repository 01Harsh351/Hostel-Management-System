import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const FALLBACK_DEV_SECRET = crypto
  .createHash('sha256')
  .update(`unistay-hostel-erp-${process.env.MONGODB_URI || process.cwd()}`)
  .digest('hex');

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_long_random_secret' || secret.length < 16) {
    return FALLBACK_DEV_SECRET;
  }
  return secret;
}

export function signAuthToken(user) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email || '',
      name: user.name || '',
      studentId: user.studentId || '',
    },
    secret,
    { expiresIn }
  );
}

export function verifyAuthToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}
