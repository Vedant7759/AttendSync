import 'dotenv/config';
import mongoose from 'mongoose';
import { Attendance, Student, Subject } from './models.js';

const students = [
  ['Aarav Mehta', 'AS-001', 'BCA-A', 'aarav.demo@example.test'],
  ['Diya Kapoor', 'AS-002', 'BCA-A', 'diya.demo@example.test'],
  ['Kabir Shah', 'AS-003', 'BCA-A', 'kabir.demo@example.test'],
  ['Meera Iyer', 'AS-004', 'BCA-A', 'meera.demo@example.test'],
  ['Arjun Rao', 'AS-005', 'BCA-A', 'arjun.demo@example.test'],
  ['Anaya Singh', 'AS-006', 'BCA-A', 'anaya.demo@example.test'],
  ['Ishaan Das', 'AS-007', 'BCA-A', 'ishaan.demo@example.test'],
  ['Sara Khan', 'AS-008', 'BCA-A', 'sara.demo@example.test']
];
const subjects = [
  { name: 'Advanced Web Programming', code: 'AWP301', facultyName: 'Prof. Mira Sen' },
  { name: 'Database Management Systems', code: 'DBMS204', facultyName: 'Prof. Dev Nair' },
  { name: 'Software Engineering', code: 'SE205', facultyName: 'Prof. Kavya Rao' }
];

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured. Copy .env.example to .env first.');
  await mongoose.connect(process.env.MONGODB_URI);
  const savedStudents = await Promise.all(students.map(([name, rollNumber, section, email]) =>
    Student.findOneAndUpdate({ rollNumber }, { name, section, email }, { upsert: true, new: true, runValidators: true })
  ));
  const savedSubjects = await Promise.all(subjects.map((subject) =>
    Subject.findOneAndUpdate({ code: subject.code }, subject, { upsert: true, new: true, runValidators: true })
  ));
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const statuses = ['present', 'present', 'late', 'absent', 'present', 'present', 'absent', 'present'];
  await Attendance.bulkWrite(savedStudents.map((student, index) => ({
    updateOne: {
      filter: { student: student._id, subject: savedSubjects[0]._id, date },
      update: { $set: { status: statuses[index] } },
      upsert: true
    }
  })));
  console.log(`Seeded ${savedStudents.length} fictional students, ${savedSubjects.length} subjects, and today's sample attendance. Existing matching demo records were updated, not duplicated.`);
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

