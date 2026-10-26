import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Attendance, Student, Subject } from './models.js';
import { HttpError, parseDate, parseStatus, requireObjectId } from './validation.js';

export const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:3000,http://localhost:4200')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'This browser origin is not allowed by the API.'));
  }
}));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'database-unavailable',
    database: connected ? 'connected' : 'disconnected'
  });
});

app.get('/api/students', asyncRoute(async (_req, res) => {
  const students = await Student.find().sort({ rollNumber: 1 }).lean();
  res.json(students);
}));

app.post('/api/students', asyncRoute(async (req, res) => {
  const { name, rollNumber, section, email } = req.body ?? {};
  if (![name, rollNumber, section].every((value) => typeof value === 'string' && value.trim())) {
    throw new HttpError(400, 'Name, roll number, and section are required.');
  }
  const student = await Student.create({ name, rollNumber, section, email });
  res.status(201).json(student);
}));

app.get('/api/subjects', asyncRoute(async (_req, res) => {
  const subjects = await Subject.find().sort({ code: 1 }).lean();
  res.json(subjects);
}));

app.post('/api/subjects', asyncRoute(async (req, res) => {
  const { name, code, facultyName } = req.body ?? {};
  if (![name, code, facultyName].every((value) => typeof value === 'string' && value.trim())) {
    throw new HttpError(400, 'Subject name, code, and faculty name are required.');
  }
  const subject = await Subject.create({ name, code, facultyName });
  res.status(201).json(subject);
}));

app.get('/api/attendance', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.date !== undefined) filter.date = parseDate(req.query.date);
  if (req.query.subjectId !== undefined) filter.subject = requireObjectId(req.query.subjectId, 'subjectId');
  if (req.query.studentId !== undefined) filter.student = requireObjectId(req.query.studentId, 'studentId');
  if (req.query.status !== undefined) filter.status = parseStatus(req.query.status);
  const records = await Attendance.find(filter)
    .populate('student', 'name rollNumber section')
    .populate('subject', 'name code facultyName')
    .sort({ date: -1, 'student.rollNumber': 1 })
    .lean();
  res.json(records);
}));

app.post('/api/attendance/bulk', asyncRoute(async (req, res) => {
  const { subjectId, date: rawDate, records } = req.body ?? {};
  const subject = requireObjectId(subjectId, 'subjectId');
  const date = parseDate(rawDate);
  if (!Array.isArray(records) || records.length === 0 || records.length > 500) {
    throw new HttpError(400, 'Records must be a non-empty array of at most 500 attendance entries.');
  }
  const normalized = records.map((record, index) => {
    if (!record || typeof record !== 'object') throw new HttpError(400, `Record ${index + 1} is invalid.`);
    return {
      student: requireObjectId(record.studentId, `records[${index}].studentId`),
      status: parseStatus(record.status)
    };
  });
  if (new Set(normalized.map((record) => record.student.toString())).size !== normalized.length) {
    throw new HttpError(400, 'Each student may appear only once in a register submission.');
  }
  const [subjectExists, studentCount] = await Promise.all([
    Subject.exists({ _id: subject }),
    Student.countDocuments({ _id: { $in: normalized.map((record) => record.student) } })
  ]);
  if (!subjectExists) throw new HttpError(404, 'Subject not found.');
  if (studentCount !== normalized.length) throw new HttpError(400, 'One or more students were not found.');

  await Attendance.bulkWrite(normalized.map(({ student, status }) => ({
    updateOne: {
      filter: { student, subject, date },
      update: { $set: { status } },
      upsert: true
    }
  })));
  const saved = await Attendance.find({ subject, date })
    .populate('student', 'name rollNumber section')
    .populate('subject', 'name code facultyName')
    .sort({ 'student.rollNumber': 1 }).lean();
  res.status(200).json({ message: 'Attendance register saved.', count: saved.length, records: saved });
}));

app.patch('/api/attendance/:id', asyncRoute(async (req, res) => {
  const id = requireObjectId(req.params.id, 'attendanceId');
  const status = parseStatus(req.body?.status);
  const record = await Attendance.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
    .populate('student', 'name rollNumber section')
    .populate('subject', 'name code facultyName');
  if (!record) throw new HttpError(404, 'Attendance record not found.');
  res.json(record);
}));

app.delete('/api/attendance/:id', asyncRoute(async (req, res) => {
  const id = requireObjectId(req.params.id, 'attendanceId');
  const record = await Attendance.findByIdAndDelete(id);
  if (!record) throw new HttpError(404, 'Attendance record not found.');
  res.status(204).end();
}));

app.get('/api/reports/summary', asyncRoute(async (_req, res) => {
  const [totalStudents, rows] = await Promise.all([
    Student.countDocuments(),
    Attendance.find().populate('student', 'name rollNumber').populate('subject', 'name code').lean()
  ]);
  const sessions = new Set(rows.map((row) => `${row.subject?._id}:${row.date.toISOString().slice(0, 10)}`));
  const studentTotals = new Map();
  for (const row of rows) {
    const key = row.student?._id.toString();
    if (!key) continue;
    const current = studentTotals.get(key) ?? { student: row.student, total: 0, attended: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') current.attended += 1;
    studentTotals.set(key, current);
  }
  res.json({
    totalStudents,
    attendanceRecords: rows.length,
    sessions: sessions.size,
    presentCount: rows.filter((row) => row.status === 'present').length,
    studentPercentages: [...studentTotals.values()].map(({ student, total, attended }) => ({
      student,
      totalSessions: total,
      percentage: Math.round((attended / total) * 1000) / 10
    })).sort((a, b) => a.student.rollNumber.localeCompare(b.student.rollNumber))
  });
}));

app.use((_req, _res, next) => next(new HttpError(404, 'API route not found.')));

app.use((error, _req, res, _next) => {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error?.name === 'ValidationError') return res.status(400).json({ error: error.message });
  if (error?.code === 11000) return res.status(409).json({ error: 'A record with this unique value already exists.' });
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  console.error('API request failed:', error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});
