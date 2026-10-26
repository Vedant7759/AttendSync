import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck,
  Clock3, GraduationCap, LayoutDashboard, LoaderCircle, Search, Send, ShieldCheck,
  Users, XCircle
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const statusOptions = ['present', 'absent', 'late'];

async function request(path, options) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  return payload;
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function App() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [dirty, setDirty] = useState({});
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(localToday);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestSequence = useRef(0);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    let active = true;
    Promise.all([request('/students'), request('/subjects')])
      .then(([studentData, subjectData]) => {
        if (!active) return;
        setStudents(studentData);
        setSubjects(subjectData);
        setSubjectId((current) => current || subjectData[0]?._id || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const loadAttendance = useCallback(async (automatic = false) => {
    if (!subjectId) return;
    const sequence = ++requestSequence.current;
    try {
      const records = await request(`/attendance?subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}`);
      if (sequence !== requestSequence.current) return;
      const saved = Object.fromEntries(records.map((record) => [record.student._id, record.status]));
      setStatuses((current) => {
        const next = { ...current };
        for (const student of students) {
          if (!automatic || !dirtyRef.current[student._id]) {
            if (saved[student._id]) next[student._id] = saved[student._id];
            else delete next[student._id];
          }
        }
        return next;
      });
      if (!automatic) setDirty({});
      setError('');
    } catch (err) {
      if (!automatic) setError(err.message);
    }
  }, [date, students, subjectId]);

  useEffect(() => {
    if (!subjectId || students.length === 0) return undefined;
    loadAttendance();
    const timer = window.setInterval(() => loadAttendance(true), 3000);
    return () => window.clearInterval(timer);
  }, [loadAttendance, students.length, subjectId]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(query) || student.rollNumber.toLowerCase().includes(query)
    );
  }, [search, students]);
  const counts = useMemo(() => ({
    present: Object.values(statuses).filter((status) => status === 'present').length,
    absent: Object.values(statuses).filter((status) => status === 'absent').length,
    late: Object.values(statuses).filter((status) => status === 'late').length,
    marked: Object.keys(statuses).length
  }), [statuses]);

  function setStatus(studentId, status) {
    setStatuses((current) => ({ ...current, [studentId]: status }));
    setDirty((current) => ({ ...current, [studentId]: true }));
    setNotice('');
  }

  async function saveRegister() {
    if (!subjectId || counts.marked !== students.length || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await request('/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          date,
          records: students.map((student) => ({ studentId: student._id, status: statuses[student._id] }))
        })
      });
      setDirty({});
      setNotice(`Register saved — ${result.count} student records updated.`);
      await loadAttendance();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedSubject = subjects.find((subject) => subject._id === subjectId);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="AttendSync home">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
          <span>Attend<span className="brand-accent">Sync</span><small>ACADEMIC PORTAL</small></span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Teacher navigation">
          <a className="nav-item active" href="#register"><LayoutDashboard size={18} /> Overview</a>
          <a className="nav-item" href="#register"><ClipboardCheck size={18} /> Attendance register</a>
          <a className="nav-item" href="#register"><BookOpen size={18} /> My subjects</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-card"><span className="sync-icon"><ShieldCheck size={17} /></span><div><strong>Live sync enabled</strong><small>Updates every 3 seconds</small></div><span className="live-dot" /></div>
          <div className="profile"><div className="avatar">MS</div><div className="profile-name"><strong>{selectedSubject?.facultyName || 'Faculty portal'}</strong><small>Teacher</small></div><ChevronDown size={16} /></div>
        </div>
      </aside>

      <main className="main-area" id="register">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Attendance</strong></div>
          <div className="topbar-right"><span className="today-label"><CalendarDays size={15} /> {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><div className="top-avatar">MS</div></div>
        </header>
        <section className="page-content">
          <div className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> TEACHER WORKSPACE</div><h1>Attendance register</h1><p className="subtitle">Take attendance and keep your class records in sync.</p></div>
            <div className="live-pill"><span className="live-dot" /> Connected to AttendSync</div>
          </div>

          {error && <div className="alert error-alert" role="alert"><XCircle size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
          {notice && <div className="alert success-alert" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

          <div className="summary-grid">
            <div className="summary-card"><div className="summary-icon blue"><Users size={19} /></div><div className="summary-copy"><span>Class strength</span><strong>{loading ? '—' : students.length}</strong><small>Enrolled students</small></div><div className="summary-spark blue-spark">↗</div></div>
            <div className="summary-card"><div className="summary-icon green"><CheckCircle2 size={19} /></div><div className="summary-copy"><span>Present today</span><strong>{counts.present}</strong><small>{counts.late} marked late</small></div><div className="summary-spark green-spark">✓</div></div>
            <div className="summary-card"><div className="summary-icon red"><XCircle size={19} /></div><div className="summary-copy"><span>Absent today</span><strong>{counts.absent}</strong><small>{counts.marked} of {students.length} marked</small></div><div className="summary-spark red-spark">−</div></div>
          </div>

          <section className="register-card">
            <div className="register-heading">
              <div><div className="register-title-row"><span className="heading-icon"><ClipboardCheck size={18} /></span><h2>Class register</h2><span className="record-count">{students.length} students</span></div><p>Mark each student present, absent, or late.</p></div>
              <div className="refresh-indicator"><span className="refresh-dot" /> Auto-sync on</div>
            </div>
            <div className="toolbar">
              <label className="select-wrap"><BookOpen size={16} /><select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setStatuses({}); setDirty({}); }} aria-label="Select subject"><option value="">Select a subject</option>{subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.code} · {subject.name}</option>)}</select><ChevronDown size={15} /></label>
              <label className="date-wrap"><CalendarDays size={16} /><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setStatuses({}); setDirty({}); }} aria-label="Attendance date" /></label>
              <label className="search-wrap"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or roll no." /><kbd>⌘ K</kbd></label>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>SECTION</th><th>ATTENDANCE STATUS</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="4" className="table-message"><LoaderCircle className="spinner" size={20} /> Loading students from the API…</td></tr>}
                  {!loading && filteredStudents.map((student, index) => (
                    <tr key={student._id}>
                      <td><div className="student-cell"><div className={`student-avatar avatar-${index % 6}`}>{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{student.name}</strong><small>{student.email || 'Student'}</small></div></div></td>
                      <td><span className="roll-code">{student.rollNumber}</span></td>
                      <td><span className="section-tag">{student.section}</span></td>
                      <td><div className="status-controls" role="group" aria-label={`Attendance for ${student.name}`}>
                        {statusOptions.map((status) => <button key={status} className={`status-button ${status} ${statuses[student._id] === status ? 'selected' : ''}`} onClick={() => setStatus(student._id, status)} aria-pressed={statuses[student._id] === status}><span className="status-check">{statuses[student._id] === status ? <Check size={12} /> : null}</span>{status[0].toUpperCase() + status.slice(1)}</button>)}
                      </div></td>
                    </tr>
                  ))}
                  {!loading && filteredStudents.length === 0 && <tr><td colSpan="4" className="table-message">{students.length ? 'No students match your search.' : 'No students found. Start MongoDB and run the seed command.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="register-footer"><span><Clock3 size={15} /> {counts.marked} / {students.length} marked <span className="footer-separator">·</span> Changes sync to the shared database</span><button className="save-button" disabled={saving || loading || counts.marked !== students.length || students.length === 0} onClick={saveRegister}>{saving ? <LoaderCircle className="spinner" size={16} /> : <Send size={15} />}{saving ? 'Saving…' : 'Submit attendance'}{!saving && <span>→</span>}</button></div>
          </section>
          <footer className="page-footer"><GraduationCap size={15} /> AttendSync <span>·</span> Cross-UI Student Attendance Management System <span className="footer-right">Shared live register</span></footer>
        </section>
      </main>
    </div>
  );
}

export default App;
