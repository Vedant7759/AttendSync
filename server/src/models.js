import mongoose from 'mongoose';

const { Schema } = mongoose;

const studentSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  rollNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
  section: { type: String, required: true, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 }
}, { timestamps: true });

const subjectSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  facultyName: { type: String, required: true, trim: true, maxlength: 100 }
}, { timestamps: true });

const attendanceSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true }
}, { timestamps: true });

// This index is the final safeguard against duplicate daily register rows.
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

export const Student = mongoose.model('Student', studentSchema);
export const Subject = mongoose.model('Subject', subjectSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);

