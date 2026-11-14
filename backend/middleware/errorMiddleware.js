import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(`API route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || undefined;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database validation failed';
    errors = Object.fromEntries(
      Object.entries(err.errors || {}).map(([field, detail]) => [field, detail.message])
    );
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format for field '${err.path}'.`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'record';
    message = `A record with this ${duplicateField} already exists.`;
  }

  if (statusCode >= 500) {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    ok: false,
    message,
    ...(errors ? { errors } : {}),
  });
}
