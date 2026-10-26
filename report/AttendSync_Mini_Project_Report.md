# AttendSync Mini-Project Report

## Advanced Web Programming

**Project title:** Cross-UI Student Attendance Management System  
**Project name:** AttendSync

| Academic detail | Fill in before submission |
| --- | --- |
| College name | `[College name]` |
| Department / programme | `[Department / programme]` |
| Faculty guide | `[Faculty guide name and designation]` |
| Academic year / semester | `[Academic year / semester]` |

### Team of four

| Team member | Student name | Roll number | Responsibility |
| --- | --- | --- | --- |
| 1 | `[Student name]` | `[Roll number]` | Express API, validation, and data model |
| 2 | `[Student name]` | `[Roll number]` | React teacher portal and attendance entry |
| 3 | `[Student name]` | `[Roll number]` | Angular admin dashboard and reporting |
| 4 | `[Student name]` | `[Roll number]` | MongoDB seed/setup, integration testing, and documentation |

> Replace the bracketed placeholders with institution-approved details. This report intentionally includes no invented college information, student identities, screenshots, or test results.

## 1. Overview

AttendSync is a browser-based attendance management mini-project. It separates attendance entry and administration into two user interfaces: a teacher records a class register in React, while an administrator reviews and corrects the same records in Angular. Both interfaces use one Express REST API and one MongoDB database, rather than maintaining separate client-side data.

The application supports three attendance states—present, absent, and late. A teacher selects a subject and date, marks each enrolled student, and submits the register as a batch. The administrator can filter saved records by state and update a status. Polling makes saved changes visible in both clients without refreshing the page.

## 2. Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Teacher interface | React, JavaScript, Vite | Responsive attendance entry and class register |
| Administrator interface | Angular standalone components, TypeScript, RxJS | Attendance monitoring, corrections, and student percentages |
| REST services | Node.js, Express | Shared API, request validation, and error responses |
| Persistence | MongoDB, Mongoose | Validated student, subject, and attendance documents |
| Styling | CSS | Responsive dashboard layouts and status affordances |
| Tooling | npm, PowerShell | Dependency management and Windows setup/start helpers |

## 3. Architecture

```text
Teacher (React :3000) ─┐
                       ├── HTTP/JSON + CORS ── Express API (:5000) ── Mongoose ── MongoDB
Admin (Angular :4200) ─┘
```

The clients do not connect directly to the database. The API validates incoming identifiers, dates, required fields, and status values before reading or writing through Mongoose. CORS allows the two local development origins by default. Database connection configuration is supplied through `server/.env`; the sample file contains only local development defaults.

## 4. Data Model and API

### Data model

- **Student:** name, unique roll number, section, optional email, and timestamps.
- **Subject:** name, unique subject code, faculty name, and timestamps.
- **Attendance:** references one student and one subject, a date, and an enumerated status. A unique compound index on `(student, subject, date)` prevents duplicate daily entries.

An attendance record is one student's state for one subject on one date. The dashboard's student percentage is calculated as `(present + late) / total recorded sessions * 100`; absent records count in the denominator.

### API contract

| Method and path | Input / response purpose |
| --- | --- |
| `GET /api/health` | Readiness state including MongoDB connection |
| `GET`, `POST /api/students` | List and create validated students |
| `GET`, `POST /api/subjects` | List and create validated subjects |
| `GET /api/attendance` | Optional `date`, `subjectId`, `studentId`, and `status` filters |
| `POST /api/attendance/bulk` | Subject/date and a list of student/status rows; bulk upserts |
| `PATCH /api/attendance/:id` | Update a saved status |
| `DELETE /api/attendance/:id` | Delete a saved attendance row |
| `GET /api/reports/summary` | Student/record/session/present totals and per-student attendance percentages |

Supported statuses are `present`, `absent`, and `late`; dates must be real calendar dates in `YYYY-MM-DD` format. The API uses 400 for invalid input, 404 for missing records/routes, 409 for unique conflicts, and a safe generic 500 response for unexpected server errors.

