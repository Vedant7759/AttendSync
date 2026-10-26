import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireObjectId(value, label = 'ID') {
  if (!mongoose.isValidObjectId(value)) {
    throw new HttpError(400, `${label} must be a valid identifier.`);
  }
  return value;
}

export function parseDate(value, label = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${label} must use YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${label} is not a valid calendar date.`);
  }
  return date;
}

export function parseStatus(value) {
  if (!['present', 'absent', 'late'].includes(value)) {
    throw new HttpError(400, 'Status must be present, absent, or late.');
  }
  return value;
}