## 5. Data Flow

1. On load, the React portal obtains students and subjects from the API.
2. Selecting a subject/date makes React retrieve that saved register. It polls saved data every three seconds, while preserving locally edited rows during background refresh.
3. The teacher must mark every listed student before submitting. The API validates the batch and uses MongoDB bulk upserts, keyed by student, subject, and date.
4. Angular polls attendance every three seconds and summary data every six seconds. It displays populated student and subject information, totals, and percentage calculations.
5. An administrator's status correction uses `PATCH`; after a successful response the Angular row updates immediately, the summary refreshes on its next interval, and the React portal receives the saved status on its next poll.

## 6. Input and Output

**Inputs:** student name, roll number, section, optional email; subject name, code, faculty name; selected subject/date; and one of three status values per student. The bulk endpoint accepts student IDs and statuses as JSON.

**Outputs:** JSON student/subject/attendance documents, validation or server errors, API health, aggregate counts, and student percentage values. The frontends present loading, empty, error, and success states. Demo seed records use fictional names and `.test` email addresses only.

## 7. Core Code and How to Run

Core implementation locations:

- `server/src/models.js` — schemas and duplicate-prevention index.
- `server/src/app.js` — routes, filtering, bulk upsert, reports, and safe errors.
- `server/src/validation.js` — shared identifier, date, and status validation.
- `server/src/seed.js` — repeatable fictional demo data.
- `react-teacher/src/App.jsx` — teacher register, polling, dirty-row protection, and save flow.
- `angular-admin/src/app/app.component.ts` and `.html` — RxJS polling, dashboard, and status correction.

### Windows PowerShell instructions

Install Node.js LTS and MongoDB Community Server. MongoDB Shell is optional. Official downloads:

- MongoDB Community Server: <https://www.mongodb.com/try/download/community>
- MongoDB Shell: <https://www.mongodb.com/try/download/shell>

MongoDB Community Server and Shell were not detected in the implementation environment, so their installation and database-backed behavior must be verified on a machine with MongoDB available.

From the project root:

```powershell
Copy-Item .env.example server\.env
.\scripts\setup.ps1
Start-Service MongoDB
npm run seed
```

If MongoDB is installed but not as a Windows service, start `mongod` using the data-directory configuration selected during installation. Then open three PowerShell terminals at the project root:

```powershell
npm --prefix .\server run dev
npm --prefix .\react-teacher run dev
npm --prefix .\angular-admin start
```

Open `http://localhost:3000` for the Teacher Portal and `http://localhost:4200` for the Admin Dashboard. The optional launcher is `.\scripts\start-all.ps1`.

## 8. Testing and Results

The repository includes focused Node tests for valid/invalid ISO dates, allowed statuses, and MongoDB ObjectId validation (`server/src/validation.test.js`), plus an API health/route smoke test (`server/src/app.test.js`). The React production build is `npm --prefix .\react-teacher run build`; the Angular strict-template production build is `npm --prefix .\angular-admin run build`.

### Results to fill after running

| Check | Result |
| --- | --- |
| Backend validation and route tests | **Pass:** 8/8 Node tests using `npm --prefix .\server test` (2026-10-26) |
| React production build | **Pass:** Vite production build using `npm --prefix .\react-teacher run build` (2026-10-26) |
| Angular production build | **Pass:** Angular production build with strict template checking using `npm --prefix .\angular-admin run build` (2026-10-26) |
| Dependency installation | **Pass:** all three npm dependency installs completed; npm reported 0 vulnerabilities for each package set |
| MongoDB connection and seed | **Not run:** MongoDB Server and Shell are absent; API startup was attempted and reported `ECONNREFUSED 127.0.0.1:27017` |
| React-to-Angular synchronization | **Not run:** requires MongoDB Server and seeded data |
| Angular correction and persistence | **Not run:** requires MongoDB Server and seeded data |

No results should be marked as passed until they have been run. A database-backed verification requires a running MongoDB Server and configured `server/.env`.

### API and integration test checklist

1. Health returns HTTP 200 after the API connects to MongoDB.
2. Student and subject list routes return the seeded fictional records.
3. Submit a marked register and inspect the returned records.
4. Confirm the records become visible in Angular after polling.
5. Correct a status in Angular; verify it in React and after reloading.
6. Resubmit the same student/subject/date and confirm only one record exists.
7. Verify date, subject, student, and status filters.
8. Submit an invalid ID, impossible date, or unsupported status and check for HTTP 400.
9. Delete a test attendance record and confirm it disappears from both views.

## 9. Conclusion and Future Scope

AttendSync demonstrates a shared REST/database architecture across two independently built frontend frameworks. The single source of truth, bulk upserts, unique attendance key, explicit validation, and polling-based synchronization provide a practical foundation for a small academic attendance workflow.

Potential future work includes authentication and role-based access, timetable-aware sessions, pagination, audit history, exportable reports, server-sent events or WebSockets, and automated end-to-end testing. These are outside the current mini-project implementation.

## 10. Four-Member Team Responsibility Split

1. **Member 1 — Backend and API:** Express routes, Mongoose schemas, validation, duplicate prevention, and error responses.
2. **Member 2 — Teacher workflow:** React/Vite register, search and status controls, API integration, polling, and responsive design.
3. **Member 3 — Administrator workflow:** Angular dashboard, RxJS lifecycle/polling, filters, percentage display, status correction, and responsive design.
4. **Member 4 — Integration and delivery:** MongoDB setup and seed verification, cross-interface test execution, PowerShell scripts, README, and report coordination.

For a four-student team, all members should review and demonstrate the integrated result; the split identifies primary responsibility, not exclusive ownership.

## 11. Practical Demonstration Steps

1. Start MongoDB, configure `server/.env`, install dependencies, and seed the fictional demo dataset.
2. Start the API and both frontends in separate PowerShell terminals; show the API health response.
3. Open React, choose Advanced Web Programming and today's date, and mark all eight students.
4. Submit the register and show the returned success message and updated totals.
5. Open Angular and wait up to three seconds; locate the same student/date and show the shared status.
6. Change one student's status in Angular; show the updated record and the change in React after polling.
7. Resubmit the same subject/date; explain that the compound unique index and bulk upsert prevent duplicates.
8. Filter the Angular list by status and explain the student percentage formula.
9. Demonstrate a rejected invalid date/status if time permits.

Use only the fictional seed data during the demonstration.

## 12. Viva Questions with Answers

**Q1. Why use two frontends with one API?**  
The project demonstrates separate React and Angular interfaces while keeping data access and business validation centralized in the Express API.

**Q2. How do both interfaces share attendance data?**  
Both send HTTP requests to the same API. The API reads and writes the same MongoDB collection; the clients poll for updates.

**Q3. Why is the compound unique index needed if bulk writes use upserts?**  
Upserts handle normal repeat submissions, while the unique index enforces the invariant in the database and protects against concurrent duplicate inserts.

**Q4. How is student attendance percentage computed?**  
Present and late records count as attended; the total number of recorded student sessions is the denominator. The percentage is `(present + late) / total * 100`.

**Q5. What does Mongoose provide?**  
Mongoose maps JavaScript objects to MongoDB documents and supplies schema validation, references, model operations, and index definitions.

**Q6. What is CORS and why is it configured?**  
Cross-Origin Resource Sharing is a browser policy controlling cross-origin requests. The API explicitly allows the local React and Angular development origins.

**Q7. Why does the teacher portal protect dirty rows during polling?**  
An automatic refresh should not replace a teacher's unsaved local edits with older values from the server. Dirty rows remain local until saved or the selected register changes.

**Q8. What is the purpose of the API's input validation?**  
Validation rejects malformed identifiers, invalid calendar dates, missing required fields, and unsupported statuses before attempting database writes.
